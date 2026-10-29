import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UnlockExperience } from "@/components/UnlockExperience";
import { getPlanStatusOrClaimInvitation } from "@/lib/plan-status";
import { getDefaultMarket, getDodoMode } from "@/lib/dodo-payments";

export const metadata = { title: "Choose a plan — Open When Jar", robots: { index: false, follow: false } };

export default async function UnlockPage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth");

  const plan = await getPlanStatusOrClaimInvitation(
    () => supabase.rpc("get_plan_status"),
    () => supabase.rpc("claim_plan_invitation"),
  );
  if (plan) redirect(params.checkout === "returned" ? "/app?checkout=returned" : "/app");

  const checkoutNotice = params.checkout === "returned"
    ? "Dodo returned you to Open When Jar. We’re waiting for its signed confirmation; refresh in a moment if your plan has not appeared."
    : params.checkout === "cancelled"
      ? "Checkout was cancelled. No plan was activated."
      : undefined;

  return (
    <main className="unlock-shell unlock-shell--v2">
      <UnlockExperience checkoutNotice={checkoutNotice} liveMode={getDodoMode() === "live_mode"} defaultMarket={await getDefaultMarket()} />
    </main>
  );
}
