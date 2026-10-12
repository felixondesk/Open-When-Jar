"use client";

import { useState } from "react";

export function GoogleSignInButton({ signup = false, ageConfirmed = false }: { signup?: boolean; ageConfirmed?: boolean }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function startSignUpWithGoogle() {
    setError("");
    if (!ageConfirmed) {
      setError("Confirm that you are at least 18 to create an account.");
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oauthIntent: "signup", ageConfirmed }),
      });
      const result = await response.json() as { error?: string; url?: unknown };
      if (!response.ok || typeof result.url !== "string") {
        setError(result.error === "age"
          ? "Confirm that you are at least 18 to create an account."
          : "Google sign-in could not start. Please try again or use email.");
        setPending(false);
        return;
      }
      window.location.assign(result.url);
    } catch {
      setError("Google sign-in could not start. Please try again or use email.");
      setPending(false);
    }
  }

  if (!signup) {
    return <a className="google-sign-in" href="/auth/google"><span aria-hidden="true">G</span>Continue with Google</a>;
  }

  return (
    <>
      <button className="google-sign-in" disabled={pending} onClick={startSignUpWithGoogle} type="button">
        <span aria-hidden="true">G</span>
        {pending ? "Opening Google…" : "Continue with Google"}
      </button>
      {error ? <p className="field-error" role="alert">{error}</p> : null}
    </>
  );
}
