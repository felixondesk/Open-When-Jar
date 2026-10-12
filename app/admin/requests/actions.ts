"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAdminAccess } from "@/lib/admin";

export type UpdateRequestState = { error?: string; success?: string };
const STATUSES = new Set(["triaged", "waiting_on_user", "in_progress", "resolved", "rejected"]);

export async function updateRequestAction(_previous: UpdateRequestState, formData: FormData): Promise<UpdateRequestState> {
  const requestId = String(formData.get("requestId") ?? "");
  const status = String(formData.get("status") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(requestId) || !STATUSES.has(status) || !note || note.length > 1000) {
    return { error: "Choose a new status and add a decision note of up to 1,000 characters." };
  }
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!getAdminAccess(claimsData?.claims as Record<string, unknown> | undefined).isAdmin) return { error: "Admin MFA is required." };
  const { error } = await supabase.rpc("admin_update_support_request", { p_request_id: requestId, p_status: status, p_note: note });
  if (error) return { error: "The request could not be updated. Check its current status and try again." };
  revalidatePath("/admin/requests");
  return { success: "Status saved. Refresh to see the updated queue." };
}
