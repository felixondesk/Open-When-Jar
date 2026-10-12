import Link from "next/link";
import { redirect } from "next/navigation";
import { signOutAction } from "@/app/auth/actions";
import { UpdatePasswordForm } from "@/components/PasswordForms";
import { Brand } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Account security — Open When Jar", robots: { index: false, follow: false } };

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect("/auth");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("display_name, username")
    .eq("id", user.id)
    .maybeSingle();
  const hasEmailPassword = user.identities?.some((identity) => identity.provider === "email") ?? false;

  return (
    <main className="account-shell">
      <header className="account-header"><Brand /><Link href="/app">Back to your shelf</Link></header>
      <section aria-labelledby="account-heading" className="account-workspace page-width">
        <header className="account-workspace__heading"><span aria-hidden="true">❦</span><h1 id="account-heading">Your account</h1><p>Your profile and sign-in settings.</p></header>
        <div className="account-workspace__grid">
          <section className="account-card" aria-labelledby="account-profile-heading">
            <h2 id="account-profile-heading">Profile</h2>
            {profileError || !profile ? <p className="field-error" role="alert">We couldn’t load your profile. Refresh and try again.</p> : (
              <dl className="account-details"><div><dt>Name</dt><dd>{profile.display_name}</dd></div><div><dt>Username</dt><dd>@{profile.username}</dd></div></dl>
            )}
            <form action={signOutAction}><button className="button button--secondary" type="submit">Sign out</button></form>
          </section>
          <section className="account-card" aria-labelledby="account-password-heading">
            <h2 id="account-password-heading">Update password</h2>
            {hasEmailPassword ? <><p>Change the password you use to sign in with email.</p><UpdatePasswordForm /></> : (
              <p>This account uses another sign-in method, so it has no email password to update.</p>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
