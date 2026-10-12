import Link from "next/link";
import { redirect } from "next/navigation";
import { signOutAction } from "@/app/auth/actions";
import { getAdminAccess } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Records — Open When Jar Admin", robots: { index: false, follow: false } };

type Kind = "jars" | "orders" | "people";
const STATUSES: Record<Kind, string[]> = {
  jars: ["draft", "sealed", "ending_soon", "hosting_ended"],
  orders: ["created", "pending", "succeeded", "failed", "cancelled", "refunded"],
  people: [],
};

export default async function AdminRecordsPage({ searchParams }: { searchParams: Promise<{ kind?: string; status?: string; q?: string; page?: string }> }) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect("/admin");
  if (!getAdminAccess(claimsData?.claims as Record<string, unknown> | undefined).isAdmin) {
    return <main className="admin-gate"><section><h1>Admin MFA required</h1><Link href="/admin">Go to admin sign-in</Link><form action={signOutAction}><button type="submit">Sign out</button></form></section></main>;
  }
  const params = await searchParams;
  const kind: Kind = params.kind === "orders" || params.kind === "people" ? params.kind : "jars";
  const status = params.status && STATUSES[kind].includes(params.status) ? params.status : null;
  const query = (params.q ?? "").trim().slice(0, 80);
  const parsedPage = Number(params.page);
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? Math.min(parsedPage, 4001) : 1;
  const { data, error } = await supabase.rpc("admin_browse_records", { p_kind: kind, p_status: status, p_query: query, p_offset: (page - 1) * 25 });
  const result = data && typeof data === "object" && !Array.isArray(data) ? data : null;
  const rows = Array.isArray(result?.rows) ? result.rows.filter(isRow) : [];
  const total = typeof result?.total === "number" ? result.total : 0;
  const href = (overrides: Record<string, string | null>) => {
    const values = { kind, ...(status ? { status } : {}), ...(query ? { q: query } : {}), page: String(page), ...overrides };
    return `/admin/records?${new URLSearchParams(Object.entries(values).filter((entry): entry is [string, string] => entry[1] !== null))}`;
  };
  return <main className="admin-requests-page admin-records-page">
    <header><div><Link href="/admin">← Dashboard</Link><h1>{kind[0].toUpperCase() + kind.slice(1)}</h1><p>Operational metadata only. Results are paginated in groups of 25.</p></div><span>{total} matching</span></header>
    <nav aria-label="Record type">{(["jars", "orders", "people"] as const).map((item) => <Link aria-current={item === kind ? "page" : undefined} href={`/admin/records?kind=${item}`} key={item}>{item}</Link>)}</nav>
    <form method="get" className="admin-record-search"><input type="hidden" name="kind" value={kind} />{status ? <input type="hidden" name="status" value={status} /> : null}<label htmlFor="record-query">Search ID or username</label><input id="record-query" name="q" maxLength={80} defaultValue={query} /><button className="button button--secondary" type="submit">Search</button></form>
    {STATUSES[kind].length ? <nav aria-label="Status filters"><Link aria-current={!status ? "page" : undefined} href={href({ status: null, page: "1" })}>all</Link>{STATUSES[kind].map((item) => <Link aria-current={status === item ? "page" : undefined} href={href({ status: item, page: "1" })} key={item}>{item.replaceAll("_", " ")}</Link>)}</nav> : null}
    {error || !result ? <p className="dashboard-notice field-error" role="alert">Records are unavailable. Please try again.</p> : <div className="admin-panel admin-table-wrap"><table className="admin-table"><thead><tr>{headers(kind).map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={String(row.id)}>{cells(kind, row).map((cell, index) => <td key={index}>{cell}</td>)}</tr>)}</tbody></table>{!rows.length ? <p className="admin-request-empty">No records match this search.</p> : null}</div>}
    <footer>{page > 1 ? <Link href={href({ page: String(page - 1) })}>Previous</Link> : null}{page * 25 < total ? <Link href={href({ page: String(page + 1) })}>Next</Link> : null}</footer>
  </main>;
}

function isRow(value: unknown): value is Record<string, string | number | null> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value) && typeof (value as Record<string, unknown>).id === "string");
}

function headers(kind: Kind) {
  return kind === "jars" ? ["Jar", "Creator", "Plan", "Status", "Recipients", "Created", "Hosting ends"]
    : kind === "orders" ? ["Order", "Person", "Plan", "Status", "Amount", "Created"]
    : ["Person", "Username", "Jars created", "Jars received", "Joined"];
}

function cells(kind: Kind, row: Record<string, string | number | null>) {
  const date = (value: string | number | null) => typeof value === "string" && !Number.isNaN(Date.parse(value)) ? new Date(value).toLocaleDateString("en-US", { timeZone: "UTC" }) : "—";
  if (kind === "jars") return [String(row.id).slice(0, 8), `@${row.creator_username}`, String(row.plan_code), String(row.status), String(row.recipient_count), date(row.created_at), date(row.hosting_ends_at)];
  if (kind === "orders") return [String(row.id).slice(0, 8), `@${row.username}`, String(row.plan_code), String(row.status), amount(row.amount_cents, row.currency), date(row.created_at)];
  return [String(row.display_name), `@${row.username}`, String(row.jars_created), String(row.jars_received), date(row.created_at)];
}

function amount(value: string | number | null, currency: string | number | null) {
  if (typeof value !== "number" || (currency !== "USD" && currency !== "INR")) return "—";
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", { style: "currency", currency }).format(value / 100);
}
