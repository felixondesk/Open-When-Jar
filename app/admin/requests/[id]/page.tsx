import Link from "next/link";
import { redirect } from "next/navigation";
import { signOutAction } from "@/app/auth/actions";
import { getAdminAccess } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { UpdateRequestForm } from "../UpdateRequestForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Request history — Open When Jar Admin", robots: { index: false, follow: false } };

type Request = {
  id: string;
  requester_id: string | null;
  username: string | null;
  category: string;
  details: string;
  status: string;
  source: "app" | "email";
  contact_email: string | null;
  subject: string | null;
  source_reference: string | null;
  created_at: string;
};
type Event = { id: number; actor_id: string | null; from_status: string | null; to_status: string; note: string | null; occurred_at: string };

export default async function AdminRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect("/admin");
  if (!getAdminAccess(claimsData?.claims as Record<string, unknown> | undefined).isAdmin) {
    return <main className="admin-gate"><section><h1>Admin MFA required</h1><Link href="/admin">Go to admin sign-in</Link><form action={signOutAction}><button type="submit">Sign out</button></form></section></main>;
  }
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return <main className="admin-requests-page"><Link href="/admin/requests">← Inbox</Link><h1>Request not found</h1></main>;
  const { data, error } = await supabase.rpc("admin_support_request_history", { p_request_id: id });
  const result = data && typeof data === "object" && !Array.isArray(data) ? data : null;
  const request = isRequest(result?.request) ? result.request : null;
  const events = Array.isArray(result?.events) ? result.events.filter(isEvent) : [];
  return <main className="admin-requests-page admin-request-detail">
    <Link href="/admin/requests">← Inbox</Link>
    {error ? <p className="dashboard-notice field-error" role="alert">The request history is unavailable.</p> : !request ? <h1>Request not found</h1> : <>
      <h1>{request.category} request</h1>
      <p>{request.contact_email ? `From ${request.contact_email}` : request.username ? `@${request.username}` : "Account unavailable"} · Case {request.id.slice(0, 8)} · Created {new Date(request.created_at).toLocaleString("en-US", { timeZone: "UTC" })} UTC</p>
      <section className="admin-panel"><h2>Request</h2>
        {request.source === "email" ? <p>This ticket arrived by email. The sender address alone does not verify account ownership; account access, correction, export, and deletion requests must come from the signed-in Account form.</p> : null}
        {request.subject ? <p><strong>Subject:</strong> {request.subject}</p> : null}
        {request.source_reference ? <p><strong>Email reference:</strong> {request.source_reference}</p> : null}
        <p className="admin-request-details">{request.details}</p><p>Current status: <strong>{request.status.replaceAll("_", " ")}</strong></p><UpdateRequestForm id={request.id} currentStatus={request.status} /></section>
      <section className="admin-panel"><h2>Case history</h2>{events.length ? <ol>{events.map((event) => <li key={event.id}><strong>{event.from_status ? `${event.from_status.replaceAll("_", " ")} → ` : ""}{event.to_status.replaceAll("_", " ")}</strong><small>{new Date(event.occurred_at).toLocaleString("en-US", { timeZone: "UTC" })} UTC · {event.actor_id ? `Actor ${event.actor_id.slice(0, 8)}` : "Email intake"}</small>{event.note ? <p>{event.note}</p> : null}</li>)}</ol> : <p>No history recorded.</p>}</section>
    </>}
  </main>;
}

function isRequest(value: unknown): value is Request {
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
    && (typeof row.source_reference === "string" || row.source_reference === null)
    && typeof row.created_at === "string";
}
function isEvent(value: unknown): value is Event {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return typeof row.id === "number"
    && (typeof row.actor_id === "string" || row.actor_id === null)
    && typeof row.to_status === "string"
    && typeof row.occurred_at === "string";
}
