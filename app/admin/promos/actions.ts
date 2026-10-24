"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminAccess } from "@/lib/admin";

export type PromoCodeState = { error?: string; success?: string };

export async function savePromoCodeAction(_previous: PromoCodeState, formData: FormData): Promise<PromoCodeState> {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const percentOff = Number(formData.get("percentOff"));
  const maxRedemptions = Number(formData.get("maxRedemptions"));
  const validUntil = String(formData.get("validUntil") ?? "");
  const status = String(formData.get("status") ?? "");
  if (id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return { error: "This promo code no longer exists." };
  if (!name || name.length > 80) return { error: "Enter a promo name of up to 80 characters." };
  if (!id && !/^[A-Z0-9_-]{3,30}$/.test(code)) return { error: "Codes use 3–30 letters, numbers, - or _." };
  if (!Number.isInteger(percentOff) || percentOff < 1 || percentOff > 99) return { error: "Discount must be a whole number from 1 to 99%." };
  if (!Number.isInteger(maxRedemptions) || maxRedemptions < 1 || maxRedemptions > 1_000_000) return { error: "User cap must be a whole number from 1 to 1,000,000." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(validUntil) || Number.isNaN(Date.parse(validUntil))) return { error: "Choose a valid till date." };
  if (status !== "active" && status !== "inactive") return { error: "Choose a status." };

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!getAdminAccess(claimsData?.claims as Record<string, unknown> | undefined).isAdmin) return { error: "Admin MFA is required." };
  const { error } = await supabase.rpc("admin_upsert_promo_code", {
    p_id: id || null,
    p_name: name,
    p_code: code,
    p_percent_off: percentOff,
    p_valid_until: validUntil,
    p_status: status,
    p_max_redemptions: maxRedemptions,
  });
  if (error) return { error: error.message.includes("PROMO_CODE_TAKEN") ? "That code already exists." : "The promo code could not be saved. Please try again." };
  revalidatePath("/admin/promos");
  if (id) redirect("/admin/promos");
  return { success: `${code} created.` };
}
