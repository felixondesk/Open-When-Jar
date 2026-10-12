"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export const RECEIVED_JARS_UPDATED = "open-when-jar:received-jars-updated";

type Props = { jarIds: string[]; userId: string; active: boolean };

function readSeenIds(key: string) {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    return new Set(Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : []);
  } catch {
    return new Set<string>();
  }
}

export function ReceivedNavLink({ jarIds, userId, active }: Props) {
  const [unseenCount, setUnseenCount] = useState(0);

  useEffect(() => {
    const key = `open-when-jar:seen-received-jars:v1:${userId}`;
    const seenIds = readSeenIds(key);
    const update = (ids: string[]) => {
      if (active) {
        jarIds.forEach((id) => seenIds.add(id));
        try { localStorage.setItem(key, JSON.stringify([...seenIds])); } catch { /* Badge still works for this visit. */ }
      }
      setUnseenCount(active ? 0 : ids.filter((id) => !seenIds.has(id)).length);
    };

    update(jarIds);
    const onNotificationUpdate = (event: Event) => {
      const ids = (event as CustomEvent<string[]>).detail;
      if (Array.isArray(ids)) update([...new Set([...jarIds, ...ids])]);
    };
    window.addEventListener(RECEIVED_JARS_UPDATED, onNotificationUpdate);
    return () => window.removeEventListener(RECEIVED_JARS_UPDATED, onNotificationUpdate);
  }, [active, jarIds, userId]);

  return (
    <Link aria-current={active ? "page" : undefined} aria-label={unseenCount ? `Received, ${unseenCount} new ${unseenCount === 1 ? "Jar" : "Jars"}` : "Received"} className={active ? "is-active" : ""} href="/app?view=received">
      <span>Received</span>
      {unseenCount > 0 ? <span aria-hidden="true" className="workspace-nav-badge">{unseenCount > 9 ? "9+" : unseenCount}</span> : null}
    </Link>
  );
}
