import type { SupportMessage } from "@/lib/support";

export function SupportMessages({ messages }: { messages: SupportMessage[] }) {
  return <section className="support-conversation" aria-labelledby="support-conversation-heading">
    <h2 id="support-conversation-heading">Conversation</h2>
    {messages.length ? <ol>{messages.map((message) => <li key={message.id}>
      <strong>{message.sender === "support" ? "Support" : "Customer"}</strong>
      <small>{new Date(message.created_at).toLocaleString("en-US", { timeZone: "UTC" })} UTC</small>
      <p>{message.body}</p>
    </li>)}</ol> : <p>No messages yet. Support messages and replies will appear here.</p>}
  </section>;
}
