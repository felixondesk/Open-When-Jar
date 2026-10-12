import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function getRequestOrigin(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const originHeader = request.headers.get("origin");
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0].trim();
  const hostHeader = request.headers.get("host");
  const requestHosts = [hostHeader, forwardedHost]
    .filter((host): host is string => Boolean(host))
    .map((host) => host.toLowerCase());

  for (const candidate of [originHeader, request.headers.get("referer")]) {
    if (!candidate) continue;
    try {
      const origin = new URL(candidate);
      if (requestHosts.includes(origin.host.toLowerCase())) return origin.origin;
    } catch {
      // Try the next browser-provided origin hint.
    }
  }

  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0].trim();
  const protocol = forwardedProtocol || requestUrl.protocol.slice(0, -1);
  if (forwardedHost && forwardedHost.toLowerCase() !== requestUrl.host.toLowerCase()) {
    return `${protocol}://${forwardedHost}`;
  }
  if (hostHeader && hostHeader.toLowerCase() !== requestUrl.host.toLowerCase()) {
    return `${protocol}://${hostHeader}`;
  }
  return requestUrl.origin;
}

function redirectToAuth(request: NextRequest) {
  const url = new URL("/auth?error=google", getRequestOrigin(request));
  return NextResponse.redirect(url, 303);
}

async function getProviderUrl(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: new URL("/auth/callback", getRequestOrigin(request)).toString(),
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
