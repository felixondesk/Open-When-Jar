type EmailConfig = { apiKey: string; from: string; siteUrl: string };

export function getSeatInvitationEmailConfig(): EmailConfig | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.INVITATION_FROM_EMAIL?.trim();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!apiKey || !from || !siteUrl) return null;

  try {
    const url = new URL(siteUrl);
    if (url.protocol !== "https:" && url.hostname !== "localhost") return null;
    return { apiKey, from, siteUrl: url.origin };
  } catch {
    return null;
  }
}

export async function sendSeatInvitationEmail(email: string, config: EmailConfig): Promise<boolean> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.from,
      to: [email],
      subject: "You have a seat on Open When Jar",
      text: `Someone saved a seat for you on Open When Jar. Sign up or sign in with ${email} at ${config.siteUrl}/auth to join their plan and Circle. Each member can send 10 Jars.`,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  return response.ok;
}
