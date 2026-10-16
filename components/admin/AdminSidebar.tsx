"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { signOutAction } from "@/app/auth/actions";
import { AdminIcon } from "./AdminIcon";

const items = [
  { href: "/admin", label: "Overview", icon: "home" },
  { href: "/admin/records?kind=jars", label: "Jars", icon: "jar", kind: "jars" },
  { href: "/admin/records?kind=people", label: "People", icon: "people", kind: "people" },
  { href: "/admin/records?kind=plans", label: "Plans & members", icon: "document", kind: "plans" },
  { href: "/admin/records?kind=payments", label: "Payments", icon: "card", kind: "payments" },
  { href: "/admin/records?kind=orders", label: "Legacy orders", icon: "orders", kind: "orders" },
  { href: "/admin/analytics", label: "Analytics", icon: "revenue" },
  { href: "/admin/requests", label: "Request inbox", icon: "mail" },
] as const;

export function AdminSidebar() {
  const pathname = usePathname();
  const params = useSearchParams();
  return <aside className="admin-sidebar">
    <div className="admin-brand"><Link href="/" aria-label="Open When Jar home"><Image className="admin-brand__mark" src="/open-when-jar-mark.png" width={38} height={38} alt="" /><strong>Open When Jar</strong></Link><small>Admin</small></div>
    <nav aria-label="Admin sections">{items.map((item) => {
      const active = "kind" in item
        ? pathname === "/admin/records" && (params.get("kind") || "jars") === item.kind
        : item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href);
      return <Link href={item.href} key={item.href} className={active ? "is-active" : ""} aria-current={active ? "page" : undefined}><AdminIcon name={item.icon} /><span>{item.label}</span></Link>;
    })}</nav>
    <div className="admin-sidebar__footer"><Link href="/app"><AdminIcon name="back" />Back to app</Link><form action={signOutAction}><button type="submit"><AdminIcon name="logout" />Sign out</button></form></div>
  </aside>;
}
