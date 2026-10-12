import Link from "next/link";
import { ResetPasswordForm } from "@/components/PasswordForms";
import { Brand } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Set a new password — Open When Jar",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const hasRecoverySession = await (async () => {
    try {
      const { data: claimsData } = await supabase.auth.getClaims();
      const recovery = claimsData?.claims?.amr?.find((entry) => typeof entry !== "string" && entry.method === "recovery");
      const recoveryTimestamp = typeof recovery === "string" ? undefined : recovery?.timestamp;
      if (!recoveryTimestamp || Date.now() / 1000 - recoveryTimestamp > 30 * 60) return false;
      const { data: { user }, error } = await supabase.auth.getUser();
      return !error && Boolean(user);
    } catch {
      return false;
    }
  })();

  return (
    <main className="account-shell">
      <header className="account-header"><Brand /><Link href="/auth">Back to sign in</Link></header>
      <section className="account-layout">
        <div className="account-promise">
          <span className="paper-sprig" aria-hidden="true">❦</span>
          <h2>A new key to your shelf.</h2>
          <p>Set a password you can use to open your account again.</p>
        </div>
        <div className="auth-card">
          {hasRecoverySession ? <ResetPasswordForm /> : (
            <div className="auth-form">
              <h1>Reset link unavailable.</h1>
              <p>We couldn’t verify this password reset link. It may have expired.</p>
              <Link className="button button--primary" href="/auth/forgot-password">Request a new link</Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
