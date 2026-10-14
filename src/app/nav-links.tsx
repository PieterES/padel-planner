"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({ links }: { links: { href: string; label: string }[] }) {
  const path = usePathname();
  return (
    <div className="-mx-1 flex gap-1 overflow-x-auto px-1">
      {links.map((l) => {
        const active = path === l.href || path.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap no-underline transition ${
              active ? "bg-lime text-lime-ink" : "text-navy-ink/75 hover:bg-white/10 hover:text-navy-ink"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </div>
  );
}
