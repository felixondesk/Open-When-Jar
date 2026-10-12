"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSeatInvitationEmailConfig, sendSeatInvitationEmail } from "@/lib/seat-invitation-email";

export type JarFormState = { error?: string };
export type CircleFormState = { error?: string };
export type CircleSearchState = { error?: string; person?: { username: string; displayName: string } };
export type InviteFormState = { error?: string };

const MAX_MEDIA_BYTES = 1_500_000;

type ValidatedMedia = {
  extension: "webp" | "webm" | "ogg" | "m4a";
  file: File;
  kind: "image" | "audio";
  mimeType: "image/webp" | "audio/webm" | "audio/ogg" | "audio/mp4";
};

export async function createJarAction(
  _previousState: JarFormState,
  formData: FormData,
): Promise<JarFormState> {
  const submitIntent = formData.get("submitIntent") === "seal" ? "seal" : "preview";
  const recipientUsernames = formData.getAll("recipientUsernames").map((value) => String(value).trim().toLowerCase()).filter(Boolean);
  const coverNote = String(formData.get("coverNote") ?? "").trim();
  const theme = String(formData.get("theme") ?? "petal");
  const label = String(formData.get("label") ?? "").trim();
  const message = String(formData.get("message") ?? "");
  const unlockAtValue = String(formData.get("unlockAt") ?? "");
  const unlockAtDate = unlockAtValue ? new Date(unlockAtValue) : null;
  const unlockAt = unlockAtDate && !Number.isNaN(unlockAtDate.getTime())
    ? unlockAtDate.toISOString()
    : undefined;
  const unlockTimezone = String(formData.get("unlockTimezone") ?? "UTC");

  if (recipientUsernames.length !== 1) return { error: "Choose one person in your Circle." };
  if (recipientUsernames.some((username) => !/^[a-z][a-z0-9_]{2,29}$/.test(username))) return { error: "Enter each person’s exact Open When Jar username." };
  if (new Set(recipientUsernames).size !== recipientUsernames.length) return { error: "Each recipient username must be unique." };
  if (!label || label.length > 80) return { error: "Add an envelope label up to 80 characters." };
  if (!message.trim() || message.length > 3000) return { error: "Write a letter between 1 and 3,000 characters." };
  if (unlockAtValue && !unlockAt) return { error: "Choose a valid open date." };
  if (unlockTimezone.length > 80) return { error: "Choose a valid timezone." };
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: unlockTimezone }).format();
  } catch {
    return { error: "Choose a valid timezone." };
  }
  if (formData.get("mediaPreparing") === "true") return { error: "Wait for the photo to finish compressing." };
  if (formData.get("mediaRecording") === "true") return { error: "Stop the voice recording before saving." };

  const photo = getUploadedFile(formData, "photo");
  const audio = getUploadedFile(formData, "audio");
  let media: ValidatedMedia[];
  try {
    media = (await Promise.all([
      photo ? validateMedia(photo, "image") : null,
      audio ? validateMedia(audio, "audio") : null,
    ])).filter((item): item is ValidatedMedia => item !== null);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "The attachment could not be validated." };
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/auth");

  const { data: connections, error: connectionsError } = await supabase.from("circle_connections")
    .select("requester_id, requester_username_snapshot, addressee_username_snapshot")
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
  if (connectionsError) return { error: "We couldn’t check your Circle. Please try again." };
  const circleUsernames = new Set((connections ?? []).map((connection) =>
    connection.requester_id === userId ? connection.addressee_username_snapshot : connection.requester_username_snapshot,
  ));
  if (recipientUsernames.some((username) => !circleUsernames.has(username))) {
    return { error: "You can only send a Jar to someone in your Circle." };
  }

  const { data: jarId, error } = await supabase.rpc("create_jar_with_first_envelope", {
    p_recipient_usernames: recipientUsernames,
    p_plan_code: "one_heart",
    p_cover_note: coverNote,
    p_theme: theme,
    p_label: label,
    p_message: message,
    p_unlock_at: unlockAt,
    p_unlock_timezone: unlockTimezone || "UTC",
  });

  if (error || !jarId) return { error: friendlyJarError(error?.message) };

  const uploadedPaths: string[] = [];
  try {
    if (media.length) {
      const { data: envelope, error: envelopeError } = await supabase
        .from("envelope_headers")
        .select("id")
        .eq("jar_id", jarId)
        .eq("position", 1)
        .single();
      if (envelopeError || !envelope) throw new Error("Envelope unavailable");

      for (const item of media) {
        const path = `${userId}/${jarId}/${envelope.id}/${crypto.randomUUID()}.${item.extension}`;
        const { error: attachmentError } = await supabase.from("attachments").insert({
          envelope_id: envelope.id,
          owner_id: userId,
          kind: item.kind,
          storage_path: path,
          mime_type: item.mimeType,
          byte_size: item.file.size,
        });
        if (attachmentError) throw attachmentError;

        const { error: uploadError } = await supabase.storage.from("jar-media").upload(path, item.file, {
          cacheControl: "31536000",
          contentType: item.mimeType,
          upsert: false,
        });
        if (uploadError) throw uploadError;
        uploadedPaths.push(path);
      }
    }
  } catch {
    if (uploadedPaths.length) await supabase.storage.from("jar-media").remove(uploadedPaths);
    await supabase.from("jars").delete().eq("id", jarId).eq("status", "draft");
    return { error: "We couldn’t save the media safely. Nothing was sent—please try again." };
  }

  if (submitIntent === "seal") {
    const { error: sealError } = await supabase.rpc("seal_jar", { p_jar_id: jarId });
    if (sealError) redirect(`/app/jars/${jarId}?error=${encodeURIComponent(friendlyJarError(sealError.message))}`);
    revalidatePath("/app");
    redirect("/app?sealed=1");
  }
  revalidatePath("/app");
  revalidatePath(`/app/jars/${jarId}`);
  redirect(`/app/jars/${jarId}`);
}

