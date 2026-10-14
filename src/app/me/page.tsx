import { magicLink, requireUser } from "@/lib/auth";
import { AvailabilityEditor } from "./availability-editor";

export default async function MePage({ searchParams }: PageProps<"/me">) {
  const { welcome, week } = await searchParams;
  const user = await requireUser();

  return (
    <div className="space-y-8">
      {welcome && (
        <div className="card border-accent">
          <p className="font-medium">Welcome, {user.name}! 🎾</p>
          <p className="text-sm">
            Mark below when you can usually play. Save your personal link (bottom of this page) to
            get back in on another phone or browser.
          </p>
        </div>
      )}
      <h1>My availability</h1>
      <AvailabilityEditor
        userId={user.id}
        basePath="/me"
        week={typeof week === "string" ? week : undefined}
      />

      <section>
        <h2>Your personal link</h2>
        <p className="mb-2 text-sm text-muted">
          This link logs you in. Bookmark it, or use it on another device. Don’t share it.
        </p>
        <input
          className="input w-full font-mono text-xs"
          readOnly
          value={magicLink(user.magicToken)}
        />
      </section>
    </div>
  );
}
