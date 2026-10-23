import { NextRequest, NextResponse } from "next/server";
import { getAuthOrigin } from "@/lib/auth-origin";
import { createClient } from "@/lib/supabase/server";

function redirectToAuth(request: NextRequest) {
  const url = new URL("/auth?error=google", getAuthOrigin(request.headers));
  return NextResponse.redirect(url, 303);
}

async function getProviderUrl(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: new URL("/auth/callback", getAuthOrigin(request.headers)).toString(),
      },
    });
    if (error || !data.url) return null;

    const destination = new URL(data.url);
    const configuredSupabaseOrigin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin;
    return destination.origin === configuredSupabaseOrigin ? destination.toString() : null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const providerUrl = await getProviderUrl(request);
  return providerUrl
    ? NextResponse.redirect(providerUrl, 303)
    : redirectToAuth(request);
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "google" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  if (!body || typeof body !== "object" || !("oauthIntent" in body) || body.oauthIntent !== "signup") {
    return NextResponse.json({ error: "google" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  if (!("ageConfirmed" in body) || body.ageConfirmed !== true) {
    return NextResponse.json({ error: "age" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const providerUrl = await getProviderUrl(request);
  if (!providerUrl) {
    return NextResponse.json({ error: "google" }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json({ url: providerUrl }, { headers: { "Cache-Control": "no-store" } });
}