export async function sealJarAction(formData: FormData) {
  const jarId = String(formData.get("jarId") ?? "");
  if (!jarId) return;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) redirect("/auth");

  const { error } = await supabase.rpc("seal_jar", { p_jar_id: jarId });
  if (error) {
    redirect(`/app/jars/${jarId}?error=${encodeURIComponent(friendlyJarError(error.message))}`);
  }

  revalidatePath("/app");
  redirect("/app?sealed=1");
}

export async function deleteDraftAction(formData: FormData) {
  const jarId = String(formData.get("jarId") ?? "");
  if (!jarId) return;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) redirect("/auth");

  const { data: headers } = await supabase.from("envelope_headers").select("id").eq("jar_id", jarId);
  const envelopeIds = (headers ?? []).map((header) => header.id);
  if (envelopeIds.length) {
    const { data: attachments } = await supabase.from("attachments").select("storage_path").in("envelope_id", envelopeIds);
    const paths = (attachments ?? []).map((attachment) => attachment.storage_path);
    if (paths.length) {
      const { error: removeError } = await supabase.storage.from("jar-media").remove(paths);
      if (removeError) redirect(`/app?error=${encodeURIComponent("That draft’s private media could not be removed safely.")}`);
    }
  }
  const { error } = await supabase.from("jars").delete().eq("id", jarId).eq("status", "draft");
  if (error) redirect(`/app?error=${encodeURIComponent("That draft could not be deleted.")}`);
  revalidatePath("/app");
}

export async function sendCircleRequestAction(
  _previousState: CircleFormState,
  formData: FormData,
): Promise<CircleFormState> {
  const username = String(formData.get("username") ?? "").trim().replace(/^@/, "").toLowerCase();
  if (!/^[a-z][a-z0-9_]{2,29}$/.test(username)) {
    return { error: "Enter their exact Open When Jar username." };
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) redirect("/auth");

  const { error } = await supabase.rpc("send_circle_request", { p_username: username });
  if (error) return { error: friendlyCircleError(error.message) };

  revalidatePath("/app");
  redirect("/app?view=circle&circle=sent");
}

export async function findCircleUserAction(
  _previousState: CircleSearchState,
  formData: FormData,
): Promise<CircleSearchState> {
  const username = String(formData.get("username") ?? "").trim().replace(/^@/, "").toLowerCase();
  if (!/^[a-z][a-z0-9_]{2,29}$/.test(username)) return { error: "Enter an exact username." };
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect("/auth");
  const { data, error } = await supabase.rpc("find_circle_user", { p_username: username });
  if (error) return { error: "We couldn’t search right now. Please try again." };
  if (!data || typeof data !== "object" || Array.isArray(data) ||
      typeof data.username !== "string" || typeof data.displayName !== "string") {
    return { error: "No account with that username was found." };
  }
  return { person: { username: data.username, displayName: data.displayName } };
}

