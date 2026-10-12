"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  INITIAL_DRAFT,
  PROMPTS,
  hasEnvelopeContent,
  isAllowedImage,
  type DraftJar,
  type Envelope,
  type Theme,
} from "@/lib/jar";
import { ArrowLeft, ArrowRight, Calendar, Check, ImageIcon, Mic, Pause, Play, Trash } from "./icons";
import { Button, Field, StepRail } from "./ui";

type CreatorStep = "recipient" | "editor" | "jar" | "preview" | "review";
type SaveStatus = "idle" | "saving" | "saved" | "error";

type CreatorFlowProps = {
  onExit: () => void;
  onComplete: (draft: DraftJar) => void;
};

function useVoiceRecorder() {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const urlsRef = useRef<Set<string>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [status, setStatus] = useState<"idle" | "recording" | "ready" | "denied" | "unsupported">("idle");
  const [seconds, setSeconds] = useState(0);
  const [url, setUrl] = useState("");

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    urlsRef.current.forEach((item) => URL.revokeObjectURL(item));
  }, []);

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia || !("MediaRecorder" in window)) {
      setStatus("unsupported");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      setSeconds(0);
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const nextUrl = URL.createObjectURL(blob);
        urlsRef.current.add(nextUrl);
        setUrl(nextUrl);
        setStatus("ready");
        stream.getTracks().forEach((track) => track.stop());
      };
      recorder.start();
      setStatus("recording");
      intervalRef.current = setInterval(() => {
        setSeconds((current) => {
          if (current >= 59) {
            recorder.stop();
            if (intervalRef.current) clearInterval(intervalRef.current);
            return 60;
          }
          return current + 1;
        });
      }, 1000);
    } catch {
      setStatus("denied");
    }
  };

  const stop = () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const remove = () => {
    if (url) {
      URL.revokeObjectURL(url);
      urlsRef.current.delete(url);
    }
    setUrl("");
    setSeconds(0);
    setStatus("idle");
  };

  const detach = () => {
    setUrl("");
    setSeconds(0);
    setStatus("idle");
  };

  return { status, seconds, url, start, stop, remove, detach };
}

function formatSeconds(value: number) {
  return `0:${String(value).padStart(2, "0")}`;
}

