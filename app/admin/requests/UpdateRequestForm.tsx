"use client";

import { useActionState, useState } from "react";
import { updateRequestAction, type UpdateRequestState } from "./actions";

const INITIAL_STATE: UpdateRequestState = {};

export function UpdateRequestForm({ id, currentStatus, canMessage = true }: { id: string; currentStatus: string; canMessage?: boolean }) {
  const [status, setStatus] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [state, action, pending] = useActionState(async (previous: UpdateRequestState, formData: FormData) => {
    const result = await updateRequestAction(previous, formData);
    if (result.success) { setStatus(""); setNote(""); setMessage(""); }
    return result;
  }, INITIAL_STATE);
  return <form action={action} className="admin-request-form" onReset={(event) => event.preventDefault()}>
    <input type="hidden" name="requestId" value={id} />
    <label>New status
      <select name="status" value={status} required onChange={(event) => setStatus(event.target.value)}>
        <option value="" disabled>Choose</option>
        {(["triaged", "waiting_on_user", "in_progress", "resolved", "rejected"] as const).filter((status) => status !== currentStatus && (canMessage || status !== "waiting_on_user")).map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
      </select>
    </label>
    <label>Decision note (internal)
      <textarea name="note" rows={2} maxLength={1000} required value={note} onChange={(event) => setNote(event.target.value)} placeholder="Record what was checked or completed. Do not paste private Jar content." />
    </label>
    {canMessage ? <label className="admin-request-message">Message to customer
      <textarea name="message" rows={3} maxLength={2000} required={status === "waiting_on_user"} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Explain what you need or what was completed. Visible to the customer; required when waiting on user." />
    </label> : <p>This email request has no verified account conversation. Contact the sender through your support mailbox.</p>}
    <button className="button button--secondary" type="submit" disabled={pending}>{pending ? "Saving…" : "Save status"}</button>
    {state.error ? <p className="field-error" role="alert">{state.error}</p> : null}
    {state.success ? <p role="status">{state.success}</p> : null}
  </form>;
}