export async function respondCircleRequestAction(formData: FormData) {
  const requestId = String(formData.get("requestId") ?? "");
  const accept = String(formData.get("response") ?? "") === "accept";
  if (!requestId) return;

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) redirect("/auth");

  const { error } = await supabase.rpc("respond_circle_request", {
    p_accept: accept,
    p_request_id: requestId,
  });
  if (error) redirect(`/app?view=circle&circleError=${encodeURIComponent(friendlyCircleError(error.message))}`);

  revalidatePath("/app");
  redirect(`/app?view=circle&circle=${accept ? "accepted" : "declined"}`);
}

export async function invitePlanMemberAction(
  _previousState: InviteFormState,
  formData: FormData,
): Promise<InviteFormState> {
  const returnView = formData.get("returnView") === "account" ? "account" : "circle";
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 320) return { error: "Enter a valid email address." };
  const emailConfig = getSeatInvitationEmailConfig();
  if (!emailConfig) return { error: "Invitation email is not configured yet. No seat was reserved." };
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect("/auth");
  const { error } = await supabase.rpc("invite_plan_member", { p_email: email });
  if (error) return { error: friendlyInviteError(error.message) };
  revalidatePath("/app");
  const emailSent = await deliverSeatInvitation(email, emailConfig);
  if (!emailSent) {
    redirect(`/app?view=${returnView}&inviteError=${encodeURIComponent("Seat reserved, but the email could not be sent. Check the recipient restriction or try Resend again.")}`);
  }
  redirect(`/app?view=${returnView}&invite=sent`);
}

export async function resendPlanInvitationAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 320) {
    redirect(`/app?view=circle&inviteError=${encodeURIComponent("That invitation email is invalid.")}`);
  }
  const emailConfig = getSeatInvitationEmailConfig();
  if (!emailConfig) {
    redirect(`/app?view=circle&inviteError=${encodeURIComponent("Invitation email is not configured yet.")}`);
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect("/auth");

  // This RPC is idempotent for an existing invitation and also confirms that
  // the authenticated user owns the plan containing the reserved seat.
  const { error } = await supabase.rpc("invite_plan_member", { p_email: email });
  if (error) redirect(`/app?view=circle&inviteError=${encodeURIComponent(friendlyInviteError(error.message))}`);

  const emailSent = await deliverSeatInvitation(email, emailConfig);
  if (!emailSent) {
    redirect(`/app?view=circle&inviteError=${encodeURIComponent("The seat is still reserved, but the email could not be resent. Check the recipient restriction and try again.")}`);
  }
  revalidatePath("/app");
  redirect("/app?view=circle&invite=resent");
}

export async function cancelPlanInvitationAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect("/auth");
  const { error } = await supabase.rpc("cancel_plan_invitation", { p_email: email });
  if (error) redirect(`/app?view=circle&inviteError=${encodeURIComponent(friendlyInviteError(error.message))}`);
  revalidatePath("/app");
  redirect("/app?view=circle&invite=cancelled");
}

async function deliverSeatInvitation(
  email: string,
  config: NonNullable<ReturnType<typeof getSeatInvitationEmailConfig>>,
) {
  try {
    return await sendSeatInvitationEmail(email, config);
  } catch {
    return false;
  }
}

function getUploadedFile(formData: FormData, key: string) {
  const value = formData.get(key);
  return value instanceof File && value.size > 0 ? value : null;
}

