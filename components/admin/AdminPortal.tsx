"use client";

import Link from "next/link";
import { AdminIcon, type IconName } from "./AdminIcon";
import { useRouter } from "next/navigation";
import { useDeferredValue, useMemo, useState } from "react";
import type { AdminActivityPoint, AdminJar, AdminOrder, AdminPerson, AdminSnapshot } from "@/lib/admin";
import { getJarPlan } from "@/lib/plans";

type AdminView = "overview" | "jars" | "orders" | "people";
type RangeDays = 7 | 30 | 90;

export function AdminPortal({
  adminName,
  adminUsername,
  snapshot,
}: {
  adminName: string;
  adminUsername: string;
  snapshot: AdminSnapshot;
}) {
  const router = useRouter();
  const [view, setView] = useState<AdminView>("overview");
  const [range, setRange] = useState<RangeDays>(30);
  const [search, setSearch] = useState("");
  const [jarStatus, setJarStatus] = useState<"all" | "ending_soon" | AdminJar["status"]>("all");
  const [orderStatus, setOrderStatus] = useState<"all" | AdminOrder["status"]>("all");
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  const filteredJars = useMemo(() => snapshot.jars.filter((jar) => {
    const matchesStatus = jarStatus === "all" || (jarStatus === "ending_soon"
      ? jar.status === "sealed" && Boolean(jar.hostingEndsAt) && new Date(jar.hostingEndsAt!).getTime() > Date.now() && new Date(jar.hostingEndsAt!).getTime() <= Date.now() + 7 * 86400000
      : jar.status === jarStatus);
    const haystack = `${jar.id} ${jar.creatorUsername} ${getJarPlan(jar.planCode).name} ${jar.status}`.toLowerCase();
    return matchesStatus && (!deferredSearch || haystack.includes(deferredSearch));
  }), [deferredSearch, jarStatus, snapshot.jars]);

  const filteredOrders = useMemo(() => snapshot.orders.filter((order) => {
    const matchesStatus = orderStatus === "all" || order.status === orderStatus;
    const haystack = `${order.id} ${order.username} ${getJarPlan(order.planCode).name} ${order.status}`.toLowerCase();
    return matchesStatus && (!deferredSearch || haystack.includes(deferredSearch));
  }), [deferredSearch, orderStatus, snapshot.orders]);

  const filteredPeople = useMemo(() => snapshot.people.filter((person) => {
    const haystack = `${person.username} ${person.displayName}`.toLowerCase();
    return !deferredSearch || haystack.includes(deferredSearch);
  }), [deferredSearch, snapshot.people]);

  function navigate(next: AdminView) {
    if (next !== "overview") {
      router.push(`/admin/records?kind=${next}`);
      return;
    }
    setView(next);
    setSearch("");
    if (next === "overview") {
      setJarStatus("all");
      setOrderStatus("all");
    }
  }

  function showOrders(status: AdminOrder["status"]) {
    router.push(`/admin/records?kind=orders&status=${status}`);
  }

  function showHostingEndingSoon() {
    router.push("/admin/records?kind=jars&status=ending_soon");
  }

  const title = view === "overview" ? `Good morning, ${firstName(adminName)}.` : viewTitle(view);
  const subtitle = view === "overview"
    ? "Here’s how the jars are doing."
    : view === "jars"
      ? "Lifecycle and hosting status only. Letter contents stay private."
      : view === "orders"
        ? "Payment status and fulfilment signals, without provider secrets."
        : "Account-level activity without private gift contents.";

  return (
    <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <div className="admin-topbar__tools">
            {view === "overview" ? <div className="admin-header-note" aria-hidden="true">People make<br />moments brighter.</div> : (
              <label className="admin-search">
                <span className="sr-only">Search current section</span>
                <AdminIcon name="search" />
                <input onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${view === "people" ? "people" : view === "orders" ? "orders or people" : "jars or people"}…`} value={search} />
              </label>
            )}
            {view === "overview" ? (
              <label className="admin-range">
                <span className="sr-only">Activity range</span>
                <select onChange={(event) => setRange(Number(event.target.value) as RangeDays)} value={range}>
                  <option value={7}>Last 7 days</option>
                  <option value={30}>Last 30 days</option>
                  <option value={90}>Last 90 days</option>
                </select>
              </label>
            ) : null}
            <div className="admin-profile" title={`Signed in as @${adminUsername}`}>
              <span>{firstName(adminName).slice(0, 1).toUpperCase()}</span>
              <div><strong>{firstName(adminName)}</strong><small>@{adminUsername}</small></div>
            </div>
          </div>
        </header>

        {view === "overview" ? (
          <Overview
            filteredJars={filteredJars}
            onHostingEndingSoon={showHostingEndingSoon}
            onNavigate={navigate}
            onShowOrders={showOrders}
            range={range}
            search={search}
            setSearch={setSearch}
            snapshot={snapshot}
          />
        ) : null}
        {view === "jars" ? <JarsView jars={filteredJars} onStatusChange={setJarStatus} selectedStatus={jarStatus} /> : null}
        {view === "orders" ? <OrdersView onStatusChange={setOrderStatus} orders={filteredOrders} selectedStatus={orderStatus} /> : null}
        {view === "people" ? <PeopleView people={filteredPeople} /> : null}
    </main>
  );
}

function Overview({
  filteredJars,
  onHostingEndingSoon,
  onNavigate,
  onShowOrders,
  range,
  search,
  setSearch,
  snapshot,
}: {
  filteredJars: AdminJar[];
  onHostingEndingSoon: () => void;
  onNavigate: (view: AdminView) => void;
  onShowOrders: (status: AdminOrder["status"]) => void;
  range: RangeDays;
  search: string;
  setSearch: (value: string) => void;
  snapshot: AdminSnapshot;
}) {
  return (
    <div className="admin-overview">
      <section className="admin-metrics" aria-label="All-time totals">
        <Metric icon="people" label="People" tone="mulberry" value={formatCount(snapshot.summary.people)} />
        <Metric icon="mail" label="Jars created" tone="coral" value={formatCount(snapshot.summary.jarsCreated)} />
        <Metric icon="jar" label="Sealed jars" tone="leaf" value={formatCount(snapshot.summary.sealedJars)} />
        <Metric icon="clock" label="Ending in 7 days" tone="gold" value={formatCount(snapshot.attention.hostingEndingSoon)} />
      </section>

      <div className="admin-insight-grid">
        <section className="admin-panel admin-activity">
          <div className="admin-panel__heading"><div><h2>Jar activity</h2><p>Jars created per day · last {range} days</p></div><span>Updated {formatTime(snapshot.generatedAt)}</span></div>
          <ActivityChart points={snapshot.activity.slice(-range)} />
          <div className="admin-lifecycle" aria-label="Jar lifecycle totals">
            <LifecycleItem icon="document" label="Draft" value={snapshot.lifecycle.draft} />
            <LifecycleItem icon="jar" label="Sealed" value={snapshot.lifecycle.sealed} />
            <LifecycleItem icon="clock" label="Hosting ended" value={snapshot.lifecycle.hostingEnded} />
          </div>
        </section>

        <section className="admin-panel admin-attention">
          <div className="admin-panel__heading"><div><h2>Needs attention</h2><p>Operational signals worth checking</p></div></div>
          <div className="admin-attention__list">
            <AttentionItem detail="Awaiting completion" icon="card" label="Pending payments" onClick={() => onShowOrders("pending")} tone="coral" value={snapshot.attention.pendingPayments} />
            <AttentionItem detail="Payment could not be processed" icon="alert" label="Failed payments" onClick={() => onShowOrders("failed")} tone="coral" value={snapshot.attention.failedPayments} />
            <AttentionItem detail="Ending in the next 7 days" icon="clock" label="Hosting ending soon" onClick={onHostingEndingSoon} tone="gold" value={snapshot.attention.hostingEndingSoon} />
          </div>
        </section>
      </div>

      <section className="admin-panel admin-table-panel">
        <div className="admin-panel__heading admin-panel__heading--table">
          <div><h2>Recent jars</h2><p>Safe lifecycle metadata only</p></div>
          <label className="admin-search admin-search--table"><span className="sr-only">Search jars or people</span><AdminIcon name="search" /><input onChange={(event) => setSearch(event.target.value)} placeholder="Search jars or people…" value={search} /></label>
          <button className="admin-text-action" onClick={() => onNavigate("jars")} type="button">View all jars <AdminIcon name="arrow" /></button>
        </div>
        <JarTable jars={filteredJars.slice(0, 7)} />
      </section>
    </div>
  );
}

function JarsView({ jars, selectedStatus, onStatusChange }: { jars: AdminJar[]; selectedStatus: "all" | "ending_soon" | AdminJar["status"]; onStatusChange: (status: "all" | "ending_soon" | AdminJar["status"]) => void }) {
  return (
    <section className="admin-panel admin-page-panel">
      <div className="admin-view-toolbar">
        <div className="admin-filter" role="group" aria-label="Filter jars by status">
          {(["all", "draft", "sealed", "ending_soon", "hosting_ended"] as const).map((status) => <button className={status === selectedStatus ? "is-active" : ""} key={status} onClick={() => onStatusChange(status)} type="button">{status === "all" ? "Recent jars" : statusLabel(status)}</button>)}
        </div>
        <span>{jars.length} shown from latest 100</span>
      </div>
      <JarTable jars={jars} />
    </section>
  );
}

function OrdersView({ orders, selectedStatus, onStatusChange }: { orders: AdminOrder[]; selectedStatus: "all" | AdminOrder["status"]; onStatusChange: (status: "all" | AdminOrder["status"]) => void }) {
  return (
    <section className="admin-panel admin-page-panel">
      <div className="admin-view-toolbar">
        <div className="admin-filter" role="group" aria-label="Filter orders by status">
          {(["all", "pending", "succeeded", "failed", "refunded"] as const).map((status) => <button className={status === selectedStatus ? "is-active" : ""} key={status} onClick={() => onStatusChange(status)} type="button">{status === "all" ? "All orders" : statusLabel(status)}</button>)}
        </div>
        <span>{orders.length} shown from latest 100</span>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Order</th><th>Person</th><th>Plan</th><th>Status</th><th>Amount</th><th>Created</th></tr></thead>
          <tbody>{orders.map((order) => <tr key={order.id}><td><code>{shortId(order.id, "ord")}</code></td><td>@{order.username}</td><td>{getJarPlan(order.planCode).name}</td><td><Status status={order.status} /></td><td>{formatOrderAmount(order.amountCents, order.currency)}</td><td>{formatDateTime(order.createdAt)}</td></tr>)}</tbody>
        </table>
        {!orders.length ? <EmptyTable label="No orders match this filter." /> : null}
      </div>
    </section>
  );
}

function PeopleView({ people }: { people: AdminPerson[] }) {
  return (
    <section className="admin-panel admin-page-panel">
      <div className="admin-view-toolbar"><p>Newest accounts first</p><span>{people.length} shown from latest 100</span></div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Person</th><th>Username</th><th>Jars created</th><th>Jars received</th><th>Joined</th></tr></thead>
          <tbody>{people.map((person) => <tr key={person.id}><td><strong>{person.displayName}</strong></td><td>@{person.username}</td><td>{person.jarsCreated}</td><td>{person.jarsReceived}</td><td>{formatDateTime(person.createdAt)}</td></tr>)}</tbody>
        </table>
        {!people.length ? <EmptyTable label="No people match this search." /> : null}
      </div>
    </section>
  );
}

function JarTable({ jars }: { jars: AdminJar[] }) {
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead><tr><th>Jar</th><th>Creator</th><th>Plan</th><th>Status</th><th>Recipients</th><th>Created</th></tr></thead>
        <tbody>{jars.map((jar) => <tr key={jar.id}><td><code>{shortId(jar.id, "jar")}</code></td><td>@{jar.creatorUsername}</td><td>{getJarPlan(jar.planCode).name}</td><td><Status status={jar.status} /></td><td>{jar.recipientCount}</td><td>{formatDateTime(jar.createdAt)}</td></tr>)}</tbody>
      </table>
      {!jars.length ? <EmptyTable label="No jars match this filter." /> : null}
    </div>
  );
}

function Metric({ icon, label, tone, value }: { icon: IconName; label: string; tone: "mulberry" | "coral" | "leaf" | "gold"; value: string }) {
  return <article className={`admin-metric admin-tone--${tone}`}><AdminIcon name={icon} /><div><span>{label}</span><strong>{value}</strong></div></article>;
}

function LifecycleItem({ icon, label, value }: { icon: IconName; label: string; value: number }) {
  return <div><AdminIcon name={icon} /><span>{label}<strong>{formatCount(value)}</strong></span></div>;
}

function AttentionItem({ detail, icon, label, onClick, tone, value }: { detail: string; icon: IconName; label: string; onClick: () => void; tone: "coral" | "gold"; value: number }) {
  return <button className={`admin-attention-item admin-tone--${tone}`} onClick={onClick} type="button"><span className="admin-attention-item__icon"><AdminIcon name={icon} /></span><span><strong>{label}</strong><small>{detail}</small></span><b>{value}</b><AdminIcon name="chevron" /></button>;
}

function Status({ status }: { status: string }) {
  return <span className={`admin-status admin-status--${status}`}>{statusLabel(status)}</span>;
}

function ActivityChart({ points }: { points: AdminActivityPoint[] }) {
  const width = 720;
  const height = 210;
  const inset = { top: 14, right: 12, bottom: 32, left: 34 };
  const plotWidth = width - inset.left - inset.right;
  const plotHeight = height - inset.top - inset.bottom;
  const maxValue = Math.max(10, ...points.map((point) => point.jarsCreated));
  const roundedMax = Math.ceil(maxValue / 10) * 10;
  const coordinates = points.map((point, index) => ({
    x: inset.left + (points.length === 1 ? 0 : index / (points.length - 1)) * plotWidth,
    y: inset.top + plotHeight - (point.jarsCreated / roundedMax) * plotHeight,
  }));
  const line = coordinates.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  const area = coordinates.length ? `${line} L${coordinates.at(-1)?.x.toFixed(1)},${(inset.top + plotHeight).toFixed(1)} L${coordinates[0].x.toFixed(1)},${(inset.top + plotHeight).toFixed(1)} Z` : "";
  const labels = chartLabels(points);

  return (
    <div className="admin-chart" role="img" aria-label={`Line chart of jars created each day. Maximum ${roundedMax}.`}>
      <svg viewBox={`0 0 ${width} ${height}`}>
        {[0, .5, 1].map((ratio) => {
          const y = inset.top + plotHeight * ratio;
          return <g key={ratio}><line className="admin-chart__grid" x1={inset.left} x2={width - inset.right} y1={y} y2={y} /><text x="2" y={y + 4}>{Math.round(roundedMax * (1 - ratio))}</text></g>;
        })}
        {area ? <path className="admin-chart__area" d={area} /> : null}
        {line ? <path className="admin-chart__line" d={line} /> : null}
        {coordinates.filter((_, index) => index % Math.max(1, Math.floor(points.length / 14)) === 0 || index === coordinates.length - 1).map((point, index) => <circle className="admin-chart__dot" cx={point.x} cy={point.y} key={`${point.x}-${index}`} r="2.8" />)}
        {labels.map((label) => <text className="admin-chart__label" key={label.index} textAnchor={label.anchor} x={coordinates[label.index]?.x ?? inset.left} y={height - 5}>{label.value}</text>)}
      </svg>
    </div>
  );
}

function EmptyTable({ label }: { label: string }) {
  return <div className="admin-empty"><AdminIcon name="mail" /><p>{label}</p></div>;
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "Admin";
}

function viewTitle(view: Exclude<AdminView, "overview">) {
  return view === "jars" ? "Jars" : view === "orders" ? "Orders" : "People";
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatOrderAmount(minor: number, currency: string) {
  if (currency !== "USD" && currency !== "INR") return `${minor} ${currency}`;
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", { style: "currency", currency }).format(minor / 100);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(date);
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "just now";
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(date) + " UTC";
}

function shortId(id: string, prefix: string) {
  return `${prefix}_${id.replace(/[^a-z0-9]/gi, "").slice(0, 5).toUpperCase()}`;
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ").replace(/^\w/, (letter) => letter.toUpperCase());
}

function chartLabels(points: AdminActivityPoint[]) {
  if (!points.length) return [];
  const indexes = Array.from(new Set([0, Math.floor((points.length - 1) / 2), points.length - 1]));
  return indexes.map((index, position) => ({
    index,
    anchor: position === 0 ? "start" as const : position === indexes.length - 1 ? "end" as const : "middle" as const,
    value: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${points[index].day}T00:00:00Z`)),
  }));
}
