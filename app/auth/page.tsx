import Link from "next/link";
import { redirect } from "next/navigation";
import { signOutAction } from "@/app/auth/actions";
import { AuthForms } from "@/components/AuthForms";
import { Brand, Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Sign in — Open When Jar",
  robots: { index: false, follow: false },
};

export default async function AuthPage({ searchParams }: { searchParams: Promise<{ error?: string; mode?: string; password?: string; verified?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims?.sub) {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("username_finalized")
      .eq("id", data.claims.sub)
      .single();
    if (error || !profile) {
      return (
        <main className="account-shell">
          <header className="account-header"><Brand /><Link href="/">Back home</Link></header>
          <section className="account-layout">
            <div className="account-promise">
              <span className="paper-sprig" aria-hidden="true">❦</span>
              <h2>A shelf for everything you send and receive.</h2>
              <p>Your account is signed in, but we couldn’t load the profile needed to open your shelf.</p>
            </div>
            <div className="auth-card">
              <div className="auth-form">
                <h1>Let’s try that again.</h1>
                <p role="alert">Refresh to try again. If this keeps happening, sign out and contact support.</p>
                <Link className="button button--secondary" href="/auth?error=profile">Try again</Link>
                <form action={signOutAction}>
                  <Button type="submit" variant="ghost">Sign out</Button>
                </form>
              </div>
            </div>
          </section>
        </main>
      );
    }
    redirect(!profile.username_finalized ? "/auth/username" : "/app");
  }
  const errorMessage = params.error === "age"
    ? "Confirm that you are at least 18 to create an account."
    : params.error === "google"
      ? "Google sign-in could not start. Please try again or use email."
      : params.error === "profile"
        ? "We couldn’t load your profile. Sign in again or contact support if this continues."
      : params.error
        ? "That email link couldn’t be completed. Sign in or request a new password reset link."
        : null;

  return (
    <main className="account-shell">
      <header className="account-header"><Brand /><Link href="/">Back home</Link></header>
      <section className="account-layout">
        <div className="account-promise">
          <span className="paper-sprig" aria-hidden="true">❦</span>
          <h2>A shelf for everything you send and receive.</h2>
          <p>Choose a username friends can find. Your email stays private and is never used to address a gift.</p>
          <div className="free-jar-note"><strong>Your shelf stays private.</strong><span>Invited to a plan? Use the invited email and your seat will be added when you sign in.</span></div>
        </div>
        <div>
          {params.verified === "1" ? <p className="auth-success" role="status">Your account has been verified. Sign in to open your shelf.</p> : null}
          {params.password === "updated" ? <p className="auth-success" role="status">Your password has been updated. Sign in with your new password.</p> : null}
          {errorMessage ? <p className="field-error" role="alert">{errorMessage}</p> : null}
          <AuthForms initialMode={params.mode === "signup" ? "signup" : "signin"} />
        </div>
      </section>
    </main>
  );
}
