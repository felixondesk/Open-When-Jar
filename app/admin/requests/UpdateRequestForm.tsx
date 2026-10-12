"use client";

import { useActionState } from "react";
import { updateRequestAction, type UpdateRequestState } from "./actions";

const INITIAL_STATE: UpdateRequestState = {};

export function UpdateRequestForm({ id, currentStatus }: { id: string; currentStatus: string }) {
  const [state, action, pending] = useActionState(updateRequestAction, INITIAL_STATE);
  return <form action={action} className="admin-request-form">
    <input type="hidden" name="requestId" value={id} />
    <label>New status
      <select name="status" defaultValue="" required>
        <option value="" disabled>Choose</option>
        {(["triaged", "waiting_on_user", "in_progress", "resolved", "rejected"] as const).filter((status) => status !== currentStatus).map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
      </select>
    </label>
    <label>Decision note
      <textarea name="note" rows={2} maxLength={1000} required placeholder="Record what was checked or completed. Do not paste private Jar content." />
    </label>
    <button className="button button--secondary" type="submit" disabled={pending}>{pending ? "Saving…" : "Save status"}</button>
    {state.error ? <p className="field-error" role="alert">{state.error}</p> : null}
    {state.success ? <p role="status">{state.success}</p> : null}
  </form>;
}
