import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const intentId = request.nextUrl.searchParams.get("intent");
  if (claimsData?.claims?.sub && intentId && UUID_PATTERN.test(intentId)) {
    await supabase.rpc("fail_dodo_test_payment_intent", { p_intent_id: intentId });
  }

  const returnTo = request.nextUrl.searchParams.get("return") === "account"
    ? "/app?view=account&checkout=cancelled"
    : "/app/unlock?checkout=cancelled";
  return NextResponse.redirect(new URL(returnTo, request.url), { status: 303 });
}
