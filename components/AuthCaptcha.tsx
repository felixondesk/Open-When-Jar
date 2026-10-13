"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { TURNSTILE_SITE_KEY } from "@/lib/captcha";

type Turnstile = {
  render: (container: HTMLElement, options: {
    sitekey: string;
    theme: "light";
    size: "flexible";
    "response-field": false;
    callback: (token: string) => void;
    "expired-callback": () => void;
    "error-callback": () => void;
    "timeout-callback": () => void;
  }) => string;
  remove: (id: string) => void;
};

declare global {
  interface Window { turnstile?: Turnstile }
}

export function AuthCaptcha({ attempt, onToken }: {
  attempt: object;
  onToken: (token: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [token, setToken] = useState("");

  useEffect(() => {
    if (!scriptReady || !container.current || !window.turnstile) return;
    const api = window.turnstile;
    let active = true;
    setError(false);
    setToken("");
    onToken("");
    const clearToken = () => { if (active) { setToken(""); onToken(""); } };
    let id: string | undefined;
    try {
      id = api.render(container.current, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: "light",
        size: "flexible",
        "response-field": false,
        callback: (value) => { if (active) { setError(false); setToken(value); onToken(value); } },
        "expired-callback": clearToken,
        "timeout-callback": () => { clearToken(); if (active) setError(true); },
        "error-callback": () => { clearToken(); if (active) setError(true); },
      });
    } catch { setError(true); }
    return () => { active = false; if (id) api.remove(id); };
  }, [scriptReady, attempt, retry, onToken]);

  return (
    <div className="auth-verification">
      <Script id="auth-turnstile" src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive" onReady={() => setScriptReady(true)} onError={() => setError(true)} />
      <div ref={container} />
      <input name="captchaToken" type="hidden" value={token} />
      {error ? <p className="field-error" role="alert">Verification could not load. <button type="button" onClick={() => {
        if (window.turnstile) setRetry((value) => value + 1);
        else window.location.reload();
      }}>Try again</button></p> : !token ? <p role="status">Complete the security check to continue.</p> : null}
    </div>
  );
}
