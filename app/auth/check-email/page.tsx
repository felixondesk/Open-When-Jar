import Link from "next/link";
import { Brand } from "@/components/ui";

export const metadata = {
  title: "Check your email — Open When Jar",
  robots: { index: false, follow: false },
};

export default function CheckEmailPage() {
  return (
    <main className="account-shell">
      <header className="account-header"><Brand /><Link href="/">Back home</Link></header>
      <section className="account-layout">
        <div className="account-promise">
          <span className="paper-sprig" aria-hidden="true">❦</span>
          <h2>One more step to open your shelf.</h2>
          <p>Verify your email address to activate your account.</p>
        </div>
        <div className="auth-card">
          <div className="auth-form">
            <h1>Registration successful.</h1>
            <p>Check your inbox for an activation email, then follow its link to verify your account.</p>
            <Link className="button button--primary" href="/auth">Go to sign in</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
