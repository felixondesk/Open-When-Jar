import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { deleteDraftAction } from "./actions";
import { signOutAction } from "@/app/auth/actions";
import { CirclePanel, type CircleConnectionView } from "@/components/CirclePanel";
import { AccountSeatInvites } from "@/components/AccountSeatInvites";
import { CheckoutReturnToast } from "@/components/CheckoutReturnToast";
import { ExtraJarPurchaseForm } from "@/components/ExtraJarPurchaseForm";
import { NewJarForm } from "@/components/NewJarForm";
import { NotificationCenter } from "@/components/NotificationCenter";
import { UpdatePasswordForm } from "@/components/PasswordForms";
import { ReceivedNavLink } from "@/components/ReceivedNavLink";
import { NavigationLink } from "@/components/NavigationLink";
import { LogOut } from "@/components/icons";
import { Brand } from "@/components/ui";
import { getPlanStatusOrClaimInvitation } from "@/lib/plan-status";
import { getJarPlan } from "@/lib/plans";
import { getSeatInvitationEmailConfig } from "@/lib/seat-invitation-email";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "My jars — Open When Jar", robots: { index: false, follow: false } };

type WorkspaceView = "send" | "received" | "circle" | "account";

type JarListItem = {
  id: string;
  status: "draft" | "sealed" | "hosting_ended" | "deleted";
  theme: string;
  plan_code: string;
  amount_cents: number;
  recipient_limit: number;
  created_at: string;
  hosting_ends_at: string | null;
  jar_recipients?: { position: number; recipient: { username: string; display_name: string } | null }[];
  creator?: { username: string; display_name: string } | null;
  envelope_headers?: { id: string; label: string; unlock_at: string | null; position: number }[];
};

