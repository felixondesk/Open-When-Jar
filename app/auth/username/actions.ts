"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type UsernameFormState = { error?: string };

const USERNAME_PATTERN = /^[a-z][a-z0-9_]{2,29}$/;

export async function claimUsernameAction(
  _previousState: UsernameFormState,
  formData: FormData,
): Promise<UsernameFormState> {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const displayName = String(formData.get("displayName") ?? "").trim();

  if (formData.get("ageConfirmed") !== "on") {
    return { error: "Confirm that you are at least 18 to create an account." };
  }
  if (!USERNAME_PATTERN.test(username)) {
    return { error: "Username must be 3–30 characters and use lowercase letters, numbers, or underscores." };
  }
  if (!displayName || displayName.length > 60) {
    return { error: "Enter the name people should see." };
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect("/auth");

  const { error } = await supabase.rpc("claim_username", {
    p_username: username,
    p_display_name: displayName,
  });

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("duplicate") || message.includes("unique")) {
      return { error: "That username is already taken. Try another one." };
    }
    if (message.includes("finalized")) redirect("/app");
    return { error: "We couldn’t save that username. Please try again." };
  }

  redirect("/app");
}
