import Link from "next/link";
import { redirect } from "next/navigation";
import { signOutAction } from "@/app/auth/actions";
import { getAdminAccess } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { PromoCodeForm, type PromoCode } from "./PromoCodeForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Promo codes — Open When Jar Admin", robots: { index: false, follow: false } };

type PromoRow = PromoCode & { redemptions: number };

export default async function AdminPromosPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect("/admin");
  if (!getAdminAccess(claimsData?.claims as Record<string, unknown> | undefined).isAdmin) {
    return <main className="admin-gate"><section><h1>Admin MFA required</h1><Link href="/admin">Go to admin sign-in</Link><form action={signOutAction}><button type="submit">Sign out</button></form></section></main>;
  }
  const { data, error } = await supabase.rpc("admin_list_promo_codes");
  const rows = Array.isArray(data) ? data.filter(isPromoRow) : [];
  const today = new Date().toISOString().slice(0, 10);
  return <main className="admin-requests-page admin-records-page">
    <header><div><Link href="/admin">← Dashboard</Link><h1>Promo codes</h1><p>Percentage discounts for plan checkout. Each account can use a code once; the user cap counts paid uses plus checkouts open in the last 24 hours.</p></div><span>{rows.length} codes</span></header>
    <section className="admin-panel"><h2>New promo code</h2><PromoCodeForm /></section>
    {error ? <p className="dashboard-notice field-error" role="alert">Promo codes are unavailable. Please try again.</p> : <div className="admin-panel admin-table-wrap"><table className="admin-table">
      <thead><tr>{["Name", "Code", "Discount", "Valid till", "Status", "Used / cap", ""].map((header) => <th key={header}>{header}</th>)}</tr></thead>
      <tbody>{rows.map((row) => <tr key={row.id}>
        <td>{row.name}</td><td><code>{row.code}</code></td><td>{row.percent_off}%</td><td>{row.valid_until}</td>
        <td>{row.status === "active" && row.valid_until < today ? "expired" : row.status}</td><td>{row.redemptions} / {row.max_redemptions}</td>
        <td><details><summary>Edit</summary><PromoCodeForm promo={row} /></details></td>
      </tr>)}</tbody>
    </table>{!rows.length ? <p className="admin-request-empty">No promo codes yet.</p> : null}</div>}
  </main>;
}

function isPromoRow(value: unknown): value is PromoRow {
  const row = value as Record<string, unknown> | null;
  return Boolean(row && typeof row === "object" && typeof row.id === "string" && typeof row.code === "string" && typeof row.percent_off === "number");
}
