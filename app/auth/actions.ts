"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getAuthOrigin } from "@/lib/auth-origin";
import { createClient } from "@/lib/supabase/server";
import { getCaptchaToken } from "@/lib/captcha";

export type AuthFormState = {
  error?: string;
};

export type PasswordFormState = {
  error?: string;
  success?: string;
};

const USERNAME_PATTERN = /^[a-z][a-z0-9_]{2,29}$/;

function redactSignupValues(message: string, values: string[]) {
  return values.filter(Boolean).reduce((result, value) => {
    const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return result.replace(new RegExp(escapedValue, "gi"), "[redacted]");
  }, message).slice(0, 240);
}

export async function signUpAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const captchaToken = getCaptchaToken(formData);
  if (!captchaToken) return { error: "Complete the security check and try again." };
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const displayName = String(formData.get("displayName") ?? "").trim();

  if (formData.get("ageConfirmed") !== "on") return { error: "Confirm that you are at least 18 to create an account." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Enter a valid email address." };
  if (password.length < 8) return { error: "Use at least 8 characters for your password." };
  if (!USERNAME_PATTERN.test(username)) {
    return { error: "Username must be 3–30 characters and use lowercase letters, numbers, or underscores." };
  }
  if (!displayName || displayName.length > 60) return { error: "Enter the name people should see." };

  const emailRedirectTo = new URL(
    "/auth/confirm",
    getAuthOrigin(await headers()),
  ).toString();
  const supabase = await createClient();
  let signupResult: Awaited<ReturnType<typeof supabase.auth.signUp>>;
  try {
    signupResult = await supabase.auth.signUp({
      email,
      password,
      options: {
        captchaToken,
        emailRedirectTo,
        data: { username, display_name: displayName },
      },
    });
  } catch {
    return { error: "We couldn’t reach the account service. Check your connection and try again." };
  }

  const { data, error } = signupResult;

  if (error) {
    if (process.env.NODE_ENV === "development") {
      const diagnostic = JSON.stringify({
        name: error.name,
        status: error.status ?? null,
        code: error.code ?? null,
        message: redactSignupValues(error.message, [email, password, username, displayName]),
      });
      console.error(`[auth/signup] Supabase rejected signup ${diagnostic}`);
    }

    const normalizedError = error.message.toLowerCase();
    const message = normalizedError.includes("already registered") || normalizedError.includes("already exists")
      ? "This email is already registered. Use a different email to create an account, or sign in."
      : normalizedError.includes("database error") || normalizedError.includes("duplicate") || normalizedError.includes("username")
        ? "That username may already be taken. Try another one."
        : normalizedError.includes("rate")
          ? "Too many attempts. Wait a little and try again."
          : "We couldn’t create that account. Check the details or try another username.";
    return { error: message };
  }

  if (data.session) redirect("/app");
  if (data.user?.identities?.length === 0) {
    return { error: "This email is already registered. Use a different email to create an account, or sign in." };
  }
  if (!data.user) return { error: "We couldn’t create that account. Please try again." };
  redirect("/auth/check-email");
}

export async function signInAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const captchaToken = getCaptchaToken(formData);
  if (!captchaToken) return { error: "Complete the security check and try again." };
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password, options: { captchaToken } });

  if (error) return { error: "That email and password didn’t match." };
  redirect("/app");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function forgotPasswordAction(
  _previousState: PasswordFormState,
  formData: FormData,
): Promise<PasswordFormState> {
  const captchaToken = getCaptchaToken(formData);
  if (!captchaToken) return { error: "Complete the security check and try again." };
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Enter a valid email address." };

  const redirectTo = new URL("/auth/confirm", getAuthOrigin(await headers())).toString();
  const supabase = await createClient();
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo, captchaToken });
    if (error) return { error: "We couldn’t send a reset link right now. Please try again later." };
  } catch {
    return { error: "We couldn’t reach the account service. Check your connection and try again." };
  }

  return { success: "If an account exists for that email, we’ve sent a password reset link. Check your inbox." };
}

export async function updatePasswordAction(
  _previousState: PasswordFormState,
  formData: FormData,
): Promise<PasswordFormState> {
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  if (!currentPassword) return { error: "Enter your current password." };
  if (password.length < 8) return { error: "Use at least 8 characters for your new password." };
  if (password !== confirmPassword) return { error: "The new passwords don’t match." };
  if (password === currentPassword) return { error: "Choose a new password that is different from your current password." };

  const supabase = await createClient();
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return { error: "Your session has ended. Sign in and try again." };
    if (!user.identities?.some((identity) => identity.provider === "email")) {
      return { error: "This account uses another sign-in method." };
    }

    const { error } = await supabase.auth.updateUser({ password, current_password: currentPassword });
    if (error?.code === "weak_password") return { error: "Choose a stronger password and try again." };
    if (error?.code === "reauthentication_needed") {
      return { error: "For security, use the password reset link from the sign-in page." };
    }
    if (error) return { error: "We couldn’t update your password. Check your current password and try again." };
  } catch {
    return { error: "We couldn’t reach the account service. Check your connection and try again." };
  }

  return { success: "Your password has been updated." };
}

export async function resetPasswordAction(
  _previousState: PasswordFormState,
  formData: FormData,
): Promise<PasswordFormState> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  if (password.length < 8) return { error: "Use at least 8 characters for your new password." };
  if (password !== confirmPassword) return { error: "The new passwords don’t match." };

  const supabase = await createClient();
  try {
    const { data: claimsData } = await supabase.auth.getClaims();
    const recovery = claimsData?.claims?.amr?.find((entry) => typeof entry !== "string" && entry.method === "recovery");
    const recoveryTimestamp = typeof recovery === "string" ? undefined : recovery?.timestamp;
    if (!recoveryTimestamp || Date.now() / 1000 - recoveryTimestamp > 30 * 60) {
      return { error: "This reset link is no longer valid. Request a new one." };
    }
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return { error: "This reset link is no longer valid. Request a new one." };

    const { error } = await supabase.auth.updateUser({ password });
    if (error?.code === "weak_password") return { error: "Choose a stronger password and try again." };
    if (error) return { error: "We couldn’t reset your password. Request a new link and try again." };
  } catch {
    return { error: "We couldn’t reach the account service. Check your connection and try again." };
  }
  try {
    const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });
    if (signOutError) return { success: "Your password was updated. Please sign out before signing in again." };
  } catch {
    return { success: "Your password was updated. Please sign out before signing in again." };
  }
  redirect("/auth?password=updated");
}
