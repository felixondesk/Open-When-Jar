"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signInAction, signUpAction, type AuthFormState } from "@/app/auth/actions";
import { GoogleSignInButton } from "./GoogleSignInButton";
import { Button, Field } from "./ui";
import { AuthCaptcha } from "./AuthCaptcha";

const INITIAL_STATE: AuthFormState = {};

export function AuthForms({ initialMode = "signin" }: { initialMode?: "signin" | "signup" }) {
  return (
    <div className="auth-card">
      <nav className="auth-tabs" aria-label="Account access">
        <Link aria-current={initialMode === "signin" ? "page" : undefined} className={initialMode === "signin" ? "is-selected" : ""} href="/auth">Sign in</Link>
        <Link aria-current={initialMode === "signup" ? "page" : undefined} className={initialMode === "signup" ? "is-selected" : ""} href="/auth?mode=signup">Create account</Link>
      </nav>
      {initialMode === "signin" ? <SignInForm /> : <SignUpForm />}
    </div>
  );
}

function SignInForm() {
  const [state, action, pending] = useActionState(signInAction, INITIAL_STATE);
  const [captchaToken, setCaptchaToken] = useState("");
  return (
    <div className="auth-form">
      <h1>Welcome back.</h1>
      <p>Your sent and received jars are waiting on your shelf.</p>
      <div className="oauth-block">
        <GoogleSignInButton />
        <div className="auth-divider"><span>or use email</span></div>
      </div>
      <form action={action} className="auth-email-form">
        <Field label="Email"><input name="email" type="email" autoComplete="email" required /></Field>
        <Field label="Password"><input name="password" type="password" autoComplete="current-password" required /></Field>
        {state.error ? <p className="field-error" role="alert">{state.error}</p> : null}
        <AuthCaptcha attempt={state} onToken={setCaptchaToken} />
        <Button disabled={pending || !captchaToken} type="submit">{pending ? "Signing in…" : "Sign in"}</Button>
      </form>
      <p className="auth-help"><Link href="/auth/forgot-password">Forgot password?</Link></p>
    </div>
  );
}

function SignUpForm() {
  const [state, action, pending] = useActionState(signUpAction, INITIAL_STATE);
  const [captchaToken, setCaptchaToken] = useState("");
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [formValues, setFormValues] = useState({ username: "", displayName: "", email: "" });
  return (
    <div className="auth-form">
      <h1>Make your shelf.</h1>
      <p>Choose a username friends can find. If you were invited, sign up with the same email to claim your seat.</p>
      <form action={action} className="auth-email-form">
        <div className="oauth-block">
          <GoogleSignInButton ageConfirmed={ageConfirmed} signup />
          <div className="auth-divider"><span>or use email</span></div>
        </div>
        <Field label="Username" hint="3–30 lowercase letters, numbers, or underscores. This can’t be changed yet."><div className="username-input"><span>@</span><input autoComplete="username" maxLength={30} name="username" onChange={(event) => setFormValues((current) => ({ ...current, username: event.target.value }))} pattern="[a-z][a-z0-9_]{2,29}" required type="text" value={formValues.username} /></div></Field>
        <Field label="Name people see"><input autoComplete="name" maxLength={60} name="displayName" onChange={(event) => setFormValues((current) => ({ ...current, displayName: event.target.value }))} required type="text" value={formValues.displayName} /></Field>
        <Field label="Email" hint="Used only for sign-in, confirmation, and account security—not for sending jars."><input autoComplete="email" name="email" onChange={(event) => setFormValues((current) => ({ ...current, email: event.target.value }))} required type="email" value={formValues.email} /></Field>
        <Field label="Password" hint="At least 8 characters."><input name="password" type="password" autoComplete="new-password" minLength={8} required /></Field>
        <label className="age-confirmation"><input checked={ageConfirmed} name="ageConfirmed" onChange={(event) => setAgeConfirmed(event.target.checked)} required type="checkbox" /><span>I confirm I am at least 18.</span></label>
        <p className="auth-legal">By continuing, you agree to the <Link href="/terms">Terms of Use</Link> and acknowledge the <Link href="/privacy">Privacy Notice</Link>.</p>
        {state.error ? <p className="field-error" role="alert">{state.error}</p> : null}
        <AuthCaptcha attempt={state} onToken={setCaptchaToken} />
        <Button disabled={pending || !captchaToken} type="submit">{pending ? "Creating account…" : "Create my account"}</Button>
      </form>
    </div>
  );
}
