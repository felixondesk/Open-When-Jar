"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

const MAX_SOURCE_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_PREPARED_BYTES = 1_500_000;
const MAX_IMAGE_EDGE = 1600;
const MAX_RECORDING_SECONDS = 60;

export type PreparedMedia = {
  photo: File | null;
  audio: File | null;
};

type MediaAttachmentsProps = {
  disabled?: boolean;
  onChange: Dispatch<SetStateAction<PreparedMedia>>;
};

export function MediaAttachments({ disabled = false, onChange }: MediaAttachmentsProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [photo, setPhoto] = useState<File | null>(null);
  const [audio, setAudio] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [preparing, setPreparing] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    onChange({ photo, audio });
  }, [audio, onChange, photo]);

  useEffect(() => {
    if (!audio) {
      setAudioUrl("");
      return;
    }
    const url = URL.createObjectURL(audio);
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [audio]);

  useEffect(() => () => {
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  async function selectPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const source = event.target.files?.[0];
    event.target.value = "";
    if (!source) return;
    setMessage("");
    if (!(["image/jpeg", "image/png", "image/webp"] as string[]).includes(source.type)) {
      setMessage("Choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (source.size > MAX_SOURCE_IMAGE_BYTES) {
      setMessage("Choose an image smaller than 12 MB.");
      return;
    }

    setPreparing(true);
    try {
      const compressed = await compressImage(source);
      setPhoto(compressed);
      setMessage(`Photo compressed from ${formatBytes(source.size)} to ${formatBytes(compressed.size)}.`);
    } catch {
      setMessage("That image could not be prepared safely. Try another one.");
    } finally {
      setPreparing(false);
    }
  }

  async function startRecording() {
    setMessage("");
    if (!window.isSecureContext) {
      setMessage("Voice recording needs a secure connection (HTTPS).");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setMessage("Voice recording is not supported in this browser.");
      return;
    }
    setAudio(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      chunksRef.current = [];
      setElapsed(0);

      const preferredType = [
        "audio/webm;codecs=opus",
        "audio/ogg;codecs=opus",
        "audio/mp4",
      ].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, {
        ...(preferredType ? { mimeType: preferredType } : {}),
        audioBitsPerSecond: 32_000,
      });
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const mimeType = recorder.mimeType.split(";")[0] || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const extension = mimeType === "audio/ogg" ? "ogg" : mimeType === "audio/mp4" ? "m4a" : "webm";
        if (!blob.size || blob.size > MAX_PREPARED_BYTES) {
          setAudio(null);
          setMessage("The voice note was too large. Record a shorter note.");
        } else {
          setAudio(new File([blob], `voice-note.${extension}`, { type: mimeType, lastModified: Date.now() }));
          setMessage(`Voice note compressed to ${formatBytes(blob.size)}.`);
        }
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setRecording(false);
      };
      recorder.start(1_000);
      setRecording(true);
      elapsedTimerRef.current = setInterval(() => setElapsed((value) => value + 1), 1_000);
      stopTimerRef.current = setTimeout(stopRecording, MAX_RECORDING_SECONDS * 1_000);
    } catch {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setMessage("Microphone access was not available. Check this site’s browser permission.");
    }
  }

  function stopRecording() {
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    stopTimerRef.current = null;
    elapsedTimerRef.current = null;
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  const controlsDisabled = disabled || preparing;

  return (
    <fieldset className="media-attachments" disabled={disabled}>
      <legend>Optional keepsakes</legend>
      <p>Add one compressed photo and a voice note up to 60 seconds.</p>
      <input name="mediaPreparing" type="hidden" value={preparing ? "true" : "false"} />
      <input name="mediaRecording" type="hidden" value={recording ? "true" : "false"} />
      <div className="media-attachment-grid">
        <div className="media-attachment-card">
          <span aria-hidden="true">▧</span>
          <strong>Photo</strong>
          <small>{photo ? `${formatBytes(photo.size)} WebP` : "JPEG, PNG, or WebP"}</small>
          <input ref={imageInputRef} hidden accept="image/jpeg,image/png,image/webp" type="file" onChange={selectPhoto} />
          <button disabled={controlsDisabled} type="button" onClick={() => imageInputRef.current?.click()}>{preparing ? "Compressing…" : photo ? "Replace photo" : "Choose photo"}</button>
          {photo ? <button className="media-remove" type="button" onClick={() => setPhoto(null)}>Remove</button> : null}
        </div>
        <div className={`media-attachment-card ${recording ? "is-recording" : ""}`}>
          <span aria-hidden="true">◉</span>
          <strong>Voice note</strong>
          {recording ? <div aria-live="polite" className="recording-indicator" role="status">
            <span aria-hidden="true" className="recording-indicator__dot" />
            <strong>Recording</strong>
            <span className="recording-indicator__time">{elapsed}s / {MAX_RECORDING_SECONDS}s</span>
            <span aria-hidden="true" className="recording-indicator__wave"><i /><i /><i /><i /><i /><i /><i /></span>
          </div> : null}
          <small>{recording ? `${elapsed}s of ${MAX_RECORDING_SECONDS}s` : audio ? formatBytes(audio.size) : "Compressed while recording"}</small>
          {audioUrl ? <audio aria-label="Voice note preview" controls preload="metadata" src={audioUrl} /> : null}
          <button disabled={controlsDisabled} type="button" onClick={recording ? stopRecording : startRecording}>{recording ? "Stop recording" : audio ? "Record again" : "Record voice"}</button>
          {audio ? <button className="media-remove" type="button" onClick={() => setAudio(null)}>Remove</button> : null}
        </div>
      </div>
      {message ? <p className="media-status" role="status">{message}</p> : null}
    </fieldset>
  );
}

async function compressImage(source: File) {
  const bitmap = await createImageBitmap(source);
  try {
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Canvas unavailable");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);

    for (const quality of [0.8, 0.7, 0.6]) {
      const blob = await canvasToBlob(canvas, quality);
      if (blob.size <= MAX_PREPARED_BYTES) {
        return new File([blob], "photo.webp", { type: "image/webp", lastModified: Date.now() });
      }
    }
    throw new Error("Compressed image remains too large");
  } finally {
    bitmap.close();
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("WebP encoding failed")), "image/webp", quality);
  });
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(bytes < 100 * 1024 ? 1 : 0)} KB`;
}
