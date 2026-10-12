import { redirect } from "next/navigation";
import { JarDemo } from "@/components/demo/JarDemo";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Demo — Open When Jar", robots: { index: false, follow: false } };

export default async function DemoPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("id", userId)
    .single();
  if (error || !profile) redirect("/auth?error=profile");

  return (
    <main className="demo-shell">
      <JarDemo displayName={profile.display_name} username={profile.username} />
    </main>
  );
}
