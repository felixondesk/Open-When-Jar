const isDevelopment = process.env.NODE_ENV !== "production";
const supabaseOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
  } catch {
    return "";
  }
})();

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "img-src 'self' blob: data:",
      "media-src 'self' blob:",
      "style-src 'self' 'unsafe-inline'",
      `script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com${isDevelopment ? " 'unsafe-eval'" : ""}`,
      "frame-src https://challenges.cloudflare.com",
      `connect-src 'self'${supabaseOrigin ? ` ${supabaseOrigin}` : ""}`,
      "font-src 'self' data:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

if (!isDevelopment) {
  securityHeaders.push({ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" });
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  agentRules: false,
  poweredByHeader: false,
  ...(isDevelopment ? { allowedDevOrigins: ["192.168.0.2", "192.168.0.6", "10.0.2.2"] } : {}),
  experimental: {
    serverActions: { bodySizeLimit: "5mb" },
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
