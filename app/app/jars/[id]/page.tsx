import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { sealJarAction } from "../../actions";
import { toggleFavouriteAction } from "./actions";
import { createClient } from "@/lib/supabase/server";
import { KeepsakeDownload, type KeepsakeLetter } from "@/components/KeepsakeDownload";

export const dynamic = "force-dynamic";
export const metadata = { title: "Open jar — Open When Jar", robots: { index: false, follow: false } };

type AttachmentItem = {
  id: string;
  envelope_id: string;
  kind: "image" | "audio";
  mime_type: string;
  byte_size: number;
};

export default async function JarPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth");

  const { data: jar, error } = await supabase.from("jars").select("id, creator_id, plan_code, cover_note, theme, status, hosting_ends_at, creator:profiles!jars_creator_id_fkey(username, display_name), jar_recipients(position, recipient_id, recipient:profiles!jar_recipients_recipient_id_fkey(username, display_name))").eq("id", id).single();
  if (error || !jar) notFound();
  const isCreator = jar.creator_id === userId;
  const isRecipient = jar.jar_recipients.some((membership) => membership.recipient_id === userId);
  const hostingEnded = jar.status === "hosting_ended" || jar.status === "deleted" || (jar.hosting_ends_at !== null && new Date(jar.hosting_ends_at).getTime() <= Date.now());
  if (hostingEnded) return <main className="library-jar"><header className="library-jar__header"><Link className="library-jar__back" href={isCreator ? "/app?view=send" : "/app?view=received"}>← Back to your Jars</Link><div aria-label="Open When Jar" className="library-jar__brand"><i aria-hidden="true">♡</i><span>Open When Jar</span></div></header><section className="library-jar__intro"><div className="library-jar__intro-copy"><p className="library-jar__kicker">{jar.status === "deleted" ? "Jar unavailable" : "Hosting ended"}</p><h1>{jar.status === "deleted" ? "This Jar is no longer available." : "This Jar has reached its three-year end."}</h1><p>Its letters and media are no longer available. A keepsake saved before expiry remains yours to keep.</p></div></section></main>;

  const { data: headers } = await supabase.from("envelope_headers").select("id, position, label, unlock_at, unlock_timezone").eq("jar_id", id).order("position");
  const envelopeIds = (headers ?? []).map((header) => header.id);
  const [{ data: contents }, { data: states }, { data: attachments }] = await Promise.all([
    envelopeIds.length ? supabase.from("envelope_contents").select("envelope_id, text_body, transcript").in("envelope_id", envelopeIds) : Promise.resolve({ data: [] }),
    jar.jar_recipients.some((membership) => membership.recipient_id === userId) && envelopeIds.length ? supabase.from("recipient_envelope_state").select("envelope_id, favourite, opened_at").eq("recipient_id", userId).in("envelope_id", envelopeIds) : Promise.resolve({ data: [] }),
    envelopeIds.length ? supabase.from("attachments").select("id, envelope_id, kind, mime_type, byte_size").in("envelope_id", envelopeIds) : Promise.resolve({ data: [] }),
  ]);
  // Marks readable letters as seen; the first insert emails the creator that the jar was opened.
  if (isRecipient && contents?.length) await supabase.from("recipient_envelope_state").upsert(contents.map((content) => ({ recipient_id: userId, envelope_id: content.envelope_id, opened_at: new Date().toISOString() })), { onConflict: "recipient_id,envelope_id", ignoreDuplicates: true });
  const contentByEnvelope = new Map((contents ?? []).map((content) => [content.envelope_id, content]));
  const stateByEnvelope = new Map((states ?? []).map((state) => [state.envelope_id, state]));
  const attachmentsByEnvelope = new Map<string, AttachmentItem[]>();
  for (const attachment of attachments ?? []) {
    const existing = attachmentsByEnvelope.get(attachment.envelope_id) ?? [];
    existing.push(attachment);
    attachmentsByEnvelope.set(attachment.envelope_id, existing);
  }
  const recipients = jar.jar_recipients.toSorted((a, b) => a.position - b.position).map((membership) => membership.recipient).filter((person): person is { username: string; display_name: string } => Boolean(person));
  const firstRecipient = recipients[0];
  const creator = jar.creator;
  const recipientSummary = `@${firstRecipient?.username}${recipients.length > 1 ? ` +${recipients.length - 1}` : ""}`;
  const keepsakeLetters: KeepsakeLetter[] = (headers ?? []).flatMap((header) => {
    const content = contentByEnvelope.get(header.id);
    if (!content) return [];
    return [{ label: header.label, text: content.text_body, transcript: content.transcript, attachments: (attachmentsByEnvelope.get(header.id) ?? []).map(({ id, kind }) => ({ id, kind })) }];
  });

  return (
    <main className={`library-jar theme-${jar.theme}`}>
      <header className="library-jar__header">
        <Link className="library-jar__back" href={isCreator ? "/app?view=send" : "/app?view=received"}><span aria-hidden="true">←</span> {isCreator ? "Back to Send" : "Back to Received"}</Link>
        <div aria-label="Open When Jar" className="library-jar__brand"><i aria-hidden="true">♡</i><span>Open When Jar</span></div>
        <span className="library-jar__context">{isCreator ? `For ${recipientSummary}` : `From @${creator?.username}`}</span>
      </header>
      <section className="library-jar__intro">
        <div className="library-jar__intro-copy"><p className="library-jar__kicker">{isCreator ? "The gift they’ll see" : "A jar for you"}</p><h1>{isCreator ? <>For {firstRecipient?.display_name}<br /><em>with a little love.</em></> : <>{creator?.display_name} made<br /><em>this for you.</em></>}</h1><blockquote>“{jar.cover_note || "A few little reminders that I’m always with you."}”</blockquote><span className="library-jar__hint">Choose an envelope below. Photos and voice notes stay private inside each letter.</span></div>
        <div className="library-jar__art"><Image alt="Illustrated jar filled with glowing envelopes" src="/jar-illustration.png" width={520} height={520} priority /><span aria-hidden="true">A little jar of<br />brighter days ♡</span></div>
      </section>
      {query.error ? <p className="field-error" role="alert">{query.error === "state" ? "We couldn’t save that change. Please try again." : query.error}</p> : null}
      {isRecipient && jar.status === "sealed" && jar.hosting_ends_at ? <section aria-label="Keep this Jar" className="library-jar__draft-actions"><div><strong>Keep these memories</strong><span>Hosting ends {new Date(jar.hosting_ends_at).toLocaleDateString("en-US", { dateStyle: "long", timeZone: "UTC" })}.</span></div>{keepsakeLetters.length ? <KeepsakeDownload jarId={jar.id} sender={creator?.display_name ?? "Someone special"} coverNote={jar.cover_note} endsAt={jar.hosting_ends_at} letters={keepsakeLetters} /> : <p>No letters are available to save yet.</p>}</section> : null}
      {isCreator && jar.status === "draft" ? <section aria-label="Draft actions" className="library-jar__draft-actions"><div><strong>Draft preview</strong><span>Only you can see this Jar until you seal it.</span></div><form action={sealJarAction}><input name="jarId" type="hidden" value={jar.id} /><button className="button button--primary" type="submit">Seal Jar</button></form></section> : null}
      <section className="library-letters" aria-labelledby="letters-heading">
        <div className="library-letters__heading"><div><p className="library-letters__eyebrow">Inside this jar</p><h2 id="letters-heading">Choose a letter</h2><p>Open one whenever the moment feels right.</p></div><span>{headers?.length ?? 0} inside</span></div>
        {(headers ?? []).map((header) => {
          const content = contentByEnvelope.get(header.id);
          const state = stateByEnvelope.get(header.id);
          const envelopeAttachments = attachmentsByEnvelope.get(header.id) ?? [];
          const locked = !content;
          return (
            <article className={`library-letter ${locked ? "is-locked" : ""}`} key={header.id}>
              <div className="envelope-thumb library-letter__envelope"><span>{locked ? "⌁" : "♡"}</span></div>
              <div className="library-letter__body">
                <h3>{header.label}</h3>
                {locked ? <p>Opens {header.unlock_at ? new Date(header.unlock_at).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short", timeZone: header.unlock_timezone }) : "later"} · your words stay private until then</p> : <details open={isCreator && header.position === 1}><summary>{state?.opened_at ? "Read again" : "Open letter"}</summary><div className={`library-letter__paper ${envelopeAttachments.length ? "has-media" : "is-text-only"}`}><div className="library-letter__text"><span aria-hidden="true">— ♡ —</span><p>{content.text_body}</p></div>{envelopeAttachments.length ? <div className="library-letter__media">{envelopeAttachments.map((attachment) => attachment.kind === "image" ? <figure key={attachment.id}><img alt="A memory attached to this letter" loading="lazy" src={`/api/media/${attachment.id}`} /><figcaption>A memory, kept with this letter.</figcaption></figure> : <div className="library-letter__audio" key={attachment.id}><span>Hear their voice</span><audio aria-label="Voice note attached to this letter" controls preload="metadata" src={`/api/media/${attachment.id}`} /></div>)}</div> : null}{content.transcript ? <div className="letter-transcript"><strong>Voice transcript</strong><p>{content.transcript}</p></div> : null}</div></details>}
              </div>
              {isRecipient && !locked ? <form action={toggleFavouriteAction}><input name="jarId" type="hidden" value={jar.id} /><input name="envelopeId" type="hidden" value={header.id} /><input name="nextFavourite" type="hidden" value={state?.favourite ? "false" : "true"} /><button aria-label={state?.favourite ? "Remove from favourites" : "Add to favourites"} className={state?.favourite ? "favourite-button is-selected" : "favourite-button"} type="submit">♥</button></form> : null}
            </article>
          );
        })}
      </section>
    </main>
  );
}
