"use client";

import { useActionState } from "react";
import { claimUsernameAction, type UsernameFormState } from "./actions";
import { Button, Field } from "@/components/ui";

const INITIAL_STATE: UsernameFormState = {};

export function UsernameForm({ suggestedName }: { suggestedName: string }) {
  const [state, action, pending] = useActionState(claimUsernameAction, INITIAL_STATE);

  return (
    <form action={action} className="auth-form username-claim-form">
      <h1>Choose your username.</h1>
      <p>This is how friends will find you and send jars. Your email stays private.</p>
      <Field label="Username" hint="3–30 lowercase letters, numbers, or underscores. This can only be chosen once.">
        <div className="username-input"><span>@</span><input autoFocus name="username" type="text" autoComplete="username" pattern="[a-z][a-z0-9_]{2,29}" maxLength={30} required /></div>
      </Field>
      <Field label="Name people see"><input defaultValue={suggestedName} name="displayName" type="text" autoComplete="name" maxLength={60} required /></Field>
      <label className="age-confirmation"><input name="ageConfirmed" required type="checkbox" /><span>I confirm I am at least 18.</span></label>
      {state.error ? <p className="field-error" role="alert">{state.error}</p> : null}
      <Button disabled={pending} type="submit">{pending ? "Saving…" : "Save my username"}</Button>
    </form>
  );
}
