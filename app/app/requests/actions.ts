"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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
  revalidatePath("/app/requests");
  revalidatePath("/admin/requests");
  return { reference: data };
}

export type ReplyFormState = { error?: string; success?: string };

export async function replyToRequestAction(_previous: ReplyFormState, formData: FormData): Promise<ReplyFormState> {
  const requestId = String(formData.get("requestId") ?? "");
  const message = String(formData.get("message") ?? "").trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId) || !message || message.length > 2000) {
    return { error: "Write a reply of 1 to 2,000 characters." };
  }
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return { error: "Sign in again to reply." };
  const { error } = await supabase.rpc("reply_to_support_request", { p_request_id: requestId, p_message: message });
  if (error?.message.includes("REPLY_LIMIT_REACHED")) return { error: "You have sent twenty replies in the past 24 hours. Please try again later." };
  if (error) return { error: "Your reply could not be sent. Check the request status and try again." };
  revalidatePath("/app/requests");
  revalidatePath(`/app/requests/${requestId}`);
  revalidatePath("/admin/requests");
  revalidatePath(`/admin/requests/${requestId}`);
  return { success: "Reply sent. Support will review it." };
}
