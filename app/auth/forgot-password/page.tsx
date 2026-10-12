import Link from "next/link";
import { ForgotPasswordForm } from "@/components/PasswordForms";
import { Brand } from "@/components/ui";

export const metadata = {
  title: "Forgot password — Open When Jar",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <main className="account-shell">
      <header className="account-header"><Brand /><Link href="/auth">Back to sign in</Link></header>
      <section className="account-layout">
        <div className="account-promise">
          <span className="paper-sprig" aria-hidden="true">❦</span>
          <h2>Find your way back to your shelf.</h2>
          <p>We’ll help you get back to the jars you’ve sent and received.</p>
        </div>
        <div className="auth-card"><ForgotPasswordForm /></div>
      </section>
    </main>
  );
}
