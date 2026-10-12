import type { Json } from "@/lib/supabase/database.types";

export type AdminActivityPoint = {
  day: string;
  jarsCreated: number;
  jarsSealed: number;
  peopleJoined: number;
  revenueCents: number;
};

export type AdminJar = {
  id: string;
  creatorUsername: string;
  planCode: string;
  status: "draft" | "sealed" | "hosting_ended" | "deleted";
  createdAt: string;
  sealedAt: string | null;
  hostingEndsAt: string | null;
  recipientCount: number;
  envelopeCount: number;
};

export type AdminOrder = {
  id: string;
  username: string;
  planCode: string;
  status: "created" | "pending" | "succeeded" | "failed" | "cancelled" | "refunded";
  amountCents: number;
  currency: string;
  createdAt: string;
};

export type AdminPerson = {
  id: string;
  username: string;
  displayName: string;
  createdAt: string;
  jarsCreated: number;
  jarsReceived: number;
};

export type AdminSnapshot = {
  generatedAt: string;
  summary: {
    people: number;
    jarsCreated: number;
    sealedJars: number;
    revenueCents: number;
  };
  lifecycle: {
    draft: number;
    sealed: number;
    hostingEnded: number;
  };
  attention: {
    pendingPayments: number;
    failedPayments: number;
    hostingEndingSoon: number;
  };
  activity: AdminActivityPoint[];
  jars: AdminJar[];
  orders: AdminOrder[];
  people: AdminPerson[];
};

type Claims = Record<string, unknown>;

export function getAdminAccess(claims: Claims | undefined) {
  const appMetadata = isRecord(claims?.app_metadata) ? claims.app_metadata : {};
  const hasAdminRole = appMetadata.role === "admin";
  const hasAal2 = claims?.aal === "aal2";
  return { isAdmin: hasAdminRole && hasAal2, hasAdminRole, hasAal2 };
}

export function parseAdminSnapshot(value: Json | null): AdminSnapshot | null {
  if (!isRecord(value)) return null;
  const summary = value.summary;
  const lifecycle = value.lifecycle;
  const attention = value.attention;
  if (!isRecord(summary) || !isRecord(lifecycle) || !isRecord(attention)) return null;

  return {
    generatedAt: readString(value.generated_at, new Date(0).toISOString()),
    summary: {
      people: readNumber(summary.people),
      jarsCreated: readNumber(summary.jars_created),
      sealedJars: readNumber(summary.sealed_jars),
      revenueCents: readNumber(summary.revenue_cents),
    },
    lifecycle: {
      draft: readNumber(lifecycle.draft),
      sealed: readNumber(lifecycle.sealed),
      hostingEnded: readNumber(lifecycle.hosting_ended),
    },
    attention: {
      pendingPayments: readNumber(attention.pending_payments),
      failedPayments: readNumber(attention.failed_payments),
      hostingEndingSoon: readNumber(attention.hosting_ending_soon),
    },
    activity: readArray(value.activity).flatMap((item) => isRecord(item) ? [{
      day: readString(item.day),
      jarsCreated: readNumber(item.jars_created),
      jarsSealed: readNumber(item.jars_sealed),
      peopleJoined: readNumber(item.people_joined),
      revenueCents: readNumber(item.revenue_cents),
    }] : []),
    jars: readArray(value.jars).flatMap((item) => isRecord(item) ? [{
      id: readString(item.id),
      creatorUsername: readString(item.creator_username, "unknown"),
      planCode: readString(item.plan_code, "one_heart"),
      status: readJarStatus(item.status),
      createdAt: readString(item.created_at),
      sealedAt: readNullableString(item.sealed_at),
      hostingEndsAt: readNullableString(item.hosting_ends_at),
      recipientCount: readNumber(item.recipient_count),
      envelopeCount: readNumber(item.envelope_count),
    }] : []),
    orders: readArray(value.orders).flatMap((item) => isRecord(item) ? [{
      id: readString(item.id),
      username: readString(item.username, "unknown"),
      planCode: readString(item.plan_code, "one_heart"),
      status: readOrderStatus(item.status),
      amountCents: readNumber(item.amount_cents),
      currency: readString(item.currency, "USD"),
      createdAt: readString(item.created_at),
    }] : []),
    people: readArray(value.people).flatMap((item) => isRecord(item) ? [{
      id: readString(item.id),
      username: readString(item.username, "unknown"),
      displayName: readString(item.display_name, "Unknown"),
      createdAt: readString(item.created_at),
      jarsCreated: readNumber(item.jars_created),
      jarsReceived: readNumber(item.jars_received),
    }] : []),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function readNullableString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function readJarStatus(value: unknown): AdminJar["status"] {
  return value === "sealed" || value === "hosting_ended" || value === "deleted" ? value : "draft";
}

function readOrderStatus(value: unknown): AdminOrder["status"] {
  return value === "pending" || value === "succeeded" || value === "failed" || value === "cancelled" || value === "refunded" ? value : "created";
}
