"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { RECEIVED_JARS_UPDATED } from "@/components/ReceivedNavLink";

const ENABLED_KEY = "open-when-jar:desktop-alerts:v1";
const PUSH_SEEN_KEY = "open-when-jar:seen-alerts:v2";
const READ_KEY = "open-when-jar:read-alerts:v1";
const POLL_INTERVAL_MS = 60_000;

type NotificationEvent = {
  body: string;
  id: string;
  occurredAt: string;
  title: string;
  type: "jar_received" | "envelope_ready" | "circle_request_received" | "circle_request_accepted" | "circle_request_declined";
  url: string;
};

type DesktopState = "unsupported" | "off" | "on" | "blocked";

function storedIds(key: string) {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "[]");
    return new Set<string>(Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []);
  } catch {
    return new Set<string>();
  }
}

function rememberIds(key: string, ids: Iterable<string>) {
  localStorage.setItem(key, JSON.stringify([...ids].slice(-300)));
}

function relativeTime(value: string) {
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (elapsedSeconds < 60) return "Just now";
  if (elapsedSeconds < 3_600) return `${Math.floor(elapsedSeconds / 60)}m ago`;
  if (elapsedSeconds < 86_400) return `${Math.floor(elapsedSeconds / 3_600)}h ago`;
  if (elapsedSeconds < 604_800) return `${Math.floor(elapsedSeconds / 86_400)}d ago`;
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" }).format(new Date(value));
}

export function NotificationCenter() {
  const [desktopState, setDesktopState] = useState<DesktopState>("off");
  const [events, setEvents] = useState<NotificationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const pollingRef = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const showDesktopNotification = useCallback(async (event: NotificationEvent) => {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(event.title, {
      body: event.body,
      tag: event.id,
      icon: "/jar-illustration.png",
      badge: "/jar-illustration.png",
      data: { url: event.url },
    });
  }, []);

  const poll = useCallback(async (baselineDesktopAlerts = false) => {
    if (pollingRef.current) return;
    pollingRef.current = true;
    try {
      const response = await fetch("/api/notifications", { cache: "no-store", credentials: "same-origin" });
      if (!response.ok) return;
      const payload = await response.json() as { events: NotificationEvent[] };
      setEvents(payload.events);
      window.dispatchEvent(new CustomEvent(RECEIVED_JARS_UPDATED, {
        detail: payload.events.filter((event) => event.type === "jar_received").map((event) => event.id.slice(4)),
      }));

      if ("Notification" in window && Notification.permission === "granted" && localStorage.getItem(ENABLED_KEY) === "true") {
        const pushSeen = storedIds(PUSH_SEEN_KEY);
        const unseen = baselineDesktopAlerts ? [] : payload.events.filter((event) => !pushSeen.has(event.id));
        for (const event of unseen.toReversed()) await showDesktopNotification(event);
        payload.events.forEach((event) => pushSeen.add(event.id));
        rememberIds(PUSH_SEEN_KEY, pushSeen);
      }
    } catch {
      // Temporary fetch or desktop-alert failures should not break the workspace.
    } finally {
      setLoading(false);
      pollingRef.current = false;
    }
  }, [showDesktopNotification]);

  useEffect(() => {
    setReadIds(storedIds(READ_KEY));
    const desktopSupported = "Notification" in window && "serviceWorker" in navigator;
    if (desktopSupported) {
      void navigator.serviceWorker.register("/sw.js", { scope: "/" });
      const enabled = localStorage.getItem(ENABLED_KEY) === "true";
      setDesktopState(Notification.permission === "denied" ? "blocked" : enabled && Notification.permission === "granted" ? "on" : "off");
    } else {
      setDesktopState("unsupported");
    }

    void poll(localStorage.getItem(PUSH_SEEN_KEY) === null);
    const timer = window.setInterval(() => void poll(), POLL_INTERVAL_MS);
    const checkOnFocus = () => void poll();
    const checkOnVisibility = () => {
      if (document.visibilityState === "visible") void poll();
    };
    window.addEventListener("focus", checkOnFocus);
    document.addEventListener("visibilitychange", checkOnVisibility);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", checkOnFocus);
      document.removeEventListener("visibilitychange", checkOnVisibility);
    };
  }, [poll]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const unreadCount = events.filter((event) => !readIds.has(event.id)).length;

  function togglePanel() {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen && events.length) {
      const nextReadIds = new Set(readIds);
      events.forEach((event) => nextReadIds.add(event.id));
      setReadIds(nextReadIds);
      rememberIds(READ_KEY, nextReadIds);
    }
  }

  async function enableDesktopAlerts() {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setDesktopState(permission === "denied" ? "blocked" : "off");
      return;
    }
    localStorage.setItem(ENABLED_KEY, "true");
    await poll(true);
    setDesktopState("on");
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification("Desktop alerts are on", {
      body: "We’ll alert you about new Jars, letters, and Circle activity while Open When Jar is open.",
      tag: "alerts-enabled",
      icon: "/jar-illustration.png",
      badge: "/jar-illustration.png",
      data: { url: "/app" },
    });
  }

  function disableDesktopAlerts() {
    localStorage.removeItem(ENABLED_KEY);
    setDesktopState("off");
  }

  const bell = <svg aria-hidden="true" fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="20"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" /><path d="M10 21h4" /></svg>;

  return (
    <div className="notification-center" ref={rootRef}>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"}
        className={`notification-toggle${open ? " is-open" : ""}`}
        title="Notifications"
        type="button"
        onClick={togglePanel}
      >
        {bell}
        {unreadCount ? <span className="notification-toggle__count">{unreadCount > 9 ? "9+" : unreadCount}</span> : null}
      </button>

      {open ? (
        <section aria-label="Notifications" className="notification-panel" role="dialog">
          <header className="notification-panel__header">
            <div><span>Updates</span><h2>Notifications</h2></div>
            <button aria-label="Close notifications" type="button" onClick={() => setOpen(false)}>×</button>
          </header>

          <div className="notification-panel__desktop">
            {desktopState === "on" ? (
              <><span><strong>Desktop alerts are on</strong><small>Alerts appear while this app is open.</small></span><button type="button" onClick={disableDesktopAlerts}>Turn off</button></>
            ) : desktopState === "off" ? (
              <><span><strong>Get desktop alerts</strong><small>For new Jars, letters, and Circle updates.</small></span><button type="button" onClick={() => void enableDesktopAlerts()}>Enable</button></>
            ) : desktopState === "blocked" ? (
              <span><strong>Desktop alerts are blocked</strong><small>Allow notifications in your browser’s site settings.</small></span>
            ) : (
              <span><strong>In-app notifications are on</strong><small>Desktop alerts aren’t supported in this browser.</small></span>
            )}
          </div>

          <div className="notification-panel__list">
            {loading ? <p className="notification-panel__empty">Checking for updates…</p> : events.length ? events.map((event) => (
              <Link className="notification-item" href={event.url} key={event.id} onClick={() => setOpen(false)}>
                <span aria-hidden="true" className={`notification-item__icon notification-item__icon--${event.type}`}>{event.type.startsWith("circle") ? "♡" : event.type === "jar_received" ? "✉" : "✦"}</span>
                <span><strong>{event.title}</strong><small>{event.body}</small><time dateTime={event.occurredAt}>{relativeTime(event.occurredAt)}</time></span>
              </Link>
            )) : <p className="notification-panel__empty">You’re all caught up. New Jar and Circle activity will appear here.</p>}
          </div>
        </section>
      ) : null}
    </div>
  );
}
