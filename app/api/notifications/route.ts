import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type NotificationEvent = {
  body: string;
  id: string;
  occurredAt: string;
  title: string;
  type: "jar_received" | "envelope_ready" | "circle_request_received" | "circle_request_accepted" | "circle_request_declined";
  url: string;
};

export async function GET() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [jarsResult, circleResult] = await Promise.all([
    supabase
      .from("jar_recipients")
      .select("jar:jars!inner(id, sealed_at, status, creator:profiles!jars_creator_id_fkey(username, display_name), envelope_headers(id, unlock_at))")
      .eq("recipient_id", userId)
      .in("jar.status", ["sealed", "hosting_ended"])
      .order("sealed_at", { referencedTable: "jars", ascending: false })
      .limit(50),
    supabase
      .from("circle_connections")
      .select("id, requester_id, addressee_id, requester_username_snapshot, requester_display_name_snapshot, addressee_username_snapshot, addressee_display_name_snapshot, status, created_at, responded_at")
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (jarsResult.error || circleResult.error) {
    return NextResponse.json({ error: "Notifications are temporarily unavailable." }, { status: 503 });
  }

  const now = Date.now();
  const events: NotificationEvent[] = [];

  for (const membership of jarsResult.data ?? []) {
    const jar = membership.jar;
    if (!jar?.sealed_at) continue;
    const sender = jar.creator?.display_name || (jar.creator?.username ? `@${jar.creator.username}` : "Someone in your Circle");
    events.push({
      id: `jar:${jar.id}`,
      type: "jar_received",
      title: "A new Jar is waiting",
      body: `${sender} sent you an Open When Jar.`,
      occurredAt: jar.sealed_at,
      url: `/app/jars/${jar.id}`,
    });
    for (const envelope of jar.envelope_headers) {
      if (!envelope.unlock_at || new Date(envelope.unlock_at).getTime() > now) continue;
      events.push({
        id: `envelope:${envelope.id}`,
        type: "envelope_ready",
        title: "A letter is ready",
        body: "A letter in your Jar is ready to open.",
        occurredAt: envelope.unlock_at,
        url: `/app/jars/${jar.id}`,
      });
    }
  }

  for (const connection of circleResult.data ?? []) {
    if (connection.addressee_id === userId) {
      events.push({
        id: `circle-request:${connection.id}:${connection.created_at}`,
        type: "circle_request_received",
        title: "New Circle request",
        body: `${connection.requester_display_name_snapshot} (@${connection.requester_username_snapshot}) wants to join your Circle.`,
        occurredAt: connection.created_at,
        url: "/app?view=circle",
      });
    }
    if (connection.requester_id === userId && connection.responded_at && connection.status !== "pending") {
      const accepted = connection.status === "accepted";
      events.push({
        id: `circle-response:${connection.id}:${connection.responded_at}`,
        type: accepted ? "circle_request_accepted" : "circle_request_declined",
        title: accepted ? "Circle request accepted" : "Circle request declined",
        body: accepted
          ? `${connection.addressee_display_name_snapshot} (@${connection.addressee_username_snapshot}) is now in your Circle.`
          : `${connection.addressee_display_name_snapshot} (@${connection.addressee_username_snapshot}) declined your request.`,
        occurredAt: connection.responded_at,
        url: "/app?view=circle",
      });
    }
  }

  events.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

  return NextResponse.json({ events: events.slice(0, 100) }, {
    headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
  });
}
