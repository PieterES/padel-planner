"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({ links }: { links: { href: string; label: string; short?: string }[] }) {
  const path = usePathname();
  return (
    <div className="-mx-1 flex gap-1 overflow-x-auto px-1">
      {links.map((l) => {
        const active = path === l.href || path.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-full px-2.5 py-1.5 text-sm font-medium whitespace-nowrap no-underline transition sm:px-3.5 ${
              active ? "bg-lime text-lime-ink" : "text-navy-ink/75 hover:bg-white/10 hover:text-navy-ink"
            }`}
          >
            {l.short ? (
              <>
                <span className="sm:hidden">{l.short}</span>
                <span className="max-sm:hidden">{l.label}</span>
              </>
            ) : (
              l.label
            )}
          </Link>
        );
      })}
    </div>
  );
}
