import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) return new NextResponse("Unauthorized", { status: 401 });

  const { data: attachment, error } = await supabase
    .from("attachments")
    .select("storage_path, mime_type, byte_size")
    .eq("id", id)
    .single();
  if (error || !attachment) return new NextResponse("Not found", { status: 404 });

  const { data: blob, error: downloadError } = await supabase.storage.from("jar-media").download(attachment.storage_path);
  if (downloadError || !blob) return new NextResponse("Not found", { status: 404 });

  const bytes = new Uint8Array(await blob.arrayBuffer());
  const range = parseRange(request.headers.get("range"), bytes.length);
  const headers = new Headers({
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
    "Content-Disposition": "inline",
    "Content-Type": attachment.mime_type,
    "X-Content-Type-Options": "nosniff",
  });

  if (!range) {
    headers.set("Content-Length", String(bytes.length));
    return new NextResponse(bytes, { status: 200, headers });
  }

  const chunk = bytes.slice(range.start, range.end + 1);
  headers.set("Content-Length", String(chunk.length));
  headers.set("Content-Range", `bytes ${range.start}-${range.end}/${bytes.length}`);
  return new NextResponse(chunk, { status: 206, headers });
}

function parseRange(value: string | null, length: number) {
  if (!value) return null;
  const match = /^bytes=(\d+)-(\d*)$/.exec(value);
  if (!match) return null;
  const start = Number(match[1]);
  const requestedEnd = match[2] ? Number(match[2]) : length - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(requestedEnd) || start < 0 || start >= length || requestedEnd < start) return null;
  return { start, end: Math.min(requestedEnd, length - 1) };
}
