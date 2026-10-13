import Link from "next/link";
import { redirect } from "next/navigation";
import { signOutAction } from "@/app/auth/actions";
import { getAdminAccess } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { UpdateRequestForm } from "./UpdateRequestForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Request inbox — Open When Jar Admin", robots: { index: false, follow: false } };

type RequestRow = {
  id: string;
  requester_id: string | null;
  username: string | null;
  category: string;
  details: string;
  status: string;
  source: "app" | "email";
  contact_email: string | null;
  subject: string | null;
  created_at: string;
};

export default async function AdminRequestsPage({ searchParams }: { searchParams: Promise<{ status?: string; category?: string; page?: string }> }) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect("/admin");
  const access = getAdminAccess(claimsData?.claims as Record<string, unknown> | undefined);
  if (!access.isAdmin) return <main className="admin-gate"><section><h1>Admin MFA required</h1><p>Sign in with your admin account and complete two-step verification.</p><Link href="/admin">Go to admin sign-in</Link><form action={signOutAction}><button type="submit">Sign out</button></form></section></main>;
  const params = await searchParams;
  const allowed = new Set(["new", "triaged", "waiting_on_user", "in_progress", "resolved", "rejected"]);
  const status = params.status && allowed.has(params.status) ? params.status : null;
  const categories = ["support", "access", "correction", "export", "deletion", "refund", "abuse", "privacy"];
  const category = params.category && categories.includes(params.category) ? params.category : null;
  const parsedPage = Number(params.page);
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? Math.min(parsedPage, 4001) : 1;
  const { data, error } = await supabase.rpc("admin_list_support_requests", { p_status: status, p_offset: (page - 1) * 25, p_category: category });
  const result = data && typeof data === "object" && !Array.isArray(data) ? data : null;
  const rows = Array.isArray(result?.rows) ? result.rows.filter(isRequestRow) : [];
  const total = typeof result?.total === "number" ? result.total : 0;
  const query = (nextPage: number) => `/admin/requests?${new URLSearchParams({ ...(status ? { status } : {}), ...(category ? { category } : {}), page: String(nextPage) })}`;
  return <main className="admin-requests-page">
    <header><div><Link href="/admin">← Dashboard</Link><h1>Request inbox</h1><p>Authenticated account requests and manual review. Private Jar contents are not shown.</p></div><span>{total} matching</span></header>
    <nav aria-label="Request category queues">{[null, ...categories].map((item) => <Link aria-current={item === category ? "page" : undefined} href={`/admin/requests?${new URLSearchParams({ ...(item ? { category: item } : {}), ...(status ? { status } : {}) })}`} key={item ?? "all"}>{item ? item.replaceAll("_", " ") : "all requests"}</Link>)}</nav>
    <nav aria-label="Request status filters">{[null, ...allowed].map((item) => <Link aria-current={item === status ? "page" : undefined} href={`/admin/requests?${new URLSearchParams({ ...(category ? { category } : {}), ...(item ? { status: item } : {}) })}`} key={item ?? "all"}>{item ? item.replaceAll("_", " ") : "all statuses"}</Link>)}</nav>
    {error || !result ? <p className="dashboard-notice field-error" role="alert">The inbox is unavailable. Please check that the request migration is deployed.</p> : rows.length ? <div className="admin-request-list">{rows.map((row) => <article key={row.id}>
      <div><strong>{row.category}</strong><span>{row.source === "email" ? "email" : "in-app"} · {row.status.replaceAll("_", " ")}</span></div>
      <p>{row.contact_email ? `From ${row.contact_email}` : row.username ? `@${row.username}` : "Account unavailable"} · {new Date(row.created_at).toLocaleString("en-US", { timeZone: "UTC" })} UTC · <Link href={`/admin/requests/${row.id}`}>Case {row.id.slice(0, 8)} and history</Link></p>
      {row.subject ? <p><strong>{row.subject}</strong></p> : null}
      <p className="admin-request-details">{row.details}</p>
      <UpdateRequestForm id={row.id} currentStatus={row.status} canMessage={row.requester_id !== null && row.source === "app"} />
    </article>)}</div> : <p className="admin-request-empty">No requests match this filter.</p>}
    <footer>{page > 1 ? <Link href={query(page - 1)}>Previous</Link> : null}{page * 25 < total ? <Link href={query(page + 1)}>Next</Link> : null}</footer>
  </main>;
}

function isRequestRow(value: unknown): value is RequestRow {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return typeof row.id === "string"
    && (typeof row.requester_id === "string" || row.requester_id === null)
    && (typeof row.username === "string" || row.username === null)
    && typeof row.category === "string"
    && typeof row.details === "string"
    && typeof row.status === "string"
    && (row.source === "app" || row.source === "email")
    && (typeof row.contact_email === "string" || row.contact_email === null)
    && (typeof row.subject === "string" || row.subject === null)
    && typeof row.created_at === "string";
}
