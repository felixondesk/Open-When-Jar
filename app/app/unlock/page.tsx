import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UnlockExperience } from "@/components/UnlockExperience";

export const metadata = { title: "Choose a plan — Open When Jar", robots: { index: false, follow: false } };

export default async function UnlockPage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth");

  const { error: claimError } = await supabase.rpc("claim_plan_invitation");
  if (claimError) throw new Error("Seat invitation could not be claimed");
  const { data: plan, error } = await supabase.rpc("get_plan_status");
  if (error) throw new Error("Plan status is unavailable");
  if (plan) redirect(params.checkout === "returned" ? "/app?checkout=returned" : "/app");

  const checkoutNotice = params.checkout === "returned"
    ? "Dodo returned you to Open When Jar. We’re waiting for its signed confirmation; refresh in a moment if your plan has not appeared."
    : params.checkout === "cancelled"
      ? "Checkout was cancelled. No test plan was activated."
      : undefined;

  return (
    <main className="unlock-shell unlock-shell--v2">
      <UnlockExperience checkoutNotice={checkoutNotice} />
    </main>
  );
}
