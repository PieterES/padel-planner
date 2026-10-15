"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./ui";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

/** App-style tab bar fixed to the bottom of the screen. */
export function BottomNav({ items }: { items: NavItem[] }) {
  const path = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-navy/95 text-navy-ink shadow-[0_-4px_20px_rgb(0_0_0/0.15)] backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div
        className="mx-auto grid max-w-md"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
          const active = path === item.href || path.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium no-underline transition ${
                active ? "text-lime" : "text-navy-ink/60 hover:text-navy-ink"
              }`}
            >
              <span
                className={`grid h-8 w-12 place-items-center rounded-full transition ${active ? "bg-lime/15" : ""}`}
              >
                <Icon name={item.icon} className="h-[22px] w-[22px]" />
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
