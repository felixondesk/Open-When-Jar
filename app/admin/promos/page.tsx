import Link from "next/link";
import { redirect } from "next/navigation";
import { signOutAction } from "@/app/auth/actions";
import { getAdminAccess } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { PromoCodesView, type PromoRow } from "./PromoCodesView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Promo codes — Open When Jar Admin", robots: { index: false, follow: false } };

export default async function AdminPromosPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect("/admin");
  if (!getAdminAccess(claimsData?.claims as Record<string, unknown> | undefined).isAdmin) {
    return <main className="admin-gate"><section><h1>Admin MFA required</h1><Link href="/admin">Go to admin sign-in</Link><form action={signOutAction}><button type="submit">Sign out</button></form></section></main>;
  }
  const { data, error } = await supabase.rpc("admin_list_promo_codes");
  const rows = Array.isArray(data) ? data.filter(isPromoRow) : [];
  const { edit } = await searchParams;
  const editing = rows.find((row) => row.id === edit);
  return <PromoCodesView rows={rows} editing={editing} error={Boolean(error)} />;
}

function isPromoRow(value: unknown): value is PromoRow {
  const row = value as Record<string, unknown> | null;
  return Boolean(row && typeof row === "object" && typeof row.id === "string" && typeof row.code === "string" && typeof row.percent_off === "number");
}
