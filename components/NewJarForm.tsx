"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { createJarAction, type JarFormState } from "@/app/app/actions";
import { PROMPTS, type Theme } from "@/lib/jar";
import { MediaAttachments, type PreparedMedia } from "./MediaAttachments";
import { Button, Field } from "./ui";

const INITIAL_STATE: JarFormState = {};
const CUSTOM_MOMENT = "__custom__";

const THEME_CHOICES: { code: Theme; name: string; blurb: string }[] = [
  { code: "petal", name: "Petal", blurb: "Soft blush and warm ink" },
  { code: "blue", name: "Blue Hour", blurb: "Quiet skies at dusk" },
  { code: "garden", name: "Little Garden", blurb: "Morning greens and light" },
];

type CircleMember = { displayName: string; username: string };

export function NewJarForm({ creatorUsername, circleMembers = [] }: { creatorUsername: string; circleMembers?: CircleMember[] }) {
  const [state, action, pending] = useActionState(createJarAction, INITIAL_STATE);
  const previewDialogRef = useRef<HTMLDialogElement>(null);
  const [submitting, startTransition] = useTransition();
  const [timezone, setTimezone] = useState("UTC");
  const [unlockAt, setUnlockAt] = useState("");
  const [scheduleUnlock, setScheduleUnlock] = useState(false);
  const [unlockDate, setUnlockDate] = useState("");
  const [unlockTime, setUnlockTime] = useState("09:00");
  const [media, setMedia] = useState<PreparedMedia>({ photo: null, audio: null });
  const [photoUrl, setPhotoUrl] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [message, setMessage] = useState("");
  const [recipientUsernames, setRecipientUsernames] = useState([""]);
  const [momentChoice, setMomentChoice] = useState<string>(PROMPTS[0]);
  const [customMoment, setCustomMoment] = useState("");
  const [theme, setTheme] = useState<Theme>("petal");
  const [coverNote, setCoverNote] = useState("A few little reminders that I’m always with you.");
  const label = momentChoice === CUSTOM_MOMENT ? customMoment.trim() : momentChoice;
  const previewRecipient = recipientUsernames.map((value) => value.trim()).filter(Boolean)[0] ?? "";
  const previewCoverNote = coverNote.trim() || "A few little reminders that I’m always with you.";
  const needsCircle = circleMembers.length === 0;
  const minUnlockDate = getTomorrowDateInputValue();

  useEffect(() => {
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  }, []);

  useEffect(() => {
    if (!media.photo) {
      setPhotoUrl("");
      return;
    }
    const url = URL.createObjectURL(media.photo);
    setPhotoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [media.photo]);

  useEffect(() => {
    if (!media.audio) {
      setAudioUrl("");
      return;
    }
    const url = URL.createObjectURL(media.audio);
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [media.audio]);

  return (
    <form action={action} className="new-jar-form new-jar-form--studio" onSubmit={(event) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      formData.set("submitIntent", "seal");
      const submittedUnlockDate = String(formData.get("unlockDate") ?? "");
      const submittedUnlockTime = String(formData.get("unlockTime") ?? "");
      formData.set("unlockAt", toUnlockIso(submittedUnlockDate, submittedUnlockTime));
      if (media.photo) formData.set("photo", media.photo);
      if (media.audio) formData.set("audio", media.audio);
      if (!needsCircle) startTransition(() => action(formData));
    }}>
      <div className="form-heading form-heading--studio">
        <div className="form-heading__copy"><h1>A few words<br />for brighter days.</h1><p>Create a letter, add a photo or voice note, and send a little love to someone special.</p></div>
        <span className="form-heading__status"><span aria-hidden="true">●</span> {needsCircle ? "Preview your Jar" : "Live preview as you write"}</span>
      </div>

      <div className="jar-studio__controls">
        <section className="studio-panel studio-panel--recipient">
          <div className="studio-fields-row">
            <label className="field">
              <span className="field__label">Open when…</span>
              <select className="select-input" onChange={(event) => setMomentChoice(event.target.value)} value={momentChoice}>
                {PROMPTS.map((prompt) => <option key={prompt} value={prompt}>{prompt}</option>)}
                <option value={CUSTOM_MOMENT}>Write your own…</option>
              </select>
            </label>
            <label className="field">
              <span className="field__label">Send to</span>
              <select aria-label="Recipient" aria-describedby={needsCircle ? "circle-required" : undefined} className="select-input" disabled={needsCircle} name="recipientUsernames" onChange={(event) => setRecipientUsernames((current) => [event.target.value, ...current.slice(1)])} required value={recipientUsernames[0]}>
                <option disabled hidden value="">Choose someone in your Circle</option>
                {circleMembers.map((member) => <option key={member.username} value={member.username}>{member.displayName} (@{member.username})</option>)}
              </select>
            </label>
          </div>
          {needsCircle ? <p className="studio-circle-required" id="circle-required">You need someone in your Circle before you can send a Jar. <Link href="/app?view=circle">Add someone to My Circle</Link></p> : <p className="field__hint">Only people in your Circle can receive your Jar.</p>}
          {momentChoice === CUSTOM_MOMENT ? <Field label="Your moment" hint="Up to 80 characters."><input maxLength={80} onChange={(event) => setCustomMoment(event.target.value)} placeholder="Open when the stars come out" required value={customMoment} /></Field> : null}
          <input name="label" type="hidden" value={label} />
        </section>

        <fieldset className="studio-panel theme-choices">
          <legend>Choose a theme</legend>
          <div className="theme-choices__grid">
            {THEME_CHOICES.map((choice) => <label className={`theme-choice theme-choice--${choice.code}${choice.code === theme ? " is-selected" : ""}`} key={choice.code}>
              <input checked={choice.code === theme} name="theme" onChange={() => setTheme(choice.code)} type="radio" value={choice.code} />
              <span className={`theme-botanical theme-botanical--${choice.code}`} aria-hidden="true">❦</span>
              <strong>{choice.name}</strong><small>{choice.blurb}</small>
            </label>)}
          </div>
        </fieldset>

        <section className="studio-panel studio-panel--letter">
          <div className="letter-composition__caption"><strong>Your first letter</strong><span>One piece of stationery</span></div>
          <div className="letter-paper">
            <span aria-hidden="true" className="paper-sprig paper-sprig--corner">❦</span>
            <textarea aria-label="Your first letter" className="letter-paper__body" maxLength={3000} name="message" onChange={(event) => setMessage(event.target.value)} placeholder="A few words are enough. Start with how you want them to feel." required value={message} />
            <label className="cover-note-field">
              <span className="field__label">Cover note <small>Seen first</small></span>
              <textarea maxLength={240} name="coverNote" onChange={(event) => setCoverNote(event.target.value)} placeholder="A few little reminders that I’m always with you." rows={2} value={coverNote} />
              <span className="field__hint">{240 - coverNote.length} characters left</span>
            </label>
          </div>
        </section>

        <section className="studio-panel studio-panel--finishing">
          <div className="studio-panel__heading"><h2>Photo, voice & timing</h2><p>Turn the letter into something they can see and hear.</p></div>
          <MediaAttachments disabled={pending || submitting} onChange={setMedia} />
          <label className="schedule-toggle">
            <input checked={scheduleUnlock} onChange={(event) => {
              const checked = event.target.checked;
              setScheduleUnlock(checked);
              if (!checked) {
                setUnlockDate("");
                setUnlockAt("");
              }
            }} type="checkbox" />
            <span><strong>Schedule an open date</strong><small>Optional · leave this off to open the jar right away.</small></span>
          </label>
          {scheduleUnlock ? <div className="unlock-schedule-fields">
            <Field label="Open date" hint={`In ${timezone}`}><input aria-label="Open date" name="unlockDate" required type="date" min={minUnlockDate} value={unlockDate} onChange={(event) => {
              const nextDate = event.target.value;
              setUnlockDate(nextDate);
              setUnlockAt(toUnlockIso(nextDate, unlockTime));
            }} /></Field>
            <Field label="Open time" hint="Your local time"><input aria-label="Open time" name="unlockTime" required type="time" value={unlockTime} onChange={(event) => {
              const nextTime = event.target.value;
              setUnlockTime(nextTime);
              setUnlockAt(toUnlockIso(unlockDate, nextTime));
            }} /></Field>
          </div> : null}
          <input name="unlockAt" type="hidden" value={unlockAt} />
          <input name="unlockTimezone" type="hidden" value={timezone} />
        </section>

        {state.error ? <p className="field-error" role="alert">{state.error}</p> : null}
        <div className="jar-studio__actions">
          <Button onClick={() => previewDialogRef.current?.showModal()} type="button" variant="secondary">Preview</Button>
          <Button disabled={pending || submitting || needsCircle} name="submitIntent" type="submit" value="seal">{pending || submitting ? "Sealing Jar…" : "Seal Jar"}</Button>
        </div>
      </div>

      <aside aria-label="Live preview of the gift" className={`gift-live-preview theme-${theme}`}>
        <div className="gift-live-preview__top"><span>This is what they’ll see</span><span><i aria-hidden="true" />Updates instantly</span></div>
        <div className="gift-live-preview__scene">
          <Image alt="Illustrated glowing Open When Jar" height={420} priority src="/jar-illustration.png" width={420} />
          <article className="gift-live-preview__letter">
            <p>{label || "Open when…"}</p>
            <span aria-hidden="true">— ♡ —</span>
            <div>{message.trim() || "Your first words will appear here as you write."}</div>
            <strong>— @{creatorUsername}</strong>
          </article>
          {photoUrl ? <img alt="Your selected memory" className="gift-live-preview__photo" src={photoUrl} /> : <div className="gift-live-preview__photo gift-live-preview__photo--empty"><span aria-hidden="true">▧</span>Add a photo<br />to make it theirs</div>}
        </div>
        <div className="gift-live-preview__identity"><strong>A jar for {previewRecipient ? `@${previewRecipient}` : "someone dear"}</strong><small>from @{creatorUsername}</small></div>
        <blockquote>“{previewCoverNote}”</blockquote>
        {audioUrl ? <audio aria-label="Your voice note preview" controls preload="metadata" src={audioUrl} /> : <div className="gift-live-preview__voice"><button aria-label="Voice note will appear here after recording" disabled type="button">▶</button><span className="voice-wave" aria-hidden="true">▂▅▃▆▇▄▂▅▇▃▆▂▅▃▇</span><small>Record a voice note</small></div>}
      </aside>
      <dialog aria-labelledby="jar-preview-title" className={`jar-preview-dialog theme-${theme}`} ref={previewDialogRef}>
        <div className="jar-preview-dialog__header"><span>Before you seal it</span><button aria-label="Close preview" onClick={() => previewDialogRef.current?.close()} type="button">×</button></div>
        <div className="jar-preview-dialog__body">
          <Image alt="Illustrated Open When Jar" height={170} src="/jar-illustration.png" width={170} />
          <p className="jar-preview-dialog__recipient">{previewRecipient ? `For @${previewRecipient}` : "Choose someone in your Circle"}</p>
          <h2 id="jar-preview-title">{label || "Open when…"}</h2>
          <blockquote>“{previewCoverNote}”</blockquote>
          <div className="jar-preview-dialog__letter"><span aria-hidden="true">— ♡ —</span><p>{message.trim() || "Your first words will appear here as you write."}</p><strong>— @{creatorUsername}</strong></div>
          {photoUrl ? <img alt="Your selected photo" className="jar-preview-dialog__photo" src={photoUrl} /> : null}
          {audioUrl ? <audio aria-label="Your voice note" controls preload="metadata" src={audioUrl} /> : null}
          {scheduleUnlock && unlockAt ? <p className="jar-preview-dialog__schedule">Opens {new Date(unlockAt).toLocaleString(undefined, { dateStyle: "long", timeStyle: "short" })}</p> : null}
        </div>
        <div className="jar-preview-dialog__footer"><Button onClick={() => previewDialogRef.current?.close()} type="button" variant="secondary">Back to Send</Button></div>
      </dialog>
    </form>
  );
}

function getTomorrowDateInputValue() {
  const tomorrow = new Date();
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const month = String(tomorrow.getMonth() + 1).padStart(2, "0");
  const day = String(tomorrow.getDate()).padStart(2, "0");
  return `${tomorrow.getFullYear()}-${month}-${day}`;
}

function toUnlockIso(date: string, time: string) {
  if (!date || !time) return "";
  const parsed = new Date(`${date}T${time}:00`);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}
