import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { AvailabilityEditor } from "@/app/me/availability-editor";

/** Admin edits a friend's availability (e.g. to fill in test data). */
export default async function FriendAvailabilityPage({
  params,
  searchParams,
}: PageProps<"/admin/friends/[id]">) {
  await requireAdmin();
  const id = Number((await params).id);
  const { week } = await searchParams;
  const friend = db.select().from(schema.users).where(eq(schema.users.id, id)).get();
  if (!friend) notFound();
  const friends = db.select().from(schema.users).orderBy(asc(schema.users.name)).all();

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin" className="text-sm">
          ← Admin
        </Link>
        <h1 className="mt-2">Availability: {friend.name}</h1>
        <nav className="flex flex-wrap gap-2 text-sm">
          {friends.map((f) => (
            <Link
              key={f.id}
              href={`/admin/friends/${f.id}`}
              className={`rounded-full border border-line px-3 py-1 no-underline ${f.id === id ? "bg-accent text-background" : ""}`}
            >
              {f.name}
            </Link>
          ))}
        </nav>
      </div>
      <AvailabilityEditor
        userId={friend.id}
        basePath={`/admin/friends/${friend.id}`}
        week={typeof week === "string" ? week : undefined}
      />
    </div>
  );
}
