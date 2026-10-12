"use server";

import { createClient } from "@/lib/supabase/server";

export type RequestFormState = { error?: string; reference?: string };

const CATEGORIES = new Set(["support", "access", "correction", "export", "deletion", "refund", "abuse", "privacy"]);

export async function submitRequestAction(_previous: RequestFormState, formData: FormData): Promise<RequestFormState> {
  const category = String(formData.get("category") ?? "");
  const details = String(formData.get("details") ?? "").trim();
  if (!CATEGORIES.has(category) || details.length < 10 || details.length > 2000) {
    return { error: "Choose a request type and write 10 to 2,000 characters." };
  }
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return { error: "Sign in again to submit your request." };
  const { data, error } = await supabase.rpc("submit_support_request", { p_category: category, p_details: details });
  if (error?.message.includes("REQUEST_LIMIT_REACHED")) return { error: "You have submitted five requests in the past 24 hours. Please try again later." };
  if (error || !data) return { error: "Your request could not be submitted. Please try again." };
  return { reference: data };
}
