"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function toggleFavouriteAction(formData: FormData) {
  const envelopeId = String(formData.get("envelopeId") ?? "");
  const jarId = String(formData.get("jarId") ?? "");
  const nextFavourite = String(formData.get("nextFavourite")) === "true";
  if (!envelopeId || !jarId) return;

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/auth");

  const { error } = await supabase.from("recipient_envelope_state").upsert({
    recipient_id: userId,
    envelope_id: envelopeId,
    favourite: nextFavourite,
    opened_at: new Date().toISOString(),
  });
  if (error) redirect(`/app/jars/${jarId}?error=state`);
  revalidatePath(`/app/jars/${jarId}`);
}
