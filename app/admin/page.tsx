import Link from "next/link";
import { signOutAction } from "@/app/auth/actions";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { AdminPortal } from "@/components/admin/AdminPortal";
import { getAdminAccess, parseAdminSnapshot } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Admin — Open When Jar",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims as Record<string, unknown> | undefined;
  const userId = typeof claims?.sub === "string" ? claims.sub : null;
  if (!userId) return <AdminLogin />;

  const access = getAdminAccess(claims);
  if (access.hasAdminRole && !access.hasAal2) return <AdminLogin signedInAdmin />;
  if (!access.isAdmin) return <AdminAccessNotice reason="role" />;

  const [profileResult, snapshotResult] = await Promise.all([
    supabase.from("profiles").select("username, display_name").eq("id", userId).maybeSingle(),
    supabase.rpc("admin_dashboard_snapshot"),
  ]);

  const snapshot = parseAdminSnapshot(snapshotResult.data);
  if (snapshotResult.error || !snapshot) {
    return <AdminAccessNotice reason="unavailable" />;
  }

  const email = typeof claims?.email === "string" ? claims.email : "admin";
  const emailName = email.split("@")[0] || "admin";

  return (
    <AdminPortal
      adminName={profileResult.data?.display_name || emailName}
      adminUsername={profileResult.data?.username || emailName}
      snapshot={snapshot}
    />
  );
}

function AdminAccessNotice({ reason }: { reason: "role" | "unavailable" }) {
  const copy = reason === "role"
    ? { title: "Admin role required", body: "This account has not been granted the private admin role." }
    : { title: "Admin data is unavailable", body: "The secure dashboard snapshot could not be loaded. No private content was exposed." };

  return (
    <main className="admin-gate">
      <section>
        <span className="paper-sprig" aria-hidden="true">❦</span>
        <p>Open When Jar · Admin</p>
        <h1>{copy.title}</h1>
        <p>{copy.body}</p>
        <div>
          <Link className="button button--secondary" href="/app">Back to my jars</Link>
          <form action={signOutAction}><button className="button button--primary" type="submit">Sign out</button></form>
        </div>
      </section>
    </main>
  );
}
