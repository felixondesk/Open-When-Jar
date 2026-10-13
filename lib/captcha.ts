// Turnstile site keys are public identifiers. The secret lives only in Supabase Auth.
export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim()
  || "0x4AAAAAAFVOPDwfedASbpqe";

export function getCaptchaToken(formData: FormData): string | null {
  const value = formData.get("captchaToken");
  return typeof value === "string" && value.length > 0 && value.length <= 2048
    && !/\s/.test(value) ? value : null;
}
