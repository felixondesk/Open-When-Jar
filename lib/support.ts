export type SupportMessage = { id: number; sender: "support" | "customer"; body: string; created_at: string };
export type SupportConversation = {
  request: { id: string; category: string; details: string; status: string; created_at: string };
  messages: SupportMessage[];
};

export function parseSupportConversation(value: unknown): SupportConversation | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const request = row.request;
  if (!request || typeof request !== "object" || Array.isArray(request) || !Array.isArray(row.messages)) return null;
  const data = request as Record<string, unknown>;
  if (typeof data.id !== "string" || typeof data.category !== "string" || typeof data.details !== "string"
    || typeof data.status !== "string" || typeof data.created_at !== "string") return null;
  const messages: SupportMessage[] = [];
  for (const item of row.messages) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const message = item as Record<string, unknown>;
    if (typeof message.id !== "number" || (message.sender !== "support" && message.sender !== "customer")
      || typeof message.body !== "string" || typeof message.created_at !== "string") return null;
    messages.push({ id: message.id, sender: message.sender, body: message.body, created_at: message.created_at });
  }
  return { request: { id: data.id, category: data.category, details: data.details, status: data.status, created_at: data.created_at }, messages };
}
