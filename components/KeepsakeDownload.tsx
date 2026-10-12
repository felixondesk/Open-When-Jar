"use client";

import { useState } from "react";

type KeepsakeAttachment = { id: string; kind: "image" | "audio" };
export type KeepsakeLetter = {
  label: string;
  text: string;
  transcript: string | null;
  attachments: KeepsakeAttachment[];
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character] ?? character);
}

function asDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Media could not be read"));
    reader.onerror = () => reject(new Error("Media could not be read"));
    reader.readAsDataURL(blob);
  });
}

export function KeepsakeDownload({ jarId, sender, coverNote, endsAt, letters }: { jarId: string; sender: string; coverNote: string; endsAt: string; letters: KeepsakeLetter[] }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function download() {
    setPending(true);
    setError("");
    try {
      if (Date.now() >= new Date(endsAt).getTime()) throw new Error("This Jar's hosting has ended.");
      const sections: string[] = [];
      for (const letter of letters) {
        const media: string[] = [];
        for (const attachment of letter.attachments) {
          const response = await fetch(`/api/media/${encodeURIComponent(attachment.id)}`, { cache: "no-store" });
          if (!response.ok) throw new Error("A photo or voice note could not be downloaded. Please try again.");
          const dataUrl = await asDataUrl(await response.blob());
          media.push(attachment.kind === "image"
            ? `<img alt="Attached memory" src="${dataUrl}">`
            : `<audio controls src="${dataUrl}">Voice note</audio>`);
        }
        sections.push(`<section><h2>${escapeHtml(letter.label)}</h2><p>${escapeHtml(letter.text)}</p>${media.join("")}${letter.transcript ? `<h3>Voice transcript</h3><p>${escapeHtml(letter.transcript)}</p>` : ""}</section>`);
      }
      if (Date.now() >= new Date(endsAt).getTime()) throw new Error("This Jar's hosting has ended.");
      const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Open When Jar keepsake</title><style>body{font:18px/1.6 Georgia,serif;max-width:44rem;margin:3rem auto;padding:0 1.25rem;color:#352933;background:#fffaf7}h1,h2{line-height:1.2}section{border-top:1px solid #d8c8ce;margin-top:2rem;padding-top:1rem}p{white-space:pre-wrap}img{display:block;max-width:100%;margin:1rem 0}audio{display:block;max-width:100%;margin:1rem 0}small{color:#6d6067}@media print{body{margin:0;max-width:none}audio{display:none}}</style></head><body><h1>Open When Jar</h1><p>From ${escapeHtml(sender)}</p>${coverNote ? `<p>${escapeHtml(coverNote)}</p>` : ""}<small>Saved ${escapeHtml(new Date().toLocaleDateString())}. This copy contains letters that were available when it was saved.</small>${sections.join("")}</body></html>`;
      const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `open-when-jar-${jarId.slice(0, 8)}.html`;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The keepsake could not be saved. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return <div className="library-jar__keepsake"><button className="button button--secondary" disabled={pending} onClick={download} type="button">{pending ? "Preparing keepsake…" : "Download keepsake"}</button><p>Save the letters currently available to you, with their photos and voice notes, before hosting ends.</p>{error ? <p className="field-error" role="alert">{error}</p> : null}</div>;
}
