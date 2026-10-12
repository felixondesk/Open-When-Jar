const DEVELOPMENT_HOSTS = new Set(["localhost", "127.0.0.1", "192.168.0.2", "192.168.0.6", "10.0.2.2"]);

export function getSafeAuthRedirect(value: string | null, origin: string) {
  const fallback = new URL("/app", origin);
  if (!value?.startsWith("/") || /[\\\u0000-\u0020\u007f]/.test(value)) return fallback;
  try {
    const target = new URL(value, origin);
    return target.origin === fallback.origin && !target.username && !target.password ? target : fallback;
  } catch {
    return fallback;
  }
}

export function getAuthOrigin(headers: Pick<Headers, "get">) {
  const configured = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3127");
  const host = headers.get("host")?.trim();
  if (!host) return configured.origin;

  try {
    const requested = new URL(`${configured.protocol}//${host}`);
    const isConfiguredHost = requested.host.toLowerCase() === configured.host.toLowerCase();
    const isDevelopmentHost = process.env.NODE_ENV !== "production"
      && requested.port === configured.port
      && DEVELOPMENT_HOSTS.has(requested.hostname.toLowerCase());
    return isConfiguredHost || isDevelopmentHost ? requested.origin : configured.origin;
  } catch {
    return configured.origin;
  }
}
