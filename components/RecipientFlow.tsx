"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { SAMPLE_ENVELOPES, type DraftJar, type Envelope } from "@/lib/jar";
import { ArrowLeft, ChevronRight, Copy, Heart, Lock, Menu, Pause, Play, Share } from "./icons";
import { Button, Field } from "./ui";

type RecipientScreen = "shared" | "invite" | "verify" | "reveal" | "jar" | "reader";
type Filter = "all" | "available" | "favourites";

type RecipientFlowProps = {
  initialScreen: "shared" | "invite" | "sample";
  draft?: DraftJar;
  onExit: () => void;
  onToast: (message: string) => void;
};

function envelopeColor(index: number) {
  return ["petal", "gold", "sky"][index % 3];
}

export function RecipientFlow({ initialScreen, draft, onExit, onToast }: RecipientFlowProps) {
  const [screen, setScreen] = useState<RecipientScreen>(initialScreen === "sample" ? "reader" : initialScreen);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<Envelope | null>(initialScreen === "sample" ? SAMPLE_ENVELOPES[0] : null);
  const [favourites, setFavourites] = useState<Set<string>>(() => new Set());
  const [opened, setOpened] = useState<Set<string>>(() => new Set(["sample-miss"]));
  const [playing, setPlaying] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const lastEnvelopeRef = useRef<HTMLButtonElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const recipientName = draft?.recipientName || "Anu";
  const creatorName = draft?.creatorName || "Felix";
  const envelopes = useMemo<Envelope[]>(() => draft?.envelopes.length ? draft.envelopes.map((envelope, index) => ({ ...envelope, color: envelope.color || envelopeColor(index) as Envelope["color"] })) : SAMPLE_ENVELOPES, [draft]);
  const visibleEnvelopes = envelopes.filter((envelope) => {
    if (filter === "available") return !envelope.locked;
    if (filter === "favourites") return favourites.has(envelope.id);
    return true;
  });

  const openEnvelope = (envelope: Envelope, button: HTMLButtonElement) => {
    if (envelope.locked) return;
    lastEnvelopeRef.current = button;
    setSelected(envelope);
    setOpened((current) => new Set(current).add(envelope.id));
    setScreen("reader");
    requestAnimationFrame(() => document.getElementById("letter-heading")?.focus());
  };

  const closeReader = () => {
    audioRef.current?.pause();
    setPlaying(false);
    setScreen("jar");
    requestAnimationFrame(() => lastEnvelopeRef.current?.focus());
  };

  if (screen === "shared") {
    const share = async () => {
      const shareData = { title: "A little jar is waiting", text: "I made a little jar for you.", url: window.location.href };
      if (navigator.share) await navigator.share(shareData).catch(() => undefined);
      else {
        await navigator.clipboard.writeText(window.location.href);
        onToast("Gift link copied");
      }
    };
    return (
      <main className="creator-shell creator-shell--centered">
        <header className="flow-header"><button onClick={onExit} type="button" aria-label="Back to home"><ArrowLeft /></button><span>Ready to share</span><span /></header>
        <section className="share-success">
          <span className="success-check"><span><CheckMark /></span></span>
          <h1>Your jar is sealed.</h1>
          <p>It’s ready whenever you decide the moment is right.</p>
          <Image alt="Your sealed Open When Jar" src="/jar-illustration.png" width={360} height={360} />
          <div className="gift-link"><span>openwhen.jar/gift/a-little-surprise</span><button type="button" onClick={() => { navigator.clipboard.writeText(window.location.href); onToast("Gift link copied"); }} aria-label="Copy gift link"><Copy /></button></div>
          <Button onClick={share}><Share /> Share gift</Button>
          <Button variant="secondary" onClick={() => setScreen("invite")}>Preview recipient journey</Button>
          <p className="share-note">No invitation email has been sent. Sharing stays in your hands.</p>
        </section>
      </main>
    );
  }

  if (screen === "invite") {
    return (
      <main className="invitation-shell">
        <button className="corner-back" type="button" onClick={onExit}><ArrowLeft /> Home</button>
        <section className="invitation-card">
          <Image alt="A closed illustrated jar of envelopes" src="/jar-illustration.png" width={390} height={390} priority />
          <h1>A jar is waiting for you</h1>
          <p>A private gift is ready. Verify your email to see who it’s from.</p>
          <Button onClick={() => setScreen("verify")}>Open my gift</Button>
          <small>We won’t reveal names, notes, or envelope titles before verification.</small>
        </section>
      </main>
    );
  }

  if (screen === "verify") {
    return (
      <main className="creator-shell creator-shell--centered">
        <header className="flow-header"><button onClick={() => { setEmail(""); setCode(""); setCodeSent(false); setScreen("invite"); }} type="button" aria-label="Back"><ArrowLeft /></button><span>Verify your email</span><span /></header>
        <section className="verify-panel">
          <span className="mail-mark" aria-hidden="true">✉</span>
          <h1>{codeSent ? "Check your email" : "Open your private gift"}</h1>
          <p>{codeSent ? "Enter the code sent to the email you provided." : "Only the intended recipient can claim this jar."}</p>
          {!codeSent ? <Field label="Email address"><input type="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" /></Field> : <><Field label="6-digit code" hint="For this prototype, use 246810."><input className="code-input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} placeholder="000000" /></Field>{verifyError ? <p className="field-error" role="alert">{verifyError}</p> : null}</>}
          <Button disabled={!/^\S+@\S+\.\S+$/.test(email) || (codeSent && code.length !== 6)} onClick={() => {
            if (!codeSent) { setCodeSent(true); return; }
            if (code !== "246810") { setVerifyError("That code didn’t work. Try 246810 for this prototype."); return; }
            setScreen("reveal");
          }}>{codeSent ? "Verify and open" : "Send me a code"}</Button>
          {codeSent ? <button className="text-button centered" type="button" onClick={() => { setEmail(""); setCode(""); setCodeSent(false); setVerifyError(""); }}>Use another email</button> : null}
        </section>
      </main>
    );
  }

  if (screen === "reveal") {
    return (
      <main className={`reveal theme-${draft?.theme || "petal"}`}>
        <section>
          <p className="reveal__intro">A little something, made just for you.</p>
          <h1>{creatorName} made this for you.</h1>
          <div className="reveal__jar"><Image alt="Your glowing Open When Jar" src="/jar-illustration.png" width={520} height={520} priority /></div>
          <blockquote>“{draft?.coverNote || "A few little reminders that I’m always with you."}”</blockquote>
          <Button onClick={() => setScreen("jar")}>Explore your envelopes <ChevronRight /></Button>
        </section>
      </main>
    );
  }

  if (screen === "reader" && selected) {
    const favourite = favourites.has(selected.id);
    return (
      <main className="reader-shell">
        <header className="reader-header"><button type="button" onClick={closeReader}><ArrowLeft /> Back to jar</button><button type="button" aria-label={favourite ? "Remove from favourites" : "Add to favourites"} onClick={() => setFavourites((current) => { const next = new Set(current); if (next.has(selected.id)) next.delete(selected.id); else next.add(selected.id); return next; })}><Heart filled={favourite} /></button></header>
        <article className="opened-letter">
          <div className="opened-letter__paper">
            <h1 id="letter-heading" tabIndex={-1}>{selected.label}</h1>
            <span className="letter-divider" aria-hidden="true">— ♡ —</span>
            <p>{selected.message}</p>
            {selected.photoUrl ? <Image src={selected.photoUrl} alt={selected.photoName ? `Photo: ${selected.photoName}` : "A photo attached to this letter"} width={600} height={400} unoptimized /> : null}
          </div>
          <span className="opened-letter__seal">♡</span>
        </article>
        {selected.audioUrl ? <audio className="sr-only" ref={audioRef} src={selected.audioUrl} onEnded={() => setPlaying(false)} /> : null}
        {selected.audioUrl || selected.id === "sample-miss" ? <div className="voice-player"><button type="button" onClick={() => {
          if (selected.audioUrl && audioRef.current) {
            if (playing) audioRef.current.pause(); else void audioRef.current.play();
          }
          setPlaying((current) => !current);
        }} aria-label={playing ? "Pause voice message" : "Play voice message"}>{playing ? <Pause /> : <Play />}</button><span className={playing ? "wave is-playing" : "wave"} /><time>{playing ? "0:07" : "0:00"} / {selected.audioDuration ? `0:${String(selected.audioDuration).padStart(2, "0")}` : "0:18"}</time></div> : null}
        <Button variant="secondary" className="back-to-jar" onClick={closeReader}><ArrowLeft /> Back to jar</Button>
      </main>
    );
  }

  return (
    <main className={`recipient-shell theme-${draft?.theme || "petal"}`}>
      <header className="recipient-header"><button type="button" onClick={onExit}>My jars</button><button type="button" aria-label="Open menu" onClick={() => onToast("Library settings are part of the working-product milestone.")}><Menu /></button></header>
      <section className="recipient-jar">
        <h1>{recipientName}, this is for you.</h1><p>From {creatorName}</p>
        <Image alt="Your Open When Jar" src="/jar-illustration.png" width={440} height={440} priority />
      </section>
      <nav className="jar-filters" aria-label="Envelope filters">{(["all", "available", "favourites"] as Filter[]).map((item) => <button className={filter === item ? "is-selected" : ""} key={item} onClick={() => setFilter(item)} type="button">{item === "all" ? "All" : item === "available" ? "Available now" : "Favourites"}</button>)}</nav>
      <section className="envelope-list" aria-live="polite">
        {visibleEnvelopes.length ? visibleEnvelopes.map((envelope, index) => {
          const isFavourite = favourites.has(envelope.id);
          const isOpened = opened.has(envelope.id);
          return (
            <button key={envelope.id} ref={index === 0 ? lastEnvelopeRef : undefined} className={`envelope-row ${envelope.locked ? "is-locked" : ""}`} type="button" onClick={(event) => openEnvelope(envelope, event.currentTarget)} disabled={envelope.locked}>
              <span className={`envelope-thumb envelope-thumb--${envelope.color || envelopeColor(index)}`}>{envelope.locked ? <Lock size={18} /> : null}</span>
              <span><strong>{envelope.label}</strong><small>{envelope.locked ? `Opens ${envelope.unlockDate}` : isOpened ? "Opened · read again" : "Ready to open"}</small></span>
              {isFavourite ? <Heart filled size={19} /> : <ChevronRight />}
            </button>
          );
        }) : <div className="empty-filter"><Heart /><h2>No favourites yet</h2><p>Tap the heart on a letter to keep it close.</p></div>}
      </section>
      <button className="keep-handy" type="button" onClick={() => onToast("Use your browser menu to add this jar to your home screen.")}><span>Keep this jar handy</span><small>Add it to your home screen or bookmarks.</small><ChevronRight /></button>
    </main>
  );
}

function CheckMark() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m5 12 4.5 4.5L19 7" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>;
}