type CircleRow = {
  id: string;
  requester_id: string;
  addressee_id: string;
  requester_username_snapshot: string;
  requester_display_name_snapshot: string;
  addressee_username_snapshot: string;
  addressee_display_name_snapshot: string;
  status: "pending" | "accepted" | "declined";
};

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ created?: string; sealed?: string; checkout?: string; error?: string; view?: string; sender?: string; circle?: string; circleError?: string; invite?: string; inviteError?: string }> }) {
  const params = await searchParams;
  const view: WorkspaceView = params.view === "received" || params.view === "circle" || params.view === "account" ? params.view : "send";
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth");

  const [profileResult, initialPlan] = await Promise.all([
    supabase.from("profiles").select("username, display_name, username_finalized").eq("id", userId).single(),
    supabase.rpc("get_plan_status"),
  ]);

  if (profileResult.error) redirect("/auth?error=profile");
  if (!profileResult.data.username_finalized) redirect("/auth/username");

  const plan = await getPlanStatusOrClaimInvitation(
    () => supabase.rpc("get_plan_status"),
    () => supabase.rpc("claim_plan_invitation"),
    initialPlan,
  );
  if (!plan) redirect(params.checkout === "returned" ? "/app/unlock?checkout=returned" : "/app/unlock");

  const [{ data: sentData, error: sentError }, { data: receivedData, error: receivedError }, { data: circleData, error: circleError }, accountAuth] = await Promise.all([
    view === "send" ? supabase.from("jars").select("id, status, theme, plan_code, amount_cents, recipient_limit, created_at, hosting_ends_at, jar_recipients(position, recipient:profiles!jar_recipients_recipient_id_fkey(username, display_name)), envelope_headers(id, label, unlock_at, position)").eq("creator_id", userId).order("created_at", { ascending: false }) : { data: [], error: null },
    supabase.from("jar_recipients").select(view === "received" ? "jar:jars!inner(id, status, theme, plan_code, amount_cents, recipient_limit, created_at, hosting_ends_at, creator:profiles!jars_creator_id_fkey(username, display_name), envelope_headers(id, label, unlock_at, position))" : "jar:jars!inner(id)").eq("recipient_id", userId).in("jar.status", ["sealed", "hosting_ended"]).order("created_at", { referencedTable: "jars", ascending: false }),
    view === "send" || view === "circle" ? supabase.from("circle_connections").select("id, requester_id, addressee_id, requester_username_snapshot, requester_display_name_snapshot, addressee_username_snapshot, addressee_display_name_snapshot, status").or(`requester_id.eq.${userId},addressee_id.eq.${userId}`).order("created_at", { ascending: false }) : { data: [], error: null },
    view === "account" ? supabase.auth.getUser() : null,
  ]);

  const jarsRemaining = Math.max(0, plan.jarLimit - plan.jarsUsed);
  const unusedSeats = Math.max(0, plan.seatLimit - plan.members.length - plan.invitations.length);
  const sent = (sentData ?? []) as JarListItem[];
  const received = (receivedData ?? []).flatMap((membership) => membership.jar ? [membership.jar as JarListItem] : []);
  const receivedBySender = new Map<string, { person: NonNullable<JarListItem["creator"]>; jars: JarListItem[] }>();
  for (const jar of received) {
    if (!jar.creator) continue;
    const group = receivedBySender.get(jar.creator.username);
    if (group) group.jars.push(jar);
    else receivedBySender.set(jar.creator.username, { person: jar.creator, jars: [jar] });
  }
  const selectedSender = params.sender ? receivedBySender.get(params.sender) : undefined;
  const circleConnections = ((circleData ?? []) as CircleRow[]).map((connection): CircleConnectionView => {
    const incoming = connection.addressee_id === userId;
    return {
      id: connection.id,
      direction: incoming ? "incoming" : "outgoing",
      status: connection.status,
      person: incoming
        ? { displayName: connection.requester_display_name_snapshot, username: connection.requester_username_snapshot }
        : { displayName: connection.addressee_display_name_snapshot, username: connection.addressee_username_snapshot },
    };
  });
  const acceptedCircle = circleConnections.filter((connection) => connection.status === "accepted").map((connection) => connection.person);
  const hasEmailPassword = accountAuth?.data.user?.identities?.some((identity) => identity.provider === "email") ?? false;

  return (
    <main className="workspace-shell">
      <header className="workspace-header">
        <Brand />
        <nav aria-label="Jar workspace">
          <NavigationLink aria-current={view === "send" ? "page" : undefined} className={view === "send" ? "is-active" : ""} href="/app?view=send">Send</NavigationLink>
          <ReceivedNavLink active={view === "received"} jarIds={received.map((jar) => jar.id)} userId={userId} />
          <NavigationLink aria-current={view === "circle" ? "page" : undefined} className={view === "circle" ? "is-active" : ""} href="/app?view=circle">My Circle</NavigationLink>
          <NavigationLink aria-current={view === "account" ? "page" : undefined} className={view === "account" ? "is-active" : ""} href="/app?view=account">Account</NavigationLink>
        </nav>
        <div className="workspace-header__account">
          <NotificationCenter />
          <span><strong>{profileResult.data.display_name}</strong></span>
          <form action={signOutAction}>
            <button aria-label="Sign out" title="Sign out" type="submit"><LogOut size={18} /></button>
          </form>
        </div>
      </header>

      <CheckoutReturnToast show={params.checkout === "returned"} />
      {params.created ? <p className="dashboard-notice dashboard-notice--success">Draft saved. Open its preview to review the full Jar and seal it when you’re ready.</p> : null}
      {params.sealed ? <p className="dashboard-notice dashboard-notice--success">Your jar is sealed and now appears on their shelf.</p> : null}
      {params.checkout === "cancelled" ? <p className="dashboard-notice">Checkout was cancelled. No test purchase was completed.</p> : null}
      {plan.isOwner && unusedSeats > 0 && view !== "circle" && view !== "account" ? <aside aria-label="Unused plan seats" className="dashboard-notice dashboard-notice--actionable"><span>You have {unusedSeats} unused {unusedSeats === 1 ? "seat" : "seats"}.</span><Link href="/app?view=account">Invite your {unusedSeats === 1 ? "member" : "members"} from Account.</Link></aside> : null}
      {params.error ? <p className="dashboard-notice field-error">{params.error}</p> : null}

      {view === "send" ? (
        <div className="workspace-view workspace-view--send">
          {circleError ? <p className="dashboard-notice field-error" role="alert">We couldn’t load your Circle. Please refresh and try again.</p> : !jarsRemaining ? <div className="shelf-empty"><span aria-hidden="true">❦</span><p>You’ve used all your available Jars.</p><p><Link href="/app?view=account">Buy an extra Jar from your account</Link></p></div> : <NewJarForm circleMembers={acceptedCircle} creatorUsername={profileResult.data.username} />}
          <div className="workspace-history">
            <div><h2>Sent by you</h2><p>Your drafts and sealed jars, kept together. Open a draft preview to seal it.</p></div>
            <span>{jarsRemaining} of {plan.jarLimit} Jars left</span>
          </div>
          {sentError ? <p className="dashboard-notice field-error" role="alert">We couldn’t load your sent Jars. Please refresh and try again.</p> : sent.length ? <JarShelf title="" empty="No Jars sent yet." jars={sent} role="sent" /> : <p className="workspace-history__empty">No Jars sent yet. Your drafts and sealed Jars will appear here.</p>}
        </div>
      ) : null}

      {view === "received" ? (
        <section className="workspace-view workspace-view--received">
          <header><div><h1>Letters made<br />to find you.</h1><p>Open one when the moment feels right.</p></div><Image alt="Illustrated jar filled with glowing envelopes" height={260} src="/jar-illustration.png" width={260} /></header>
          {receivedError ? <p className="dashboard-notice field-error" role="alert">We couldn’t load your received Jars. Please refresh and try again.</p> : receivedBySender.size ? (
            <div className="received-layout">
              <section className="received-layout__senders" aria-label="People who sent you Jars">
                <div className="shelf-heading"><h2>Senders</h2><span className="shelf-count">{receivedBySender.size}</span></div>
                <div className="shelf-list">{[...receivedBySender.values()].map(({ person, jars }) => <Link aria-current={params.sender === person.username ? "page" : undefined} className={`received-sender${params.sender === person.username ? " is-active" : ""}`} href={`/app?view=received&sender=${encodeURIComponent(person.username)}`} key={person.username}><span className="circle-avatar" aria-hidden="true">{person.display_name.slice(0, 2).toUpperCase()}</span><span><strong>{person.display_name}</strong><small>@{person.username} · {jars.length} {jars.length === 1 ? "Jar" : "Jars"}</small></span><span aria-hidden="true">→</span></Link>)}</div>
              </section>
              <div className="received-layout__jars">
                {selectedSender ? <JarShelf title={`From @${selectedSender.person.username}`} empty="No Jars from this person." jars={selectedSender.jars} role="received" /> : <div className="shelf-empty"><span aria-hidden="true">❦</span><p>{params.sender ? "This sender isn’t in your received Jars." : "Choose a sender to see their Jars."}</p></div>}
              </div>
            </div>
          ) : <div className="shelf-empty"><span aria-hidden="true">❦</span><p>Jars from people in your Circle will appear here.</p></div>}
        </section>
      ) : null}

      {view === "circle" ? (
        <CirclePanel
          connections={circleConnections}
          currentUsername={profileResult.data.username}
          plan={plan}
          error={params.circleError ?? (circleError ? "We couldn’t load your Circle. Please refresh and try again." : undefined)}
          inviteError={params.inviteError}
          inviteNotice={params.invite === "sent" ? "Invitation emailed. Their seat is reserved until they join." : params.invite === "resent" ? "Invitation emailed again." : params.invite === "cancelled" ? "Invitation cancelled." : undefined}
          emailReady={Boolean(getSeatInvitationEmailConfig())}
          notice={params.circle === "sent" ? "Request sent. They’ll appear here after accepting." : params.circle === "accepted" ? "Circle request accepted." : params.circle === "declined" ? "Request declined." : undefined}
        />
      ) : null}

      {view === "account" ? (
        <section aria-labelledby="account-heading" className="account-workspace workspace-view">
          <header className="account-workspace__heading"><span aria-hidden="true">❦</span><h1 id="account-heading">Your account</h1><p>Your details and the space you have for more memories.</p></header>
          <div className="account-workspace__grid">
            <section className="account-card" aria-labelledby="account-profile-heading">
              <h2 id="account-profile-heading">Profile</h2>
              <dl className="account-details"><div><dt>Name</dt><dd>{profileResult.data.display_name}</dd></div><div><dt>Username</dt><dd>@{profileResult.data.username}</dd></div></dl>
              <form action={signOutAction}><button className="button button--secondary" type="submit">Sign out</button></form>
            </section>
            <section className="account-card" aria-labelledby="account-plan-heading">
              <h2 id="account-plan-heading">Your plan</h2>
              <p className="account-card__feature">{getJarPlan(plan.planCode).name}</p>
              <p>One-time access · {plan.isOwner ? "Plan owner" : "Plan member"}</p>
              <p>{plan.seatLimit} {plan.seatLimit === 1 ? "account seat" : "account seats"} in this plan. No recurring subscription.</p>
              {plan.isOwner && plan.seatLimit > 1 ? <AccountSeatInvites unusedSeats={unusedSeats} emailReady={Boolean(getSeatInvitationEmailConfig())} notice={params.invite === "sent" ? "Invitation emailed. Their seat is reserved until they join." : undefined} error={params.inviteError} /> : null}
            </section>
            {accountAuth?.error ? <section className="account-card" aria-labelledby="account-password-heading">
              <h2 id="account-password-heading">Update password</h2>
              <p className="field-error" role="alert">We couldn’t load your sign-in settings. Refresh and try again.</p>
            </section> : null}
            {!accountAuth?.error && hasEmailPassword ? <section className="account-card" aria-labelledby="account-password-heading">
              <h2 id="account-password-heading">Update password</h2>
              <p>Change the password you use to sign in with email.</p>
              <UpdatePasswordForm />
            </section> : null}
            <section className="account-card" aria-labelledby="account-jars-heading">
              <h2 id="account-jars-heading">Your Jars</h2>
              <p className="account-card__feature">{jarsRemaining} <small>remaining</small></p>
              <p>{plan.jarsUsed} used of {plan.jarLimit} available to your account.</p>
              <ExtraJarPurchaseForm />
            </section>
            <section className="account-card account-card--danger" aria-labelledby="account-delete-heading">
              <h2 id="account-delete-heading">Delete account</h2>
              <p>Request account deletion for manual review. This does not immediately remove Jars you sent or received.</p>
              <Link className="button button--secondary" href="/app/requests">Manage account requests</Link>
              <p className="account-card__note">You can also request help, a refund review, access, correction, or export. See our <Link href="/privacy">privacy notice</Link>.</p>
            </section>
          </div>
        </section>
      ) : null}
    </main>
  );
}

