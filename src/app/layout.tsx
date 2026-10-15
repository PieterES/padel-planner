import type { Metadata, Viewport } from "next";
// Fonts ship with the app (no download from Google at build time; that breaks
// the Docker build on the Pi).
import "@fontsource-variable/inter";
import "@fontsource-variable/space-grotesk";
import Link from "next/link";
import { currentUser, isAdmin } from "@/lib/auth";
import { BottomNav, type NavItem } from "./nav-links";
import { Avatar, BallMark, Icon } from "./ui";
import "./globals.css";


export const metadata: Metadata = {
  title: "Padel Planner",
  description: "Find padel matches at Peakz when enough friends are free.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // lets the bottom bar respect the iPhone home indicator
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0b1f3a" },
    { media: "(prefers-color-scheme: dark)", color: "#050a14" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [user, admin] = await Promise.all([currentUser(), isAdmin()]);
  const signedIn = !!(user || admin);
  const nav: NavItem[] = [
    ...(signedIn ? [{ href: "/matches", label: "Matches", icon: "ball" as const }] : []),
    ...(signedIn ? [{ href: "/runs", label: "Runs", icon: "history" as const }] : []),
    ...(user ? [{ href: "/me", label: "Week", icon: "calendar" as const }] : []),
    ...(signedIn ? [{ href: "/settings", label: "Settings", icon: "sliders" as const }] : []),
    ...(admin ? [{ href: "/admin", label: "Admin", icon: "shield" as const }] : []),
  ];

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <header className="sticky top-0 z-20 bg-navy text-navy-ink shadow-lg shadow-black/10">
          <nav className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
            <Link href="/" className="flex flex-none items-center gap-2 no-underline">
              <BallMark />
              <span className="font-display text-base font-bold tracking-tight">Padel Planner</span>
            </Link>
            <div className="flex-1" />
            {user && <Avatar name={user.name} />}
            {admin && !user && <span className="chip bg-white/10 text-navy-ink">admin</span>}
            {(user || admin) && (
              <form action="/logout" method="post">
                <button
                  title="Log out"
                  aria-label="Log out"
                  className="flex items-center gap-1.5 rounded-full px-2 py-1.5 text-sm text-navy-ink/70 transition hover:bg-white/10 hover:text-navy-ink"
                >
                  <Icon name="logout" />
                  <span className="max-sm:hidden">Log out</span>
                </button>
              </form>
            )}
          </nav>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
        <footer className={`mx-auto max-w-4xl px-4 text-xs text-muted ${nav.length ? "pb-28" : "pb-10"}`}>
          Court data from Peakz Padel · booking happens on peakzpadel.nl
        </footer>
        {nav.length > 0 && <BottomNav items={nav} />}
      </body>
    </html>
  );
}
