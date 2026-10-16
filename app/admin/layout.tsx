import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { getAdminAccess } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!getAdminAccess(data?.claims).isAdmin) return children;
  return <div className="admin-shell"><AdminSidebar /><div className="admin-content">{children}</div></div>;
}
