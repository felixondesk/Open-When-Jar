import { Brand } from "@/components/ui";

export default function WorkspaceLoading() {
  return (
    <main className="workspace-shell" aria-busy="true">
      <header className="workspace-header"><Brand /></header>
      <div className="workspace-loading" role="status"><span aria-hidden="true">❦</span><p>Opening your workspace…</p></div>
    </main>
  );
}
