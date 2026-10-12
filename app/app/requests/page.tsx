import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RequestForm } from "./RequestForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Account requests — Open When Jar", robots: { index: false, follow: false } };

export default async function AccountRequestsPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/auth");
  const { data: requests, error } = await supabase.from("support_requests")
    .select("id, category, status, created_at")
    .eq("requester_id", userId).order("created_at", { ascending: false }).limit(25);
  return (
    <main className="request-page">
      <Link href="/app?view=account">← Back to Account</Link>
      <h1>Account requests</h1>
      <p>Ask for help, report a concern, or request access, correction, export, or deletion. You can track requests here.</p>
      {error ? <p className="dashboard-notice field-error" role="alert">Requests are unavailable right now. Please try again later.</p> : <>
        <RequestForm />
        <section aria-labelledby="request-history-heading">
          <h2 id="request-history-heading">Your requests</h2>
          {requests?.length ? <ul>{requests.map((request) => <li key={request.id}><strong>{label(request.category)}</strong><span>{request.status.replaceAll("_", " ")}</span><small>{new Date(request.created_at).toLocaleDateString("en-US", { timeZone: "UTC" })} · {request.id.slice(0, 8)}</small></li>)}</ul> : <p>No requests yet.</p>}
        </section>
      </>}
    </main>
  );
}

function label(category: string) {
  return ({ support: "Support", access: "Access", correction: "Correction", export: "Export", deletion: "Deletion", refund: "Refund review", abuse: "Abuse report", privacy: "Privacy" } as Record<string, string>)[category] ?? "Request";
}
