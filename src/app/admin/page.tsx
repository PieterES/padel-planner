import { asc } from "drizzle-orm";
import Link from "next/link";
import { adminUsesDefaultPassword, inviteLink, magicLink, requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { db, schema } from "@/lib/db";
import { CopyField } from "../copy-field";
import { Avatar, PageHeader, Section } from "../ui";
import { PasswordForm } from "../me/password-form";
import { addUser, deleteUser, regenerateLink, setAdminPassword, setInvite } from "./actions";

export default async function AdminPage() {
  await requireAdmin();
  const settings = getSettings();
  const users = db.select().from(schema.users).orderBy(asc(schema.users.name)).all();
  const withRules = new Set(
    db.selectDistinct({ id: schema.availabilityRules.userId }).from(schema.availabilityRules).all().map((r) => r.id),
  );

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Organiser" title="Admin">
        People and access. Group settings and “Scrape &amp; match now” are on{" "}
        <Link href="/settings" className="font-medium text-court no-underline">
          Settings
        </Link>
        , open to everyone.
      </PageHeader>
      {adminUsesDefaultPassword() && (
        <div className="card flex items-start gap-3 border-danger/40 bg-danger/5">
          <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-danger font-bold text-white">!</span>
          <div>
            <p className="font-display text-lg font-semibold">You’re using the default password “admin”</p>
            <p className="text-sm text-muted">
              Anyone can guess it and manage the group. Change it under “Admin account” at the bottom.
            </p>
          </div>
        </div>
      )}

      <Section icon="users" title="Friends" description={`${users.length} in the group`}>
        <div className="mb-5 rounded-xl bg-court-soft p-4">
          <p className="mb-2 text-sm font-semibold">Invite link: post this in the group chat</p>
          {settings.inviteToken ? (
            <div className="flex flex-wrap items-center gap-2">
              <CopyField value={inviteLink(settings.inviteToken)} />
              <form action={setInvite.bind(null, true)}>
                <button className="btn-ghost" title="The old invite link stops working">
                  New link
                </button>
              </form>
              <form action={setInvite.bind(null, false)}>
                <button className="btn-danger">Close sign-ups</button>
              </form>
            </div>
          ) : (
            <form action={setInvite.bind(null, true)} className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-muted">Sign-ups are closed.</span>
              <button className="btn">Create invite link</button>
            </form>
          )}
        </div>

        <ul className="divide-y divide-line">
          {users.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-3 text-sm">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar name={u.name} size="h-9 w-9 text-xs" />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{u.name}</p>
                  <div className="mt-0.5 flex flex-wrap gap-1.5">
                    {withRules.has(u.id) ? (
                      <Link href={`/admin/friends/${u.id}`} className="chip no-underline">
                        ✓ availability set
                      </Link>
                    ) : (
                      <Link
                        href={`/admin/friends/${u.id}`}
                        className="chip bg-lime/30 text-lime-ink no-underline dark:text-lime"
                      >
                        ⚠ set availability
                      </Link>
                    )}
                    {!u.passwordHash && (
                      <span className="chip-muted" title="Can only log in with their personal link">
                        no password
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <details className="group relative">
                  <summary className="btn-ghost cursor-pointer list-none">Login link</summary>
                  <div className="absolute right-0 z-10 mt-2 flex w-[min(28rem,calc(100vw-2rem))] flex-wrap items-center gap-2 rounded-xl border border-line bg-surface p-2 shadow-lg">
                    <CopyField value={magicLink(u.magicToken)} />
                    <form action={regenerateLink.bind(null, u.id)}>
                      <button className="btn-ghost" title="Invalidates the old link">
                        New
                      </button>
                    </form>
                  </div>
                </details>
                <Link href={`/admin/friends/${u.id}`} className="btn-ghost no-underline">
                  Edit
                </Link>
                <form action={deleteUser.bind(null, u.id)}>
                  <button className="btn-danger" title={`Remove ${u.name}`}>
                    Remove
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
        <form action={addUser} className="mt-4 flex gap-2">
          <input className="input flex-1 sm:flex-none" name="name" placeholder="Name" required maxLength={40} />
          <button className="btn">Add friend</button>
        </form>
      </Section>

      <Section
        icon="key"
        title="Admin account"
        description="Log in on the home page with name “admin” and this password, on any device."
      >
        <PasswordForm save={setAdminPassword} askCurrent />
      </Section>
    </div>
  );
}
