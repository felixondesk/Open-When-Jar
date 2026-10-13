"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { AuthCaptcha } from "@/components/AuthCaptcha";
import { getAdminAccess } from "@/lib/admin";
import { createClient } from "@/lib/supabase/client";

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

export function AdminLogin({ signedInAdmin = false }: { signedInAdmin?: boolean }) {
  const [email, setEmail] = useState("");
  const [sentEmail, setSentEmail] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [token, setToken] = useState("");
  const [mfaToken, setMfaToken] = useState("");
  const [factorId, setFactorId] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [totpSecret, setTotpSecret] = useState("");
  const [mfaMode, setMfaMode] = useState<"" | "enroll" | "challenge">("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaAttempt, setCaptchaAttempt] = useState<object>({});
  const [verifying, setVerifying] = useState(false);
  const [checkingMfa, setCheckingMfa] = useState(signedInAdmin);
  const mfaCheckStarted = useRef(false);
  const codeSent = Boolean(sentEmail);
  const hasAdminSession = signedInAdmin || otpVerified;

  useEffect(() => {
    if (!signedInAdmin || mfaCheckStarted.current) return;
    mfaCheckStarted.current = true;
    void checkMfa();
  }, [signedInAdmin]);

  async function checkMfa() {
    setCheckingMfa(true);
    try {
      await startMfa(createClient());
    } catch {
      setError("We couldn’t check two-step verification. Please try again.");
    } finally {
      setCheckingMfa(false);
    }
  }

  async function startMfa(supabase: ReturnType<typeof createClient>) {
    setError("");
    const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
    if (factorsError) {
      setError("We couldn’t check two-step verification. Please try again.");
      return;
    }

    const verifiedTotp = factors.totp.find((factor) => factor.status === "verified");
    if (verifiedTotp) {
      setFactorId(verifiedTotp.id);
      setMfaMode("challenge");
      return;
    }

    const { data: enrollment, error: enrollmentError } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Open When Jar admin",
    });
    if (enrollmentError) {
      setError("We couldn’t start two-step verification. Please try again.");
      return;
    }

    setFactorId(enrollment.id);
    setQrCode(enrollment.totp.qr_code);
    setTotpSecret(enrollment.totp.secret);
    setMfaMode("enroll");
  }

  async function sendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    if (sending) return;
    if (!captchaToken) {
      setError("Complete the security check and try again.");
      return;
    }

    setError("");
    setSending(true);
    try {
      const supabase = createClient();
      const { error: sendError } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: { shouldCreateUser: false, captchaToken },
      });

      if (sendError) {
        const message = sendError.message.toLowerCase();
        setError(sendError.code === "captcha_failed" || message.includes("captcha")
          ? "The security check failed or expired. Complete it again and try again."
          : message.includes("rate")
            ? "A code was requested recently. Wait a minute, then try again."
            : message.includes("fetch") || sendError.status === 0
              ? "Couldn’t reach Supabase. Check your internet connection and project URL, then try again."
              : "We couldn’t send a code. Confirm the account exists and that Supabase email delivery is configured.");
        return;
      }

      setSentEmail(normalizedEmail);
    } catch {
      setError("Couldn’t send a code. Check your connection and try again.");
    } finally {
      setSending(false);
      setCaptchaToken("");
      setCaptchaAttempt({});
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedToken = token.replace(/\s/g, "");
    if (!/^\d{6,10}$/.test(normalizedToken)) {
      setError("Enter the complete verification code from the email (6–10 digits).");
      return;
    }

    setError("");
    setVerifying(true);
    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: sentEmail,
      token: normalizedToken,
      type: "email",
    });

    if (verifyError) {
      setVerifying(false);
      setError("That code is invalid or has expired. Request a new code and try again.");
      return;
    }

    const { data } = await supabase.auth.getClaims();
    const claims = data?.claims as Record<string, unknown> | undefined;
    if (!getAdminAccess(claims).hasAdminRole) {
      await supabase.auth.signOut();
      setVerifying(false);
      setError("This account has not been assigned administrator access.");
      return;
    }

    setOtpVerified(true);
    setCheckingMfa(true);
    try {
      await startMfa(supabase);
    } catch {
      setError("We couldn’t check two-step verification. Please try again.");
    } finally {
      setCheckingMfa(false);
      setVerifying(false);
    }
  }

  async function verifyMfa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedToken = mfaToken.replace(/\s/g, "");
    if (!/^\d{6}$/.test(normalizedToken)) {
      setError("Enter the six-digit code from your authenticator app.");
      return;
    }

    setError("");
    setVerifying(true);
    const supabase = createClient();
    const { error: mfaError } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code: normalizedToken,
    });

    if (mfaError) {
      setVerifying(false);
      setError("That authenticator code is invalid or expired. Enter the latest code and try again.");
      return;
    }

    window.location.assign("/admin");
  }

  function changeEmail() {
    setSentEmail("");
    setToken("");
    setError("");
  }

  return (
    <main className="admin-gate">
      <section className="admin-login-card">
        <span className="paper-sprig" aria-hidden="true">❦</span>
        <p className="admin-login-card__eyebrow">Open When Jar · Admin</p>
        <h1>{mfaMode === "enroll" ? "Secure your account." : mfaMode === "challenge" || hasAdminSession ? "Two-step verification." : codeSent ? "Check your inbox." : "Admin sign in."}</h1>
        <p>{mfaMode === "enroll" ? "Scan this QR code in your authenticator app, then enter its six-digit code." : mfaMode === "challenge" ? "Enter the current code from your authenticator app." : hasAdminSession ? "Finish two-step verification to open the portal." : codeSent ? `Enter the verification code sent to ${sentEmail}.` : "Use an email address that has administrator access."}</p>

        {checkingMfa ? <p role="status">Checking two-step verification…</p> : hasAdminSession && !mfaMode ? (
          <div className="admin-login-card__form">
            {error ? <p className="field-error" role="alert">{error}</p> : null}
            <button className="button button--primary" onClick={() => void checkMfa()} type="button">Try again</button>
            <button className="admin-login-card__change" onClick={async () => { const { error: signOutError } = await createClient().auth.signOut(); if (signOutError) setError("We couldn’t sign out. Please try again."); else window.location.assign("/admin"); }} type="button">Use a different account</button>
          </div>
        ) : mfaMode ? (
          <form className="admin-login-card__form" onSubmit={verifyMfa}>
            {mfaMode === "enroll" ? (
              <div className="admin-mfa-setup">
                {/* Supabase returns a self-contained SVG data URL for authenticator enrollment. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt="QR code for Open When Jar admin two-step verification" src={qrCode} />
                <span>Can’t scan it? Enter this key:</span>
                <code>{totpSecret}</code>
              </div>
            ) : null}
            <label htmlFor="admin-mfa">Authenticator code</label>
            <input
              autoComplete="one-time-code"
              autoFocus
              className="admin-otp-input"
              id="admin-mfa"
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => setMfaToken(event.target.value)}
              pattern="[0-9]{6}"
              placeholder="000000"
              required
              type="text"
              value={mfaToken}
            />
            {error ? <p className="field-error" role="alert">{error}</p> : null}
            <button className="button button--primary" disabled={verifying} type="submit">
              {verifying ? "Verifying…" : mfaMode === "enroll" ? "Enable MFA and open portal" : "Verify and open portal"}
            </button>
          </form>
        ) : codeSent ? (
          <form className="admin-login-card__form" onSubmit={verifyCode}>
            <label htmlFor="admin-otp">Email verification code</label>
            <input
              autoComplete="one-time-code"
              autoFocus
              className="admin-otp-input"
              id="admin-otp"
              inputMode="numeric"
              maxLength={10}
              onChange={(event) => setToken(event.target.value)}
              pattern="[0-9]{6,10}"
              placeholder="Enter email code"
              required
              type="text"
              value={token}
            />
            {error ? <p className="field-error" role="alert">{error}</p> : null}
            <button className="button button--primary" disabled={verifying} type="submit">
              {verifying ? "Verifying…" : "Verify and open portal"}
            </button>
            <button className="admin-login-card__change" onClick={changeEmail} type="button">Use a different email</button>
          </form>
        ) : (
          <form className="admin-login-card__form" onSubmit={sendCode}>
            <label htmlFor="admin-email">Admin email</label>
            <input
              autoComplete="email"
              autoFocus
              className="admin-email-input"
              id="admin-email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              type="email"
              value={email}
            />
            {error ? <p className="field-error" role="alert">{error}</p> : null}
            <AuthCaptcha attempt={captchaAttempt} onToken={setCaptchaToken} />
            <button className="button button--primary" disabled={sending || !captchaToken} type="submit">
              {sending ? "Sending…" : "Email me a code"}
            </button>
          </form>
        )}
        <small className="admin-login-card__privacy">Only accounts with the signed admin role can open the portal. Private letters and media remain inaccessible.</small>
      </section>
    </main>
  );
}
