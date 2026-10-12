"use client";

import Link from "next/link";
import { useActionState } from "react";
import { invitePlanMemberAction, type InviteFormState } from "@/app/app/actions";

const INITIAL_STATE: InviteFormState = {};

export function AccountSeatInvites({ unusedSeats, emailReady, notice, error }: {
  unusedSeats: number;
  emailReady: boolean;
  notice?: string;
  error?: string;
}) {
  const [state, action, pending] = useActionState(invitePlanMemberAction, INITIAL_STATE);

  return (
    <div className="account-seat-invites">
      <p>{unusedSeats > 0 ? `${unusedSeats} ${unusedSeats === 1 ? "seat is" : "seats are"} available to assign whenever you’re ready.` : "All plan seats are assigned or reserved."}</p>
      {unusedSeats > 0 ? <form action={action}>
        <input name="returnView" type="hidden" value="account" />
        <label htmlFor="account-invite-email">Invite someone by email</label>
        <input autoComplete="email" id="account-invite-email" name="email" placeholder="name@example.com" required type="email" />
        {state.error || error ? <p className="field-error" role="alert">{state.error ?? error}</p> : null}
        {notice ? <p className="circle-notice" role="status">{notice}</p> : null}
        {!emailReady ? <p className="account-card__note">Email delivery must be configured before a seat can be reserved.</p> : null}
        <button className="button button--primary" disabled={pending || !emailReady} type="submit">{pending ? "Sending invitation…" : "Send invitation"}</button>
      </form> : <>{notice ? <p className="circle-notice" role="status">{notice}</p> : null}{error ? <p className="field-error" role="alert">{error}</p> : null}</>}
      <Link href="/app?view=circle">Manage invitations in My Circle →</Link>
    </div>
  );
}
