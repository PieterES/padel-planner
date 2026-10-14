import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import Link from "next/link";
import { currentUser, isAdmin } from "@/lib/auth";
import { NavLinks } from "./nav-links";
import { Avatar, BallMark } from "./ui";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display", weight: ["500", "600", "700"] });

export const metadata: Metadata = {
  title: "Padel Planner",
  description: "Find padel matches at Peakz when enough friends are free.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0b1f3a" },
    { media: "(prefers-color-scheme: dark)", color: "#050a14" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [user, admin] = await Promise.all([currentUser(), isAdmin()]);
  const links = [
    ...(user ? [{ href: "/matches", label: "Matches" }] : []),
    ...(user || admin ? [{ href: "/runs", label: "Runs" }] : []),
    ...(user ? [{ href: "/me", label: "My week" }] : []),
    ...(admin ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  return (
    <html lang="en" className={`${inter.variable} ${display.variable} h-full antialiased`}>
      <body className="min-h-full">
        <header className="sticky top-0 z-20 bg-navy text-navy-ink shadow-lg shadow-black/10">
          <nav className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
            <Link href="/" className="flex flex-none items-center gap-2 no-underline">
              <BallMark />
              <span className="font-display text-base font-bold tracking-tight max-sm:hidden">
                Padel Planner
              </span>
            </Link>
            <div className="min-w-0 flex-1">{links.length > 0 && <NavLinks links={links} />}</div>
            {user && <Avatar name={user.name} />}
            {(user || admin) && (
              <form action="/logout" method="post">
                <button className="rounded-full px-2.5 py-1.5 text-sm text-navy-ink/70 transition hover:bg-white/10 hover:text-navy-ink">
                  Log out
                </button>
              </form>
            )}
          </nav>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-4xl px-4 pb-10 text-xs text-muted">
          Court data from Peakz Padel · booking happens on peakzpadel.nl
        </footer>
      </body>
    </html>
  );
}
