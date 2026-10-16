export type IconName = "alert" | "arrow" | "back" | "card" | "chevron" | "clock" | "document" | "home" | "jar" | "logout" | "mail" | "orders" | "people" | "revenue" | "search";

export function AdminIcon({ name }: { name: IconName }) {
  const common = { fill: "none", stroke: "currentColor", strokeLinecap: "round" as const, strokeLinejoin: "round" as const, strokeWidth: 1.8 };
  return (
    <svg aria-hidden="true" className="admin-icon" height="22" viewBox="0 0 24 24" width="22">
      {name === "home" ? <><path {...common} d="m3 11 9-8 9 8" /><path {...common} d="M5.5 9.5V21h13V9.5M9 21v-7h6v7" /></> : null}
      {name === "jar" ? <><path {...common} d="M8 3h8M7 6h10M8 6c0 2-2 3-2 5v7a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3v-7c0-2-2-3-2-5" /><path {...common} d="M8.5 14.5h7" /></> : null}
      {name === "orders" ? <><path {...common} d="M4 5h2l2 11h9l2-8H7" /><circle cx="10" cy="20" fill="currentColor" r="1" /><circle cx="17" cy="20" fill="currentColor" r="1" /></> : null}
      {name === "people" ? <><circle {...common} cx="9" cy="8" r="3" /><path {...common} d="M3 20v-2a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v2M16 5a3 3 0 0 1 0 6M17 14a4 4 0 0 1 4 4v2" /></> : null}
      {name === "back" ? <><path {...common} d="M10 6 4 12l6 6M4 12h14" /><path {...common} d="M15 4h5v16h-5" /></> : null}
      {name === "logout" ? <><path {...common} d="m14 8 4 4-4 4M18 12H8" /><path {...common} d="M10 4H4v16h6" /></> : null}
      {name === "search" ? <><circle {...common} cx="10.5" cy="10.5" r="6.5" /><path {...common} d="m16 16 5 5" /></> : null}
      {name === "mail" ? <><rect {...common} height="14" rx="2" width="19" x="2.5" y="5" /><path {...common} d="m4 7 8 6 8-6" /></> : null}
      {name === "revenue" ? <><path {...common} d="M5 21v-6M12 21V9M19 21V3" /></> : null}
      {name === "document" ? <><path {...common} d="M6 3h8l4 4v14H6zM14 3v5h4" /><path {...common} d="M9 13h6M9 17h5" /></> : null}
      {name === "clock" ? <><circle {...common} cx="12" cy="12" r="9" /><path {...common} d="M12 7v6l4 2" /></> : null}
      {name === "card" ? <><rect {...common} height="15" rx="2" width="20" x="2" y="5" /><path {...common} d="M2 9h20M6 15h5" /></> : null}
      {name === "alert" ? <><circle {...common} cx="12" cy="12" r="9" /><path {...common} d="M12 7v6M12 17h.01" /></> : null}
      {name === "chevron" ? <path {...common} d="m9 5 7 7-7 7" /> : null}
      {name === "arrow" ? <path {...common} d="M5 12h14m-5-5 5 5-5 5" /> : null}
    </svg>
  );
}
