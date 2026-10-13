"use client";

import { useActionState, useState } from "react";
import { replyToRequestAction, type ReplyFormState } from "./actions";

const INITIAL_STATE: ReplyFormState = {};

export function ReplyForm({ id }: { id: string }) {
  const [message, setMessage] = useState("");
  const [state, action, pending] = useActionState(async (previous: ReplyFormState, formData: FormData) => {
    const result = await replyToRequestAction(previous, formData);
    if (result.success) setMessage("");
    return result;
  }, INITIAL_STATE);
  return <form action={action} className="request-form" onReset={(event) => event.preventDefault()}>
    <input type="hidden" name="requestId" value={id} />
    <label htmlFor="request-reply">Your reply</label>
    <textarea id="request-reply" name="message" rows={4} maxLength={2000} required value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Reply to support. Please do not paste private Jar letters here." />
    <button className="button button--primary" type="submit" disabled={pending}>{pending ? "Sending…" : "Send reply"}</button>
    {state.error ? <p className="field-error" role="alert">{state.error}</p> : null}
    {state.success ? <p role="status">{state.success}</p> : null}
  </form>;
}
