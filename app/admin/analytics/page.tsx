import Link from "next/link";
import { redirect } from "next/navigation";
import { signOutAction } from "@/app/auth/actions";
import { getAdminAccess } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Analytics — Open When Jar Admin", robots: { index: false, follow: false } };

type DailyRow = { day: string; accounts: number; created: number; sealed: number; opens: number };

export default async function AdminAnalyticsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect("/admin");
  if (!getAdminAccess(claimsData?.claims as Record<string, unknown> | undefined).isAdmin) {
    return <main className="admin-gate"><section><h1>Admin MFA required</h1><Link href="/admin">Go to admin sign-in</Link><form action={signOutAction}><button type="submit">Sign out</button></form></section></main>;
  }
  const params = await searchParams;
  const days = params.days === "7" || params.days === "90" ? Number(params.days) : 30;
  const { data, error } = await supabase.rpc("admin_operational_analytics", { p_days: days });
  const result = data && typeof data === "object" && !Array.isArray(data) ? data : null;
  const daily = Array.isArray(result?.daily) ? result.daily.filter(isDailyRow) : [];
  const sandbox = result?.sandbox_payment_statuses && typeof result.sandbox_payment_statuses === "object" && !Array.isArray(result.sandbox_payment_statuses) ? result.sandbox_payment_statuses : {};
  return <main className="admin-requests-page admin-analytics-page">
    <header><div><Link href="/admin">← Dashboard</Link><h1>Analytics</h1><p>First-party operational counts. Dates use UTC. No third-party tracking.</p></div></header>
    <nav aria-label="Analytics range">{[7, 30, 90].map((range) => <Link aria-current={days === range ? "page" : undefined} href={`/admin/analytics?days=${range}`} key={range}>Last {range} days</Link>)}</nav>
    {error || !result ? <p className="dashboard-notice field-error" role="alert">Analytics are unavailable. Please try again.</p> : <>
      <p className="admin-analytics-updated">Updated {typeof result.generated_at === "string" ? new Date(result.generated_at).toLocaleString("en-US", { timeZone: "UTC" }) : "—"} UTC</p>
      <section className="admin-analytics-grid" aria-label="Operational totals">
        <Card label="Accounts joined" value={number(result.accounts_joined)} />
        <Card label="Jars created" value={number(result.jars_created)} />
        <Card label="Jars sealed" value={number(result.jars_sealed)} />
        <Card label="Envelope opens" value={number(result.envelopes_opened)} />
        <Card label="Current plan members" value={number(result.plan_members)} />
        <Card label="Pending invitations" value={number(result.pending_invitations)} />
        <Card label="Unused extra credits" value={number(result.available_extra_credits)} />
      </section>
      <section className="admin-panel admin-analytics-section"><h2>Sandbox payments</h2><p>Test Mode intent counts in this period. These are not sales or revenue.</p><dl>{["pending", "succeeded", "failed", "needs_review"].map((status) => <div key={status}><dt>{status.replaceAll("_", " ")}</dt><dd>{number(sandbox[status])}</dd></div>)}</dl></section>
      <section className="admin-panel admin-analytics-section"><h2>Daily activity</h2><p>Raw event counts by UTC day. An envelope may be opened by more than one recipient.</p><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Day</th><th>New accounts</th><th>Jars created</th><th>Jars sealed</th><th>Envelope opens</th></tr></thead><tbody>{daily.map((row) => <tr key={row.day}><td>{row.day}</td><td>{row.accounts}</td><td>{row.created}</td><td>{row.sealed}</td><td>{row.opens}</td></tr>)}</tbody></table></div></section>
    </>}
  </main>;
}

function number(value: unknown) { return typeof value === "number" && Number.isFinite(value) ? value : 0; }
function Card({ label, value }: { label: string; value: number }) { return <div className="admin-panel"><span>{label}</span><strong>{new Intl.NumberFormat("en-US").format(value)}</strong></div>; }
function isDailyRow(value: unknown): value is DailyRow {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return typeof row.day === "string" && ["accounts", "created", "sealed", "opens"].every((key) => typeof row[key] === "number");
}
