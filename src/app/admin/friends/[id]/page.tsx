import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { AvailabilityEditor } from "@/app/me/availability-editor";
import { PasswordForm } from "@/app/me/password-form";
import { Avatar, Section } from "@/app/ui";

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
    <div className="space-y-6">
      <div>
        <Link href="/admin" className="text-sm text-muted no-underline hover:text-foreground">
          ← Admin
        </Link>
        <div className="mt-3 mb-4 flex items-center gap-3">
          <Avatar name={friend.name} size="h-12 w-12 text-base" />
          <div>
            <p className="eyebrow">Editing availability</p>
            <h1>{friend.name}</h1>
          </div>
        </div>
        <nav className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {friends.map((f) => (
            <Link
              key={f.id}
              href={`/admin/friends/${f.id}`}
              className={`pill flex items-center gap-2 !py-1 !pl-1 ${f.id === id ? "pill-active" : ""}`}
            >
              <Avatar name={f.name} size="h-6 w-6 text-[10px]" />
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
      <Section
        icon="key"
        title="Password"
        description={
          friend.passwordHash
            ? `${friend.name} has a password. Set a new one here if they forgot it.`
            : `${friend.name} has no password yet, so they can only log in with their personal link. Set one and tell them.`
        }
      >
        <PasswordForm key={friend.id} userId={friend.id} askCurrent={false} />
      </Section>
    </div>
  );
}
