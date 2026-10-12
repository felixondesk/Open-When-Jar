import { redirect } from "next/navigation";
import { Brand } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { UsernameForm } from "./UsernameForm";

export const metadata = {
  title: "Choose your username — Open When Jar",
  robots: { index: false, follow: false },
};

export default async function UsernamePage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username_finalized")
    .eq("id", userId)
    .single();

  if (!profile) redirect("/auth?error=profile");
  if (profile.username_finalized) redirect("/app");

  return (
    <main className="account-shell">
      <header className="account-header"><Brand linkToHome={false} /></header>
      <section className="username-claim-shell">
        <UsernameForm suggestedName={profile.display_name} />
      </section>
    </main>
  );
}
