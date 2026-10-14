"use client";

import Link, { useLinkStatus } from "next/link";
import type { ComponentProps } from "react";

export function NavigationLink({ children, ...props }: ComponentProps<typeof Link>) {
  return <Link {...props}>{children}<NavigationPending /></Link>;
}

function NavigationPending() {
  const { pending } = useLinkStatus();
  return pending ? <span className="navigation-progress" role="status"><span className="sr-only">Loading page…</span></span> : null;
}