async function validateMedia(file: File, expectedKind: "image" | "audio"): Promise<ValidatedMedia> {
  if (file.size > MAX_MEDIA_BYTES) throw new Error(`${expectedKind === "image" ? "Photo" : "Voice note"} must be smaller than 1.5 MB after compression.`);
  const bytes = new Uint8Array(await file.slice(0, 32).arrayBuffer());

  if (expectedKind === "image") {
    const isWebP = ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP";
    if (!isWebP) throw new Error("Photo validation failed. Choose the image again.");
    const dimensions = readWebPDimensions(bytes);
    if (!dimensions || dimensions.width > 1600 || dimensions.height > 1600) throw new Error("Photo dimensions are not safe. Choose the image again.");
    return { extension: "webp", file, kind: "image", mimeType: "image/webp" };
  }

  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    return { extension: "webm", file, kind: "audio", mimeType: "audio/webm" };
  }
  if (ascii(bytes, 0, 4) === "OggS") return { extension: "ogg", file, kind: "audio", mimeType: "audio/ogg" };
  if (ascii(bytes, 4, 4) === "ftyp") return { extension: "m4a", file, kind: "audio", mimeType: "audio/mp4" };
  throw new Error("Voice note validation failed. Record it again.");
}

function readWebPDimensions(bytes: Uint8Array) {
  const chunk = ascii(bytes, 12, 4);
  if (chunk === "VP8X" && bytes.length >= 30) {
    return { width: read24(bytes, 24) + 1, height: read24(bytes, 27) + 1 };
  }
  if (chunk === "VP8L" && bytes.length >= 25 && bytes[20] === 0x2f) {
    const bits = (bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24)) >>> 0;
    return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
  }
  if (chunk === "VP8 " && bytes.length >= 30 && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) {
    return { width: (bytes[26] | (bytes[27] << 8)) & 0x3fff, height: (bytes[28] | (bytes[29] << 8)) & 0x3fff };
  }
  return null;
}

function read24(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function ascii(bytes: Uint8Array, offset: number, length: number) {
  return String.fromCharCode(...bytes.slice(offset, offset + length));
}

function friendlyJarError(message = "") {
  if (message.includes("JAR_LIMIT_REACHED")) return "You’ve used all your available Jars.";
  if (message.includes("JAR_CREDIT_REQUIRED")) return "Your plan has no unused Jar credits.";
  if (message.includes("PLAN_REQUIRED")) return "A one-time plan is needed before sending a Jar.";
  if (message.includes("SINGLE_RECIPIENT_JARS_ONLY")) return "Choose one person for this Jar.";
  if (message.includes("CIRCLE_REQUIRED")) return "You can only send a Jar to someone in your Circle.";
  if (message.includes("could not be found")) return "One or more usernames could not be found on Open When Jar.";
  if (message.includes("Choose other people")) return "You can’t send a jar to your own username.";
  if (message.includes("recipient username must be unique")) return "Each recipient username must be unique.";
  if (message.includes("valid jar size")) return "Choose a valid jar size.";
  if (message.includes("three active drafts")) return "You can have up to three active drafts.";
  if (message.includes("already sealed")) return "This jar is already sealed.";
  if (message.includes("Jar not found")) return "That jar is no longer available.";
  return "We couldn’t save that change. Please check the details and try again.";
}

function friendlyCircleError(message = "") {
  if (message.includes("CIRCLE_USER_NOT_FOUND")) return "That username isn’t on Open When Jar yet.";
  if (message.includes("CIRCLE_SELF")) return "Your own username is already yours—invite someone else.";
  if (message.includes("CIRCLE_ALREADY_CONNECTED")) return "They’re already in your circle.";
  if (message.includes("CIRCLE_REQUEST_WAITING_FOR_YOU")) return "They already invited you. Accept their request below.";
  if (message.includes("CIRCLE_ALREADY_PENDING")) return "Your request is still waiting for their reply.";
  if (message.includes("CIRCLE_REQUEST_ALREADY_ANSWERED")) return "That request has already been answered.";
  if (message.includes("CIRCLE_REQUEST_NOT_FOUND")) return "That request is no longer available.";
  return "We couldn’t update your circle. Please try again.";
}

function friendlyInviteError(message = "") {
  if (message.includes("NO_SEATS_LEFT")) return "All seats are filled or reserved. Cancel an unused invitation to make room.";
  if (message.includes("ALREADY_HAS_PLAN")) return "That person already belongs to a plan.";
  if (message.includes("ALREADY_INVITED")) return "That email already has a pending invitation.";
  if (message.includes("PLAN_OWNER_REQUIRED")) return "Only the plan owner can invite members.";
  if (message.includes("INVALID_EMAIL")) return "Enter a valid email address.";
  return "We couldn’t update the invitation. Please try again.";
}
