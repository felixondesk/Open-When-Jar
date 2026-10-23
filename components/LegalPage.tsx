import Link from "next/link";
import type { ReactNode } from "react";
import { Brand } from "./ui";

type LegalPageProps = {
  eyebrow: string;
  title: string;
  summary: ReactNode;
  children: ReactNode;
};

export function LegalPage({ eyebrow, title, summary, children }: LegalPageProps) {
  return (
    <main className="legal-shell">
      <header className="legal-header page-width">
        <Brand />
        <Link href="/">Back home</Link>
      </header>
      <article className="legal-document">
        <div className="legal-intro">
          <span>{eyebrow}</span>
          <h1>{title}</h1>
          <p>{summary}</p>
          <small>Last updated 23 October 2026</small>
        </div>
        <div className="legal-content">{children}</div>
      </article>
      <footer className="legal-footer page-width">
        <Brand />
        <nav aria-label="Legal pages">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/refund-policy">Refund policy</Link>
        </nav>
      </footer>
    </main>
  );
}
