"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { PROMPTS, SAMPLE_ENVELOPES, type Theme } from "@/lib/jar";

const CUSTOM_MOMENT = "__custom__";

const DEMO_THEMES: { code: Theme; name: string; note: string }[] = [
  { code: "petal", name: "Petal", note: "Soft blush and warm ink" },
  { code: "blue", name: "Blue Hour", note: "Quiet skies at dusk" },
  { code: "garden", name: "Little Garden", note: "Morning greens and light" },
];

type DemoEnvelope = {
  id: string;
  label: string;
  message: string;
  color: "petal" | "gold" | "sky";
  locked?: boolean;
  unlockHint?: string;
};

type DemoStage = "choose" | "compose" | "sent" | "receive";

export function JarDemo({ displayName, username }: { displayName: string; username: string }) {
  const [stage, setStage] = useState<DemoStage>("choose");
  const [cameFromCompose, setCameFromCompose] = useState(false);
  const [momentChoice, setMomentChoice] = useState<string>(PROMPTS[0]);
  const [customMoment, setCustomMoment] = useState("");
  const [message, setMessage] = useState("");
  const [coverNote, setCoverNote] = useState("A few little reminders that I’m always with you.");
  const [theme, setTheme] = useState<Theme>("petal");
  const [favourites, setFavourites] = useState<Record<string, boolean>>({});
  const [openedEnvelopeId, setOpenedEnvelopeId] = useState<string | null>(null);
  const label = momentChoice === CUSTOM_MOMENT ? customMoment.trim() : momentChoice;

  const envelopes: DemoEnvelope[] = cameFromCompose ? [
    { id: "demo-own", label: label || "Open when you need it", message, color: "petal" },
    { id: "sample-laugh", label: SAMPLE_ENVELOPES[1].label, message: SAMPLE_ENVELOPES[1].message, color: "gold" },
    { id: "sample-birthday", label: SAMPLE_ENVELOPES[2].label, message: SAMPLE_ENVELOPES[2].message, color: "sky", locked: true, unlockHint: "Oct 12" },
  ] : SAMPLE_ENVELOPES.map((envelope) => ({
    id: envelope.id,
    label: envelope.label,
    message: envelope.message,
    color: envelope.color ?? "petal",
    locked: envelope.locked,
    unlockHint: envelope.unlockDate,
  }));

  const resetDemo = () => {
    setCameFromCompose(false);
    setMomentChoice(PROMPTS[0]);
    setCustomMoment("");
    setMessage("");
    setCoverNote("A few little reminders that I’m always with you.");
    setTheme("petal");
    setOpenedEnvelopeId(null);
    setFavourites({});
    setStage("choose");
  };

  return (
    <div className={`demo-page ${stage === "receive" ? "demo-page--receive" : ""}`}>
      <header className="demo-page__header">
        <Link href="/app">← My shelf</Link>
        <span className="demo-page__brand"><span aria-hidden="true">❦</span> Open When Jar <i aria-hidden="true">/</i> Demo</span>
        <Link href="/app/unlock">Payment <span aria-hidden="true">→</span></Link>
      </header>

      <div className="demo-page__body">
        {stage === "choose" ? (
          <section className="demo-stage demo-stage--choose" aria-labelledby="demo-choice-heading">
            <div className="demo-stage__intro">
              <span className="demo-stage__eyebrow">A safe little rehearsal</span>
              <h1 id="demo-choice-heading">Which side of the jar<br /><em>would you like to see?</em></h1>
              <p className="demo-stage__sub">Nothing here is saved, sent, or charged. Pick a path and take it for a spin.</p>
            </div>
            <div className="demo-choice-grid">
              <button className="demo-choice demo-choice--send" onClick={() => setStage("compose")} type="button">
                <span className="demo-choice__topline"><span aria-hidden="true" className="demo-choice__icon">✉</span><span>Sender view</span></span>
                <strong>Send a demo</strong>
                <p>Write one letter, choose a look, and send it straight back to <b>@{username}</b> — yourself.</p>
                <span className="demo-choice__cta">Start writing <span aria-hidden="true">↗</span></span>
              </button>
              <button className="demo-choice demo-choice--receive" onClick={() => {
                setCameFromCompose(false);
                setStage("receive");
              }} type="button">
                <span className="demo-choice__topline"><span aria-hidden="true" className="demo-choice__icon">❦</span><span>Recipient view</span></span>
                <strong>Receive a demo</strong>
                <p>Open a ready-made jar as the person receiving it — envelopes, favourites, and a locked letter.</p>
                <span className="demo-choice__cta">Open a jar <span aria-hidden="true">↗</span></span>
              </button>
            </div>
            <p className="demo-choice__footnote"><span aria-hidden="true">♡</span> You can come back and try the other side anytime.</p>
          </section>
        ) : null}

        {stage === "compose" ? (
          <section className="demo-stage demo-compose" aria-labelledby="demo-compose-heading">
            <div className="demo-stage__heading">
              <div><span className="demo-stage__eyebrow">Send a demo · sender view</span><h1 id="demo-compose-heading">Make a little jar<br /><em>for yourself.</em></h1><p className="demo-stage__sub">Try the heart of the sending flow. This one comes back to <b>@{username}</b>.</p></div>
              <span className="demo-stage__account"><span aria-hidden="true">●</span> @{username}</span>
            </div>

            <div className="demo-compose__layout">
              <div className="demo-compose__form">
                <section className="demo-panel" aria-labelledby="demo-letter-heading">
                  <div className="demo-panel__heading"><span>01</span><div><h2 id="demo-letter-heading">Choose the moment</h2><p>Give this letter a reason to be opened.</p></div></div>
                  <label className="field">
                    <span className="field__label">Open when…</span>
                    <select className="select-input" onChange={(event) => setMomentChoice(event.target.value)} value={momentChoice}>
                      {PROMPTS.map((prompt) => <option key={prompt} value={prompt}>{prompt}</option>)}
                      <option value={CUSTOM_MOMENT}>Write your own…</option>
                    </select>
                  </label>
                  {momentChoice === CUSTOM_MOMENT ? (
                    <label className="field">
                      <span className="field__label">Your moment</span>
                      <input maxLength={80} onChange={(event) => setCustomMoment(event.target.value)} placeholder="Open when the stars come out" value={customMoment} />
                    </label>
                  ) : null}
                </section>

                <section className="demo-panel demo-panel--letter" aria-labelledby="demo-writing-heading">
                  <div className="demo-panel__heading"><span>02</span><div><h2 id="demo-writing-heading">Write the first letter</h2><p>Your letter and cover note live together, just like one piece of stationery.</p></div></div>
                  <div className="demo-letter-paper">
                    <span aria-hidden="true" className="paper-sprig paper-sprig--corner">❦</span>
                    <textarea aria-label="Your demo letter" maxLength={3000} onChange={(event) => setMessage(event.target.value)} placeholder="A few words are enough — this one is going to you." rows={6} value={message} />
                    <label className="demo-cover-note">
                      <span className="field__label">Cover note <small>Seen first</small></span>
                      <input maxLength={240} onChange={(event) => setCoverNote(event.target.value)} value={coverNote} />
                    </label>
                  </div>
                </section>

                <fieldset className="demo-panel demo-panel--theme" aria-labelledby="demo-theme-heading">
                  <div className="demo-panel__heading"><span>03</span><div><h2 id="demo-theme-heading">Choose a look</h2><p>The recipient preview changes as you choose.</p></div></div>
                  <div className="demo-theme-swatches">
                    {DEMO_THEMES.map((choice) => (
                      <button aria-pressed={choice.code === theme} className={choice.code === theme ? "is-selected" : ""} key={choice.code} onClick={() => setTheme(choice.code)} type="button">
                        <span aria-hidden="true" className={`theme-dot theme-dot--${choice.code}`} />
                        <span><strong>{choice.name}</strong><small>{choice.note}</small></span>
                      </button>
                    ))}
                  </div>
                </fieldset>

                <div className="demo-stage__actions">
                  <button className="button button--ghost" onClick={() => setStage("choose")} type="button">← Choose another path</button>
                  <button className="button button--primary" disabled={!message.trim()} onClick={() => {
                    setCameFromCompose(true);
                    setOpenedEnvelopeId(null);
                    setFavourites({});
                    setStage("sent");
                  }} type="button">Send demo to @{username} <span aria-hidden="true">→</span></button>
                </div>
              </div>

              <aside className={`demo-compose__preview theme-${theme}`} aria-label="Live preview of your demo jar">
                <div className="demo-compose__preview-top"><span>Live recipient preview</span><span className="demo-compose__preview-dot"><i aria-hidden="true" /> Updates instantly</span></div>
                <div className="demo-compose__preview-art"><Image alt="Illustrated Open When Jar" height={190} src="/jar-illustration.png" width={190} /></div>
                <p className="demo-compose__preview-kicker">A jar for you</p>
                <h2>@{username}</h2>
                <p className="demo-compose__preview-from">from @{username}</p>
                <blockquote>“{coverNote.trim() || "A few little reminders that I’m always with you."}”</blockquote>
                <div className="demo-compose__memory"><Image alt="Sunset memory included in this demo" height={96} src="/demo-sunset-memory.png" width={128} /><span><strong>A little sunset for you</strong><small>Photo included with this theme</small></span></div>
                <div className="demo-compose__preview-envelope"><span className="envelope-thumb envelope-thumb--petal" aria-hidden="true"><span>♡</span></span><div><strong>{label || "Open when…"}</strong><small>{message.trim() ? "Your first letter is ready" : "Your first letter will appear here"}</small></div><span aria-hidden="true">›</span></div>
                <small className="demo-compose__preview-note">Nothing is stored in demo mode.</small>
              </aside>
            </div>
          </section>
        ) : null}

        {stage === "sent" ? (
          <section className="demo-stage demo-stage--sent" aria-labelledby="demo-sent-heading">
            <div className="demo-sent__seal" aria-hidden="true">✉</div>
            <span className="demo-stage__eyebrow">Sender view · all done</span>
            <h1 id="demo-sent-heading">Your demo is on<br /><em>its way back to you.</em></h1>
            <p className="demo-stage__sub">That little jar is addressed to <b>@{username}</b>, because in this demo you are both the sender and the recipient.</p>
            <div className="demo-sent__steps"><span className="is-done">✓</span><i /><span className="is-done">✓</span><i /><span>3</span></div>
            <div className="demo-sent__labels"><span>Written</span><span>Sent</span><span>Open it</span></div>
            <div className="demo-stage__actions demo-stage__actions--center"><button className="button button--primary" onClick={() => setStage("receive")} type="button">Open my demo jar <span aria-hidden="true">→</span></button><button className="button button--ghost" onClick={() => setStage("compose")} type="button">Edit the letter</button></div>
          </section>
        ) : null}

        {stage === "receive" ? (
          <section className={`demo-stage demo-receive theme-${theme}`} aria-labelledby="demo-receive-heading">
            <div className="demo-receive__topbar"><button onClick={() => setStage("choose")} type="button">← Choose another path</button><span>Recipient view <i aria-hidden="true">/</i> demo</span><span className="demo-receive__privacy"><span aria-hidden="true">●</span> Private to @{username}</span></div>
            <div className="demo-receive__content">
            <div className="demo-receive__hero">
              <div className="demo-receive__intro">
                <p className="demo-receive__kicker">A jar for you</p>
                <h1 id="demo-receive-heading">{cameFromCompose ? <>From {displayName}<br /><em>— that’s you.</em></> : <>From {displayName}<br /><em>with a little love.</em></>}</h1>
                <blockquote>“{cameFromCompose ? (coverNote.trim() || "A few little reminders that I’m always with you.") : "A few little reminders that I’m always with you."}”</blockquote>
                <div className="demo-receive__stats"><span><strong>{envelopes.length}</strong><small>little letters</small></span><span><strong>∞</strong><small>ways to return</small></span></div>
              </div>
              <div className="demo-receive__jar"><Image alt="Illustrated Open When Jar" height={250} src="/jar-illustration.png" width={250} /></div>
            </div>
            <div className="demo-receive__letters">
            <div className="demo-receive__toolbar"><div><h2>Your envelopes</h2><p>Open one whenever you need it.</p></div><span>{envelopes.filter((envelope) => !envelope.locked).length} ready now</span></div>
            <div className="demo-receive__list">
              {envelopes.map((envelope) => {
                const isOpen = openedEnvelopeId === envelope.id;
                const isFavourite = favourites[envelope.id];
                return (
                  <article className={`demo-envelope ${envelope.locked ? "is-locked" : ""} ${isOpen ? "is-open" : ""}`} key={envelope.id}>
                    <span className={`envelope-thumb envelope-thumb--${envelope.color}`} aria-hidden="true"><span>{envelope.locked ? "⌁" : "♡"}</span></span>
                    <div className="demo-envelope__body">
                      <div className="demo-envelope__meta"><span>{envelope.locked ? "Waiting for the right day" : isOpen ? "Open now" : "Ready to open"}</span>{isFavourite ? <b>Favourite</b> : null}</div>
                      <h3>{envelope.label}</h3>
                      {envelope.locked
                        ? <p className="demo-envelope__lock">Locked · opens {envelope.unlockHint} <span>— your words stay private until then.</span></p>
                        : <>
                            <button className="demo-envelope__toggle" onClick={() => setOpenedEnvelopeId(isOpen ? null : envelope.id)} type="button">{isOpen ? "Fold the letter" : "Open letter"} <span aria-hidden="true">{isOpen ? "↑" : "↓"}</span></button>
                            {isOpen ? <div className={`demo-envelope__paper ${envelope.id === envelopes[0]?.id ? "has-memory" : ""}`}><p>{envelope.message}</p>{envelope.id === envelopes[0]?.id ? <figure className="demo-envelope__memory"><Image alt="A sunset memory attached to this letter" height={360} src="/demo-sunset-memory.png" width={480} /><figcaption>A little sunset for the days we’re apart.</figcaption></figure> : null}</div> : null}
                          </>}
                    </div>
                    {!envelope.locked ? (
                      <button aria-label={isFavourite ? "Remove from favourites" : "Add to favourites"} aria-pressed={isFavourite} className={isFavourite ? "favourite-button is-selected" : "favourite-button"} onClick={() => setFavourites((current) => ({ ...current, [envelope.id]: !isFavourite }))} type="button">♥</button>
                    ) : <span aria-hidden="true" />}
                  </article>
                );
              })}
            </div>
            <div className="demo-stage__actions demo-stage__actions--center"><button className="button button--secondary" onClick={resetDemo} type="button">↺ Restart demo</button><Link className="button button--primary" href="/app/unlock">Back to payment <span aria-hidden="true">→</span></Link></div>
            </div>
            </div>
          </section>
        ) : null}
      </div>

      <footer className="demo-page__footer"><span aria-hidden="true">✦</span> Demo mode — nothing you write here is saved, sent, or charged. <span aria-hidden="true">✦</span></footer>
    </div>
  );
}
