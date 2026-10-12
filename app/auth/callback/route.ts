import { NextResponse } from "next/server";
import { getAuthOrigin, getSafeAuthRedirect } from "@/lib/auth-origin";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = getAuthOrigin(request.headers);
  const code = url.searchParams.get("code");
  const next = getSafeAuthRedirect(url.searchParams.get("next"), origin);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: claimsData } = await supabase.auth.getClaims();
      const userId = claimsData?.claims?.sub;
      if (userId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username_finalized")
          .eq("id", userId)
          .single();
        if (profile && !profile.username_finalized) {
          return NextResponse.redirect(new URL("/auth/username", origin));
        }
      }
      return NextResponse.redirect(next);
    }

    // Keep provider/PKCE details out of the browser response. During local
    // debugging, log only the non-secret error metadata so a failed OAuth
    // exchange can be diagnosed without exposing the one-time auth code.
    if (process.env.NODE_ENV !== "production") {
      console.error("[auth/callback] code exchange failed", {
        name: error.name,
        status: error.status,
        code: error.code,
        message: error.message,
      });
    }
  }

  return NextResponse.redirect(new URL("/auth?error=confirmation", origin));
}
