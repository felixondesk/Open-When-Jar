import Link from "next/link";
import { AdminIcon, type IconName } from "@/components/admin/AdminIcon";
import { PromoCodeForm, type PromoCode } from "./PromoCodeForm";

export type PromoRow = PromoCode & { redemptions: number };
type PromoState = "active" | "inactive" | "expired" | "used_up";
const STATE_LABELS: Record<PromoState, string> = { active: "Active", inactive: "Inactive", expired: "Expired", used_up: "Used up" };
const DAY = 86_400_000;

export function PromoCodesView({ rows, editing, error }: { rows: PromoRow[]; editing?: PromoRow; error?: boolean }) {
  const today = new Date().toISOString().slice(0, 10);
  const states = new Map(rows.map((row) => [row.id, promoState(row, today)]));
  const daysLeft = (row: PromoRow) => Math.round((Date.parse(row.valid_until) - Date.parse(today)) / DAY);
  const activeCount = rows.filter((row) => states.get(row.id) === "active").length;

  return <main className="admin-requests-page admin-promos-page">
    <header><div><Link href="/admin">← Dashboard</Link><h1>Promo codes</h1><p>Percentage discounts customers can enter before paying for a plan.</p></div></header>

    <section className="admin-metrics" aria-label="Promo code totals">
      <Metric icon="tag" label="Active codes" tone="leaf" value={activeCount} />
      <Metric icon="card" label="Paid uses" tone="mulberry" value={rows.reduce((sum, row) => sum + row.redemptions, 0)} />
      <Metric icon="clock" label="Ending within 7 days" tone="gold" value={rows.filter((row) => states.get(row.id) === "active" && daysLeft(row) < 7).length} />
      <Metric icon="alert" label="Not usable" tone="coral" value={rows.length - activeCount} />
    </section>

    <section className="admin-panel admin-promo-editor" aria-labelledby="promo-editor-heading">
      <div className="admin-panel__heading">
        <div><h2 id="promo-editor-heading">{editing ? <>Edit <span className="promo-voucher">{editing.code}</span></> : "New promo code"}</h2>
          <p>{editing ? "The code can’t change once created. Everything else applies to the next checkout." : "Customers type the code on the plan screen. Each account can use a code once."}</p></div>
        {editing ? <Link className="admin-text-action" href="/admin/promos">Cancel editing</Link> : null}
      </div>
      <PromoCodeForm key={editing?.id ?? "new"} promo={editing} />
    </section>

    <section className="admin-panel admin-table-panel">
      <div className="admin-panel__heading admin-panel__heading--table"><div><h2>All codes</h2><p>Uses count paid checkouts. The cap also holds back checkouts opened in the last 24 hours.</p></div><span>{rows.length} {rows.length === 1 ? "code" : "codes"}</span></div>
      {error ? <p className="admin-promo-empty field-error" role="alert">Promo codes couldn’t load. Refresh the page to try again.</p>
        : !rows.length ? <p className="admin-promo-empty">No promo codes yet. Create one above and it will appear here.</p>
        : <div className="admin-table-wrap"><table className="admin-table admin-promo-table">
          <thead><tr><th>Code</th><th>Discount</th><th>Valid till</th><th>Status</th><th>Uses</th><th><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>{rows.map((row) => {
            const state = states.get(row.id) ?? "inactive";
            const left = daysLeft(row);
            return <tr key={row.id} aria-current={editing?.id === row.id ? "true" : undefined}>
              <td><span className="promo-voucher">{row.code}</span><small>{row.name}</small></td>
              <td><strong className="admin-promo-percent">{row.percent_off}%</strong></td>
              <td>{formatDate(row.valid_until)}<small>{left < 0 ? "Ended" : left === 0 ? "Last day" : `${left} ${left === 1 ? "day" : "days"} left`}</small></td>
              <td><span className={`admin-status admin-status--${state}`}>{STATE_LABELS[state]}</span></td>
              <td><span className="admin-promo-usage"><meter max={row.max_redemptions} min={0} value={row.redemptions} aria-label={`${row.redemptions} of ${row.max_redemptions} uses`} />{row.redemptions} of {row.max_redemptions}</span></td>
              <td><Link className="admin-text-action" href={`/admin/promos?edit=${row.id}`}>Edit</Link></td>
            </tr>;
          })}</tbody>
        </table></div>}
    </section>
  </main>;
}

function Metric({ icon, label, tone, value }: { icon: IconName; label: string; tone: string; value: number }) {
  return <article className={`admin-metric admin-tone--${tone}`}><AdminIcon name={icon} /><div><span>{label}</span><strong>{value}</strong></div></article>;
}

function promoState(row: PromoRow, today: string): PromoState {
  if (row.status !== "active") return "inactive";
  if (row.valid_until < today) return "expired";
  return row.redemptions >= row.max_redemptions ? "used_up" : "active";
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