function JarShelf({ title, empty, jars, role }: { title: string; empty: string; jars: JarListItem[]; role: "sent" | "received" }) {
  return (
    <section className="shelf-section">
      {title ? <div className="shelf-heading"><h2>{title}</h2><span className="shelf-count">{jars.length}</span></div> : null}
      {jars.length ? <div className="shelf-list">{jars.map((jar) => {
        const recipients = jar.jar_recipients?.toSorted((a, b) => a.position - b.position).map((membership) => membership.recipient).filter((person): person is { username: string; display_name: string } => Boolean(person)) ?? [];
        const person = role === "sent" ? recipients[0] : jar.creator;
        const firstEnvelope = jar.envelope_headers?.toSorted((a, b) => a.position - b.position)[0];
        const envelopeCount = jar.envelope_headers?.length ?? 0;
        const status = jar.status === "draft" ? "draft" : jar.status === "sealed" ? (role === "sent" ? "sent" : "received") : "ended";
        const statusLabel = jar.status === "draft" ? "Draft" : jar.status === "sealed" ? (role === "sent" ? "Sent" : "Received") : "Hosting ended";
        return (
          <article className={`shelf-jar theme-${jar.theme}`} key={jar.id}>
            <div className="shelf-jar__art"><Image alt="Illustrated Open When Jar" height={112} src="/jar-illustration.png" width={112} /></div>
            <div className="shelf-jar__copy"><span className={`jar-status jar-status--${status}`}>{statusLabel}</span><h3>{role === "sent" ? `For @${person?.username}${recipients.length > 1 ? ` +${recipients.length - 1}` : ""}` : `From @${person?.username}`}</h3><p>{firstEnvelope?.label ?? "A personal jar"}</p><div className="shelf-jar__meta"><span>{envelopeCount} {envelopeCount === 1 ? "envelope" : "envelopes"}</span></div></div>
            <div className="shelf-jar__actions">
              <Link className="shelf-jar__open" href={`/app/jars/${jar.id}`}>{jar.status === "draft" ? "Preview" : "Open jar"}</Link>
              {role === "sent" && jar.status === "draft" ? <form action={deleteDraftAction}><input name="jarId" type="hidden" value={jar.id} /><button className="delete-link" type="submit">Delete draft</button></form> : null}
            </div>
          </article>
        );
      })}</div> : <div className="shelf-empty"><span aria-hidden="true">❦</span><p>{empty}</p></div>}
    </section>
  );
}
