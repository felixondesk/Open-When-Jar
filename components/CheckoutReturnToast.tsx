"use client";

import { useEffect, useState } from "react";

const CHECKOUT_QUERY_PARAMETERS = ["checkout", "intent", "payment_id", "status", "email"];

export function CheckoutReturnToast({ show }: { show: boolean }) {
  const [visible, setVisible] = useState(show);

  useEffect(() => {
    if (!show) return;

    setVisible(true);

    const url = new URL(window.location.href);
    for (const parameter of CHECKOUT_QUERY_PARAMETERS) url.searchParams.delete(parameter);
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, [show]);

  useEffect(() => {
    if (!visible) return;

    const timeout = window.setTimeout(() => setVisible(false), 7000);
    return () => window.clearTimeout(timeout);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="toast toast--checkout" role="status" aria-live="polite">
      <span>Dodo sent you back. Your Jar balance updates when its signed payment confirmation succeeds. Refresh if your balance hasn’t changed yet.</span>
      <button aria-label="Dismiss notification" onClick={() => setVisible(false)} type="button">×</button>
    </div>
  );
}
