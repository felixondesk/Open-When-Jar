import { NextResponse } from "next/server";
import { getAuthOrigin } from "@/lib/auth-origin";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = getAuthOrigin(request.headers);
  const code = url.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const claimsResult = await supabase.auth.getClaims().catch(() => null);
      const claimsData = claimsResult?.data;
      if (!claimsData?.claims) {
        await supabase.auth.signOut({ scope: "local" }).catch(() => null);
        return NextResponse.redirect(new URL("/auth?error=confirmation", origin));
      }
      const recovery = claimsData.claims.amr?.some((entry) => typeof entry !== "string" && entry.method === "recovery");
      if (recovery) {
        const response = NextResponse.redirect(new URL("/auth/reset-password", origin));
        response.headers.set("Cache-Control", "private, no-store");
        return response;
      }
      // Confirmation creates a session. End only this session so the user can
      // see the verified message on the sign-in page.
      const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });
      if (!signOutError) {
        return NextResponse.redirect(new URL("/auth?verified=1", origin));
      }
      if (process.env.NODE_ENV !== "production") {
        console.error("[auth/confirm] local sign out failed", {
          name: signOutError.name,
          status: signOutError.status,
          code: signOutError.code,
        });
      }
      return NextResponse.redirect(new URL("/app", origin));
    }
    if (process.env.NODE_ENV !== "production") {
      console.error("[auth/confirm] code exchange failed", {
        name: error.name,
        status: error.status,
        code: error.code,
      });
    }
  }

  return NextResponse.redirect(new URL("/auth?error=confirmation", origin));
}
