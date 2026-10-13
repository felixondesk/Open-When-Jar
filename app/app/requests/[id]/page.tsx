import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseSupportConversation } from "@/lib/support";
import { SupportMessages } from "@/components/SupportMessages";
import { ReplyForm } from "../ReplyForm";
import { RequestRefresh } from "../RequestRefresh";

export const dynamic = "force-dynamic";
export const metadata = { title: "Request conversation — Open When Jar", robots: { index: false, follow: false } };

export default async function RequestConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect("/auth");
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();
  // The customer page always checks ownership, even for an admin viewing their own app.
  const { data: owned, error: ownershipError } = await supabase.from("support_requests").select("id").eq("id", id).eq("requester_id", claims.claims.sub).maybeSingle();
  if (!ownershipError && !owned) notFound();
  const result = owned ? await supabase.rpc("support_request_conversation", { p_request_id: id }) : null;
  const conversation = parseSupportConversation(result?.data);
  return <main className="request-page request-detail">
    <RequestRefresh />
    <Link href="/app/requests">← Your requests</Link>
    <h1>Request {id.slice(0, 8)}</h1>
    {ownershipError || result?.error || !conversation ? <p className="field-error" role="alert">Your request is unavailable right now. Please try again later.</p> : <>
      <p>Current status: <strong>{conversation.request.status.replaceAll("_", " ")}</strong></p>
      <section><h2>Your request</h2><p className="admin-request-details">{conversation.request.details}</p></section>
      <SupportMessages messages={conversation.messages} />
      {conversation.request.status === "waiting_on_user" ? <p role="status">Support is waiting for your reply. Read the message above and reply below.</p> : null}
      {["resolved", "rejected"].includes(conversation.request.status) ? <p>This request is closed. <Link href="/app/requests">Submit a new request</Link> if you need more help.</p> : <ReplyForm id={id} />}
    </>}
  </main>;
}
