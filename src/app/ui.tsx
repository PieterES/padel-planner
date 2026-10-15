import type { ReactNode } from "react";

/** Padel ball mark used in the header and empty states. */
export function BallMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <circle cx="16" cy="16" r="15" fill="var(--lime)" />
      <path
        d="M4.5 9.5c5 2 8 6.5 8 13M27.5 22.5c-5-2-8-6.5-8-13"
        fill="none"
        stroke="var(--lime-ink)"
        strokeOpacity=".55"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PageHeader({
  eyebrow,
  title,
  children,
  actions,
}: {
  eyebrow?: string;
  title: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h1>{title}</h1>
        {children && <div className="mt-2 max-w-2xl text-sm text-muted">{children}</div>}
      </div>
      {actions}
    </header>
  );
}

export function Section({
  title,
  description,
  icon,
  children,
  aside,
}: {
  title: string;
  description?: ReactNode;
  icon?: IconName;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="card">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {icon && (
            <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-court-soft text-court">
              <Icon name={icon} className="h-[18px] w-[18px]" />
            </span>
          )}
          <div>
            <h2>{title}</h2>
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      <BallMark className="mb-4 h-12 w-12 opacity-90" />
      <p className="font-display text-lg font-semibold">{title}</p>
      {children && <div className="mt-1 max-w-sm text-sm text-muted">{children}</div>}
    </div>
  );
}

/** Stable, pleasant colour per name. */
function hue(name: string): number {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

export function Avatar({ name, size = "h-8 w-8 text-xs" }: { name: string; size?: string }) {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      title={name}
      className={`inline-grid flex-none place-items-center rounded-full font-semibold text-white ring-2 ring-card ${size}`}
      style={{ background: `hsl(${hue(name)} 55% 45%)` }}
    >
      {initials}
    </span>
  );
}

export function AvatarStack({ names, max = 6 }: { names: string[]; max?: number }) {
  const shown = names.slice(0, max);
  const extra = names.length - shown.length;
  return (
    <span className="flex -space-x-2">
      {shown.map((n) => (
        <Avatar key={n} name={n} />
      ))}
      {extra > 0 && (
        <span className="inline-grid h-8 w-8 place-items-center rounded-full bg-line text-xs font-semibold ring-2 ring-card">
          +{extra}
        </span>
      )}
    </span>
  );
}

export function StatusDot({ status }: { status: "ok" | "error" | "running" | string }) {
  const color = status === "ok" ? "bg-ok" : status === "error" ? "bg-danger" : "bg-court animate-pulse";
  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} />;
}

/** Night-court hero with a top-down court drawing. */
export function Hero({ children }: { children: ReactNode }) {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-navy px-6 py-12 sm:px-10 sm:py-16">
      <svg
        viewBox="0 0 400 200"
        className="pointer-events-none absolute -right-16 -bottom-10 w-[34rem] opacity-[0.16]"
        aria-hidden
      >
        <rect x="10" y="10" width="380" height="180" rx="6" fill="none" stroke="white" strokeWidth="3" />
        <line x1="200" y1="10" x2="200" y2="190" stroke="white" strokeWidth="4" />
        <line x1="80" y1="10" x2="80" y2="190" stroke="white" strokeWidth="2" />
        <line x1="320" y1="10" x2="320" y2="190" stroke="white" strokeWidth="2" />
        <line x1="80" y1="100" x2="320" y2="100" stroke="white" strokeWidth="2" />
      </svg>
      <BallMark className="absolute top-8 right-8 h-14 w-14 rotate-12 sm:h-20 sm:w-20" />
      <div className="relative">{children}</div>
    </section>
  );
}

const ICONS = {
  indoor: "M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  outdoor:
    "M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4",
  refresh: "M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6",
  users:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
  sliders: "M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6",
  key: "M15 7a4 4 0 1 1-3.9 5H3v3h3v3h3v-3h2.1A4 4 0 0 1 15 7zM16 11h.01",
  repeat: "M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0",
  share: "M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13",
  calendar: "M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM16 2v4M8 2v4M3 10h18",
  check: "M20 6 9 17l-5-5",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  link: "M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7",
} as const;

export type IconName = keyof typeof ICONS;

/** Small stroke icon (inherits text colour). */
export function Icon({ name, className = "h-4 w-4" }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={ICONS[name]} />
    </svg>
  );
}
