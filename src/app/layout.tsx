import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { currentUser, isAdmin } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Padel Planner",
  description: "Find padel matches at Peakz when enough friends are free.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [user, admin] = await Promise.all([currentUser(), isAdmin()]);
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <header className="border-b border-line">
          <nav className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-3 text-sm">
            <Link href="/" className="font-semibold">
              🎾 Padel Planner
            </Link>
            {user && <Link href="/matches">Matches</Link>}
            {(user || admin) && <Link href="/runs">Runs</Link>}
            {user && <Link href="/me">My availability</Link>}
            {admin && <Link href="/admin">Admin</Link>}
            {user && <span className="ml-auto text-muted">{user.name}</span>}
          </nav>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
