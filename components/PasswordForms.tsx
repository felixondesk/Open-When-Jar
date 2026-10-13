"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { forgotPasswordAction, resetPasswordAction, signOutAction, updatePasswordAction, type PasswordFormState } from "@/app/auth/actions";
import { Button, Field } from "./ui";
import { AuthCaptcha } from "./AuthCaptcha";

const INITIAL_STATE: PasswordFormState = {};

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(forgotPasswordAction, INITIAL_STATE);
  const [captchaToken, setCaptchaToken] = useState("");
  return (
    <div className="auth-form">
      <h1>Reset your password.</h1>
      <p>Enter the email you used to create your account. We’ll send you a link to set a new password.</p>
      <form action={action} className="auth-email-form">
        <Field label="Email"><input autoComplete="email" name="email" required type="email" /></Field>
        {state.error ? <p className="field-error" role="alert">{state.error}</p> : null}
        {state.success ? <p className="auth-success" role="status">{state.success}</p> : null}
        <AuthCaptcha attempt={state} onToken={setCaptchaToken} />
        <Button disabled={pending || !captchaToken} type="submit">{pending ? "Sending…" : "Send reset link"}</Button>
      </form>
      <p className="auth-help"><Link href="/auth">Back to sign in</Link></p>
    </div>
  );
}

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(resetPasswordAction, INITIAL_STATE);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);

  return (
    <div className="auth-form">
      <h1>Choose a new password.</h1>
      <p>Use a password you haven’t used for this account before.</p>
      <form action={action} className="auth-email-form" ref={formRef}>
        <Field label="New password" hint="At least 8 characters."><input autoComplete="new-password" minLength={8} name="password" required type="password" /></Field>
        <Field label="Confirm new password"><input autoComplete="new-password" minLength={8} name="confirmPassword" required type="password" /></Field>
        {state.error ? <p className="field-error" role="alert">{state.error}</p> : null}
        {state.success ? <p className="auth-success" role="status">{state.success}</p> : null}
        <Button disabled={pending} type="submit">{pending ? "Updating…" : "Set new password"}</Button>
      </form>
      {state.success ? <form action={signOutAction}><Button type="submit" variant="secondary">Sign out</Button></form> : null}
      <p className="auth-help"><Link href="/auth/forgot-password">Request another reset link</Link></p>
    </div>
  );
}

export function UpdatePasswordForm() {
  const [state, action, pending] = useActionState(updatePasswordAction, INITIAL_STATE);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);

  return (
    <form action={action} className="auth-email-form account-password-form" ref={formRef}>
      <Field label="Current password"><input autoComplete="current-password" name="currentPassword" required type="password" /></Field>
      <Field label="New password" hint="At least 8 characters."><input autoComplete="new-password" minLength={8} name="password" required type="password" /></Field>
      <Field label="Confirm new password"><input autoComplete="new-password" minLength={8} name="confirmPassword" required type="password" /></Field>
      {state.error ? <p className="field-error" role="alert">{state.error}</p> : null}
      {state.success ? <p className="auth-success" role="status">{state.success}</p> : null}
      <Button disabled={pending} type="submit">{pending ? "Updating…" : "Update password"}</Button>
      <p className="account-card__note">Forgot your current password? <Link href="/auth/forgot-password">Reset it by email.</Link></p>
    </form>
  );
}
