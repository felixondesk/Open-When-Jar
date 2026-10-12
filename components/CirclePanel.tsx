"use client";

import { useActionState, useState } from "react";
import { cancelPlanInvitationAction, findCircleUserAction, invitePlanMemberAction, resendPlanInvitationAction, respondCircleRequestAction, sendCircleRequestAction, type CircleFormState, type CircleSearchState, type InviteFormState } from "@/app/app/actions";
import type { PlanStatus } from "@/lib/plan-status";

export type CircleConnectionView = {
  id: string;
  direction: "incoming" | "outgoing";
  status: "pending" | "accepted" | "declined";
  person: { displayName: string; username: string };
};

type CircleTab = "members" | "invites";

const INITIAL_STATE: CircleFormState = {};
const INITIAL_SEARCH_STATE: CircleSearchState = {};
const INITIAL_INVITE_STATE: InviteFormState = {};

export function CirclePanel({
  connections,
  currentUsername,
  plan,
  notice,
  error,
  inviteNotice,
  inviteError,
  emailReady,
}: {
  connections: CircleConnectionView[];
  currentUsername: string;
  plan: PlanStatus;
  notice?: string;
  error?: string;
  inviteNotice?: string;
  inviteError?: string;
  emailReady: boolean;
}) {
  const [state, action, pending] = useActionState(sendCircleRequestAction, INITIAL_STATE);
  const [searchState, searchAction, searchPending] = useActionState(findCircleUserAction, INITIAL_SEARCH_STATE);
  const [inviteState, inviteAction, invitePending] = useActionState(invitePlanMemberAction, INITIAL_INVITE_STATE);
  const [activeTab, setActiveTab] = useState<CircleTab>(inviteNotice || inviteError || error || (notice && !notice.includes("accepted")) ? "invites" : "members");
  const accepted = connections.filter((connection) => connection.status === "accepted");
  const incoming = connections.filter((connection) => connection.status === "pending" && connection.direction === "incoming");
  const outgoing = connections.filter((connection) => connection.status === "pending" && connection.direction === "outgoing");
  const reservedSeats = plan.members.length + plan.invitations.length;
  const pendingCount = plan.invitations.length + incoming.length + outgoing.length;
  const circleMembers = new Map<string, { person: CircleConnectionView["person"]; label: string }>();

  plan.members.forEach((member) => {
    if (member.username !== currentUsername) {
      circleMembers.set(member.username, {
        person: { username: member.username, displayName: member.displayName },
        label: member.isOwner ? "Plan owner" : "Plan member",
      });
    }
  });
  accepted.forEach((connection) => {
    if (connection.person.username !== currentUsername && !circleMembers.has(connection.person.username)) {
      circleMembers.set(connection.person.username, { person: connection.person, label: "Connected" });
    }
  });

  return (
    <section className="circle-workspace" aria-labelledby="circle-heading">
      <header className="circle-workspace__heading">
        <div><span aria-hidden="true" className="circle-workspace__sprig">❦</span><h1 id="circle-heading">My Circle</h1><p>Your people, all in one place. Add someone here before sending them a Jar.</p></div>
        <p className="circle-workspace__count">{reservedSeats} of {plan.seatLimit} plan seats reserved</p>
      </header>

      <div className="circle-tabs" role="tablist" aria-label="My Circle sections">
        <button aria-controls="circle-members-panel" aria-selected={activeTab === "members"} className={activeTab === "members" ? "is-active" : ""} id="circle-members-tab" onClick={() => setActiveTab("members")} role="tab" type="button">
          <span>Circle members</span><small>{circleMembers.size}</small>
        </button>
        <button aria-controls="circle-invites-panel" aria-selected={activeTab === "invites"} className={activeTab === "invites" ? "is-active" : ""} id="circle-invites-tab" onClick={() => setActiveTab("invites")} role="tab" type="button">
          <span>Invites</span>{pendingCount > 0 ? <small>{pendingCount}</small> : null}
        </button>
      </div>

      {activeTab === "members" ? (
        <section aria-labelledby="circle-members-tab" className="circle-tab-panel circle-members-panel" id="circle-members-panel" role="tabpanel" tabIndex={0}>
          <div className="circle-section-heading"><div><h2>Circle members</h2><p>These are the people you can share Jars with.</p></div><span>{circleMembers.size} {circleMembers.size === 1 ? "person" : "people"}</span></div>
          <div className="circle-members-grid">
            {[...circleMembers.values()].map(({ person, label }) => (
              <article className="circle-person" key={person.username}>
                <PersonIdentity person={person} />
                <span className="circle-person__status is-connected">✓ {label}</span>
              </article>
            ))}
            {!circleMembers.size ? <p className="circle-list__empty">You don’t have anyone in your Circle yet. Add someone to your Circle before sending a Jar.</p> : null}
          </div>
        </section>
      ) : (
        <section aria-labelledby="circle-invites-tab" className="circle-tab-panel circle-invites-panel" id="circle-invites-panel" role="tabpanel" tabIndex={0}>
          <div className="circle-section-heading circle-invites-panel__heading"><div><h2>Add your people</h2><p>Invite someone by email or connect with an existing account.</p></div></div>

          <div className={`circle-add-options${plan.isOwner && reservedSeats < plan.seatLimit ? "" : " circle-add-options--single"}`}>
            {plan.isOwner && reservedSeats < plan.seatLimit ? <form action={inviteAction} className="circle-request-form circle-request-form--invite">
              <div><h3>Invite by email</h3><p>{emailReady ? "They’ll get an email to join your plan and Circle." : "Email delivery must be configured before a seat can be reserved."}</p></div>
              <label htmlFor="circle-invite-email">Their email</label><input autoComplete="email" id="circle-invite-email" name="email" placeholder="name@example.com" required type="email" />
              {inviteState.error || inviteError ? <p className="field-error" role="alert">{inviteState.error ?? inviteError}</p> : null}{inviteNotice ? <p className="circle-notice" role="status">{inviteNotice}</p> : null}
              <button className="button button--primary" disabled={invitePending || !emailReady} type="submit">{invitePending ? "Sending invitation…" : "Send invitation"}</button>
            </form> : null}

            <div className="circle-search-stack">
              <form action={searchAction} className="circle-request-form circle-request-form--search">
                <div><h3>Connect by username</h3><p>Find someone who already has an account.</p></div>
                <label htmlFor="circle-username">Exact username</label><div className="username-input circle-request-form__input"><span aria-hidden="true">@</span><input autoComplete="off" id="circle-username" name="username" pattern="[a-z][a-z0-9_]{2,29}" placeholder="anu" required /></div>
                {searchState.error ? <p className="field-error" role="alert">{searchState.error}</p> : null}
                <button className="button button--primary" disabled={searchPending} type="submit">{searchPending ? "Searching…" : "Find person"}</button>
              </form>
              {searchState.person ? <form action={action} className="circle-request-form circle-request-form--result"><PersonIdentity person={searchState.person} /><input name="username" type="hidden" value={searchState.person.username} />
                {state.error || error ? <p className="field-error" role="alert">{state.error ?? error}</p> : null}{notice ? <p className="circle-notice" role="status">{notice}</p> : null}
                <button className="button button--primary" disabled={pending} type="submit">{pending ? "Sending request…" : "Send a Circle request"}</button>
              </form> : notice || error ? <div>{notice ? <p className="circle-notice" role="status">{notice}</p> : null}{error ? <p className="field-error" role="alert">{error}</p> : null}</div> : null}
            </div>
          </div>

          {!inviteState.error && (inviteNotice || inviteError) && !(plan.isOwner && reservedSeats < plan.seatLimit) ? <div>{inviteNotice ? <p className="circle-notice" role="status">{inviteNotice}</p> : null}{inviteError ? <p className="field-error" role="alert">{inviteError}</p> : null}</div> : null}
          {plan.isOwner && !emailReady && plan.invitations.length > 0 ? <p className="circle-email-note">Automatic email is unavailable. Existing seats stay reserved, but they cannot be resent until email delivery is configured.</p> : null}

          <div className="circle-invite-activity">
            {plan.isOwner && plan.seatLimit > 1 ? <CircleList empty="No email invitations are waiting." title={`Email invitations (${plan.invitations.length})`}>{plan.invitations.map((email) => <div className="circle-person circle-person--invite" key={email}><div className="circle-invite-identity"><strong>{email}</strong><small>{emailReady ? "Seat reserved · awaiting signup" : "Seat reserved · email not sent"}</small></div><div className="circle-person__actions">{emailReady ? <form action={resendPlanInvitationAction}><input name="email" type="hidden" value={email} /><button type="submit">Resend</button></form> : null}<form action={cancelPlanInvitationAction}><input name="email" type="hidden" value={email} /><button className="delete-link" type="submit">Cancel</button></form></div></div>)}</CircleList> : null}
            <CircleList empty="No requests are waiting for you." title={`Requests to you (${incoming.length})`}>{incoming.map((connection) => <article className="circle-person circle-person--request" key={connection.id}><PersonIdentity person={connection.person} /><form action={respondCircleRequestAction} className="circle-person__actions"><input name="requestId" type="hidden" value={connection.id} /><button name="response" type="submit" value="accept">Accept</button><button name="response" type="submit" value="decline">Decline</button></form></article>)}</CircleList>
            {outgoing.length ? <CircleList title={`Waiting for a reply (${outgoing.length})`}>{outgoing.map((connection) => <CirclePerson connection={connection} key={connection.id} label="Pending" />)}</CircleList> : null}
          </div>
        </section>
      )}
    </section>
  );
}

function CircleList({ children, empty, title }: { children: React.ReactNode; empty?: string; title: string }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <section className="circle-list">
      <h3>{title}</h3>
      {hasChildren ? <div className="circle-list__rows">{children}</div> : <p className="circle-list__empty">{empty}</p>}
    </section>
  );
}

function CirclePerson({ connection, label }: { connection: CircleConnectionView; label: string }) {
  return (
    <article className="circle-person">
      <PersonIdentity person={connection.person} />
      <span className={`circle-person__status ${label === "Connected" ? "is-connected" : ""}`}>{label === "Connected" ? "✓ " : ""}{label}</span>
    </article>
  );
}

function PersonIdentity({ person }: { person: CircleConnectionView["person"] }) {
  const initials = person.displayName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="circle-person__identity">
      <span aria-hidden="true" className="circle-avatar">{initials}</span>
      <span><strong>{person.displayName}</strong><small>@{person.username}</small></span>
    </div>
  );
}