export function CreatorFlow({ onExit, onComplete }: CreatorFlowProps) {
  const [step, setStep] = useState<CreatorStep>("recipient");
  const [draft, setDraft] = useState<DraftJar>(INITIAL_DRAFT);
  const [label, setLabel] = useState<string>(PROMPTS[0]);
  const [message, setMessage] = useState("");
  const [transcript, setTranscript] = useState("");
  const [availability, setAvailability] = useState<"anytime" | "scheduled">("anytime");
  const [unlockDate, setUnlockDate] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoName, setPhotoName] = useState("");
  const [imageError, setImageError] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [showPrompts, setShowPrompts] = useState(false);
  const [error, setError] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voice = useVoiceRecorder();

  const activeStep = step === "editor" ? 1 : step === "jar" ? 2 : 3;
  const hostingEnd = useMemo(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 3);
    return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  }, []);

  useEffect(() => {
    if (step !== "editor" || (!message && !photoUrl && !voice.url)) return;
    setSaveStatus("saving");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => setSaveStatus("saved"), 700);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [message, photoUrl, step, voice.url]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (message.trim() && step === "editor") event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [message, step]);

  const resetEditor = () => {
    setLabel(PROMPTS[Math.min(draft.envelopes.length, PROMPTS.length - 1)]);
    setMessage("");
    setTranscript("");
    setAvailability("anytime");
    setUnlockDate("");
    setPhotoUrl("");
    setPhotoName("");
    setImageError("");
    voice.detach();
    setSaveStatus("idle");
    setError("");
  };

  const saveEnvelope = () => {
    if (!label.trim()) {
      setError("Give this envelope a label.");
      return;
    }
    if (!hasEnvelopeContent(message, Boolean(photoUrl), Boolean(voice.url))) {
      setError("Add a few words, a photo, or a voice recording first.");
      return;
    }
    if (availability === "scheduled" && !unlockDate) {
      setError("Choose when this envelope should open.");
      return;
    }
    const envelope: Envelope = {
      id: crypto.randomUUID(),
      label: label.trim().slice(0, 80),
      message: message.slice(0, 3000),
      transcript: transcript.trim() || undefined,
      availability,
      unlockDate: availability === "scheduled" ? unlockDate : undefined,
      photoUrl: photoUrl || undefined,
      photoName: photoName || undefined,
      audioUrl: voice.url || undefined,
      audioDuration: voice.seconds || undefined,
      color: draft.envelopes.length % 2 ? "gold" : "petal",
    };
    setDraft((current) => ({ ...current, envelopes: [...current.envelopes, envelope] }));
    setSaveStatus("saved");
    setError("");
    setStep("jar");
  };

  const selectImage = async (file?: File) => {
    setImageError("");
    if (!file) return;
    if (!isAllowedImage(file)) {
      setImageError(file.type === "image/heic" || file.name.toLowerCase().endsWith(".heic")
        ? "HEIC isn’t supported yet. Convert it to JPEG, PNG, or WebP and try again."
        : "Choose a JPEG, PNG, or WebP image under 10 MB.");
      return;
    }
    try {
      const bitmap = await createImageBitmap(file);
      const pixels = bitmap.width * bitmap.height;
      bitmap.close();
      if (pixels > 20_000_000) {
        setImageError("That image is over 20 megapixels. Choose a smaller copy and try again.");
        return;
      }
    } catch {
      setImageError("We couldn’t read that image safely. Try a different JPEG, PNG, or WebP file.");
      return;
    }
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhotoUrl(URL.createObjectURL(file));
    setPhotoName(file.name);
  };

  if (step === "recipient") {
    return (
      <main className="creator-shell creator-shell--centered">
        <header className="flow-header"><button onClick={onExit} type="button" aria-label="Back to home"><ArrowLeft /></button><span>New jar</span><span /></header>
        <section className="setup-panel">
          <span className="paper-sprig" aria-hidden="true">❦</span>
          <h1>Who is this jar for?</h1>
          <p>Just their preferred name for now. You’ll add their email when the jar is ready.</p>
          <Field label="Their name">
            <input autoFocus maxLength={60} value={draft.recipientName} onChange={(event) => setDraft({ ...draft, recipientName: event.target.value })} placeholder="Anu" />
          </Field>
          <Button disabled={!draft.recipientName.trim()} onClick={() => setStep("editor")}>Write the first letter <ArrowRight /></Button>
          <small>Your work stays in this page until you choose to save it.</small>
        </section>
      </main>
    );
  }

  if (step === "editor") {
    return (
      <main className="creator-shell">
        <header className="flow-header">
          <button onClick={() => draft.envelopes.length ? setStep("jar") : setStep("recipient")} type="button" aria-label="Go back"><ArrowLeft /></button>
          <span>Envelope {draft.envelopes.length + 1} of 10</span>
          <span className={`save-status save-status--${saveStatus}`} aria-live="polite">{saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? <><Check size={18} /> Saved</> : "Not saved"}</span>
        </header>
        <section className="editor">
          <div className="editor__title-row">
            <input className="title-input" maxLength={80} aria-label="Envelope label" value={label} onChange={(event) => setLabel(event.target.value)} />
            <button className="prompt-toggle" type="button" onClick={() => setShowPrompts((current) => !current)} aria-expanded={showPrompts}>Need inspiration? <strong>See a prompt</strong></button>
          </div>
          {showPrompts ? (
            <div className="prompt-list" role="listbox" aria-label="Open when prompts">
              {PROMPTS.map((prompt) => <button className={label === prompt ? "is-selected" : ""} key={prompt} type="button" onClick={() => { setLabel(prompt); setShowPrompts(false); }}>{prompt.replace("Open ", "")}</button>)}
            </div>
          ) : null}
          <div className="letter-editor">
            <span className="paper-sprig paper-sprig--corner" aria-hidden="true">❧</span>
            <textarea maxLength={3000} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="A few words are enough." aria-label="Your letter" />
            <span>{message.length}/3000</span>
          </div>

          {photoUrl ? <div className="attachment-preview"><Image alt="Selected attachment preview" src={photoUrl} width={560} height={320} unoptimized /><button type="button" onClick={() => { URL.revokeObjectURL(photoUrl); setPhotoUrl(""); setPhotoName(""); }}><Trash size={18} /> Remove photo</button></div> : null}
          {voice.url ? <div className="audio-preview"><audio controls src={voice.url} /><button type="button" onClick={voice.remove}><Trash size={18} /> Remove</button></div> : null}

          <div className="attachment-actions">
            <label className="attachment-button attachment-button--photo"><ImageIcon /><span>{photoName || "Add photo"}</span><input type="file" accept="image/jpeg,image/png,image/webp,.heic" onChange={(event) => selectImage(event.target.files?.[0])} /></label>
            <button className="attachment-button attachment-button--voice" type="button" onClick={voice.status === "recording" ? voice.stop : voice.start}>
              {voice.status === "recording" ? <Pause /> : <Mic />}<span>{voice.status === "recording" ? `Stop · ${formatSeconds(voice.seconds)}` : voice.url ? "Replace voice" : "Record voice"}</span>
            </button>
          </div>
          {imageError ? <p className="field-error" role="alert">{imageError}</p> : null}
          {voice.status === "denied" ? <p className="field-error" role="alert">Microphone access is off. You can enable it in your browser or write a message instead.</p> : null}
          {voice.status === "unsupported" ? <p className="field-error" role="alert">Voice recording isn’t supported in this browser. You can still write a message or add a photo.</p> : null}
          {voice.url ? <Field label="Optional transcript" hint="A transcript makes your recording easier for everyone to enjoy."><textarea className="transcript-input" value={transcript} onChange={(event) => setTranscript(event.target.value)} /></Field> : null}

          <div className="availability">
            <Calendar />
            <div><strong>Available</strong><span>{availability === "anytime" ? "Anytime" : unlockDate ? `Opens ${new Date(`${unlockDate}T09:00`).toLocaleDateString("en-US", { month: "long", day: "numeric" })} at 9:00 AM · your time` : "Choose a date"}</span></div>
            <button type="button" onClick={() => setAvailability((current) => current === "anytime" ? "scheduled" : "anytime")}>Change</button>
          </div>
          {availability === "scheduled" ? <input className="date-input" type="date" value={unlockDate} onChange={(event) => setUnlockDate(event.target.value)} min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)} /> : null}
          {error ? <p className="field-error" role="alert">{error}</p> : null}
          <Button className="save-envelope" onClick={saveEnvelope}>Save envelope</Button>
          <StepRail active={1} />
        </section>
      </main>
    );
  }

  if (step === "jar") {
    return (
      <main className="creator-shell">
        <header className="flow-header"><button onClick={() => setStep("editor")} type="button" aria-label="Back to letter"><ArrowLeft /></button><span>Your jar</span><span>{draft.envelopes.length}/10</span></header>
        <section className="jar-builder">
          <h1>It’s becoming something special.</h1>
          <p>One complete envelope is enough. Three is a lovely place to start.</p>
          <div className="mini-jar"><Image alt="Your jar preview" src="/jar-illustration.png" width={340} height={340} /></div>
          <div className="builder-list">
            {draft.envelopes.map((envelope, index) => (
              <div className="builder-row" key={envelope.id}><span className={`envelope-thumb envelope-thumb--${envelope.color}`} /><div><strong>{envelope.label}</strong><small>{envelope.availability === "anytime" ? "Available anytime" : `Opens ${envelope.unlockDate}`}</small></div><span>{index + 1}</span></div>
            ))}
          </div>
          <Button variant="secondary" disabled={draft.envelopes.length >= 10} onClick={() => { resetEditor(); setStep("editor"); }}>+ Add another envelope</Button>
          <div className="theme-picker" aria-labelledby="theme-heading"><h2 id="theme-heading">Choose your jar</h2><div>{(["petal", "blue", "garden"] as Theme[]).map((theme) => <button key={theme} type="button" onClick={() => setDraft({ ...draft, theme })} className={draft.theme === theme ? "is-selected" : ""}><span className={`theme-dot theme-dot--${theme}`} /><strong>{theme === "petal" ? "Petal" : theme === "blue" ? "Blue Hour" : "Little Garden"}</strong>{draft.theme === theme ? <Check size={18} /> : null}</button>)}</div></div>
          <Field label="A note for the jar" hint={`${draft.coverNote.length}/240`}><textarea maxLength={240} value={draft.coverNote} onChange={(event) => setDraft({ ...draft, coverNote: event.target.value })} /></Field>
          <Button onClick={() => setStep("preview")}>Preview gift <ArrowRight /></Button>
          <StepRail active={2} />
        </section>
      </main>
    );
  }

  if (step === "preview") {
    return (
      <main className={`preview-shell theme-${draft.theme}`}>
        <header className="flow-header"><button onClick={() => setStep("jar")} type="button" aria-label="Back to jar"><ArrowLeft /></button><span>Your preview</span><button className="text-button" type="button" onClick={() => setStep("review")}>Next</button></header>
        <section className="gift-preview">
          <span className="preview-label">Your preview</span>
          <h1>{draft.recipientName}, this is for you.</h1>
          <p className="gift-preview__from">From {draft.creatorName || "you"}</p>
          <Image alt="The jar your recipient will see" src="/jar-illustration.png" width={440} height={440} />
          <p className="gift-preview__note">{draft.coverNote}</p>
          <div className="preview-envelopes">{draft.envelopes.map((envelope) => <div key={envelope.id}><span className={`envelope-thumb envelope-thumb--${envelope.color}`} /><strong>{envelope.label}</strong><span>{envelope.availability === "scheduled" ? envelope.unlockDate : "Ready"}</span></div>)}</div>
          <Button onClick={() => setStep("review")}>Review and seal <ArrowRight /></Button>
        </section>
      </main>
    );
  }

  return (
    <main className="creator-shell">
      <header className="flow-header"><button onClick={() => setStep("preview")} type="button" aria-label="Back to preview"><ArrowLeft /></button><span>Review your jar</span><span /></header>
      <section className="review-panel">
        <h1>Ready to seal it?</h1>
        <p>After payment, your letters and unlock dates can’t be changed.</p>
        <div className="review-summary"><div><span>For</span><strong>{draft.recipientName}</strong></div><div><span>Envelopes</span><strong>{draft.envelopes.length}</strong></div><div><span>Theme</span><strong>{draft.theme === "blue" ? "Blue Hour" : draft.theme === "garden" ? "Little Garden" : "Petal"}</strong></div></div>
        <Field label="What name should they see?" hint="This is the name shown on your gift, not a verified identity."><input maxLength={60} value={draft.creatorName} onChange={(event) => setDraft({ ...draft, creatorName: event.target.value })} placeholder="Felix" /></Field>
        <Field label="Recipient email" hint="Only this email can claim your jar. We won’t email them until you choose to send it."><input inputMode="email" type="email" value={draft.recipientEmail} onChange={(event) => setDraft({ ...draft, recipientEmail: event.target.value })} placeholder="anu@example.com" /></Field>
        <div className="price-box"><div><span>One Open When Jar</span><small>Online for three years, until {hostingEnd}</small></div><strong>US$7.99</strong></div>
        <p className="tax-note">Plus applicable tax. The final total appears before purchase. No subscription or automatic renewal.</p>
        <Button disabled={!draft.creatorName.trim() || !/^\S+@\S+\.\S+$/.test(draft.recipientEmail)} onClick={() => setCheckoutOpen(true)}>Seal and pay · US$7.99</Button>
        <StepRail active={3} />
      </section>
      {checkoutOpen ? <div className="modal-backdrop" role="presentation"><section className="prototype-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-title"><span className="paper-sprig">❦</span><h2 id="checkout-title">Checkout boundary</h2><p>This experience prototype doesn’t make a real charge. Production checkout must be connected to Dodo Payments and completed only after a verified webhook.</p><div><Button variant="secondary" onClick={() => setCheckoutOpen(false)}>Go back</Button><Button onClick={() => onComplete(draft)}>Preview successful purchase</Button></div></section></div> : null}
    </main>
  );
}
