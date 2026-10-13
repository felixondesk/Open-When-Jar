"use client";

import { useActionState, useState } from "react";
import { submitRequestAction, type RequestFormState } from "./actions";

const INITIAL_STATE: RequestFormState = {};

export function RequestForm() {
  const [category, setCategory] = useState("");
  const [details, setDetails] = useState("");
  const [state, action, pending] = useActionState(async (previous: RequestFormState, formData: FormData) => {
    const result = await submitRequestAction(previous, formData);
    if (result.reference) { setCategory(""); setDetails(""); }
    return result;
  }, INITIAL_STATE);
  return (
    <form action={action} className="request-form" onReset={(event) => event.preventDefault()}>
      <label htmlFor="request-category">What do you need?</label>
      <select id="request-category" name="category" required value={category} onChange={(event) => setCategory(event.target.value)}>
        <option value="" disabled>Choose a request</option>
        <option value="support">Get help</option>
        <option value="access">Access my data</option>
        <option value="correction">Correct my data</option>
        <option value="export">Export my data</option>
        <option value="deletion">Delete my account and data</option>
        <option value="refund">Request a refund review</option>
        <option value="abuse">Report abuse or safety concern</option>
        <option value="privacy">Other privacy question</option>
      </select>
      <label htmlFor="request-details">Details</label>
      <textarea id="request-details" name="details" minLength={10} maxLength={2000} rows={5} required value={details} onChange={(event) => setDetails(event.target.value)} placeholder="Tell us what you need. Please do not paste private Jar letters here." />
      <p>Your signed-in account identifies you. Felix reviews these requests manually. Submitting a refund request does not issue a refund.</p>
      <button className="button button--primary" type="submit" disabled={pending}>{pending ? "Submitting…" : "Submit request"}</button>
      {state.error ? <p className="field-error" role="alert">{state.error}</p> : null}
      {state.reference ? <p className="dashboard-notice dashboard-notice--success" role="status">Request received. Reference: {state.reference.slice(0, 8)}. You can follow its status below.</p> : null}
    </form>
  );
}
