import { asc, desc } from "drizzle-orm";
import Link from "next/link";
import { inviteLink, magicLink, requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { db, schema } from "@/lib/db";
import { describeWhen } from "@/lib/matching";
import { workerStatus } from "@/lib/worker-client";
import { addUser, deleteUser, regenerateLink, saveSettings, setInvite } from "./actions";
import { WeekRangesFields } from "../week-ranges-fields";
import { ScrapeButton } from "./scrape-button";


export default async function AdminPage() {
  await requireAdmin();
  const settings = getSettings();
  const users = db.select().from(schema.users).orderBy(asc(schema.users.name)).all();
  const withRules = new Set(
    db.selectDistinct({ id: schema.availabilityRules.userId }).from(schema.availabilityRules).all().map((r) => r.id),
  );
  const locations = db.select().from(schema.locations).orderBy(asc(schema.locations.name)).all();
  const runs = db.select().from(schema.scrapeRuns).orderBy(desc(schema.scrapeRuns.id)).limit(5).all();
  const worker = await workerStatus();

  return (
    <div className="space-y-10">
      <h1>Admin</h1>

      <section>
        <h2>Scraping</h2>
        <ScrapeButton reachable={worker.reachable} running={worker.running} />
        <table className="w-full text-left text-sm">
          <thead className="text-muted">
            <tr>
              <th className="py-1">Run</th>
              <th>Started</th>
              <th>Status</th>
              <th title="Free (court, start time, length) options at the enabled clubs, next 28 days">
                Free court times
              </th>
              <th>Matches</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id} className="border-t border-line">
                <td className="py-1">
                  #{r.id} {r.trigger}
                </td>
                <td>{describeWhen(r.startedAt, 0).split("–")[0]}</td>
                <td title={r.error ?? undefined}>{r.status}</td>
                <td>{r.slotCount ?? "–"}</td>
                <td>{r.matchCount ?? "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Friends</h2>
        <div className="card mb-4 text-sm">
          <p className="mb-2 font-medium">Invite link: post this in the group chat</p>
          {settings.inviteToken ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                className="input min-w-0 flex-1 font-mono text-xs"
                readOnly
                value={inviteLink(settings.inviteToken)}
              />
              <form action={setInvite.bind(null, true)}>
                <button className="btn-ghost" title="The old invite link stops working">
                  New invite link
                </button>
              </form>
              <form action={setInvite.bind(null, false)}>
                <button className="btn-ghost">Close sign-ups</button>
              </form>
            </div>
          ) : (
            <form action={setInvite.bind(null, true)} className="flex items-center gap-3">
              <span className="text-muted">Sign-ups are closed.</span>
              <button className="btn">Create invite link</button>
            </form>
          )}
        </div>
        <ul className="mb-3 divide-y divide-line">
          {users.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
              <span className="w-24 font-medium">{u.name}</span>
              <Link href={`/admin/friends/${u.id}`} className="btn-ghost no-underline">
                {withRules.has(u.id) ? "Edit availability" : "⚠️ Set availability"}
              </Link>
              <input
                className="input min-w-0 flex-1 font-mono text-xs"
                readOnly
                value={magicLink(u.magicToken)}
              />
              <form action={regenerateLink.bind(null, u.id)}>
                <button className="btn-ghost" title="Invalidates the old link">
                  New link
                </button>
              </form>
              <form action={deleteUser.bind(null, u.id)}>
                <button className="btn-ghost">Remove</button>
              </form>
            </li>
          ))}
        </ul>
        <form action={addUser} className="flex gap-2">
          <input className="input" name="name" placeholder="Name" required maxLength={40} />
          <button className="btn">Add friend</button>
        </form>
      </section>

      <section>
        <h2>Group settings</h2>
        {/* key: after an action React resets the form, and a <select> goes back to its
            first-render default; remount with the saved values instead. */}
        <form
          key={JSON.stringify([settings, locations.map((l) => l.enabled)])}
          action={saveSettings}
          className="space-y-5 text-sm"
        >
          <fieldset>
            <legend className="mb-1 font-medium">Clubs</legend>
            {locations.map((l) => (
              <label key={l.id} className="mr-4 inline-flex items-center gap-1.5">
                <input type="checkbox" name="location" value={l.id} defaultChecked={l.enabled} />
                {l.name}
              </label>
            ))}
          </fieldset>

          <fieldset className="flex flex-wrap gap-6">
            <label className="flex flex-col gap-1">
              <span className="font-medium">Court</span>
              <select className="input" name="indoorOutdoor" defaultValue={settings.indoorOutdoor}>
                <option value="any">indoor or outdoor</option>
                <option value="indoor">indoor only</option>
                <option value="outdoor">outdoor only</option>
              </select>
            </label>
            <div>
              <span className="mb-1 block font-medium">Duration</span>
              {[60, 90, 120].map((d) => (
                <label key={d} className="mr-3 inline-flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    name="duration"
                    value={d}
                    defaultChecked={settings.durations.includes(d)}
                  />
                  {d} min
                </label>
              ))}
            </div>
            <label className="flex flex-col gap-1">
              <span className="font-medium">Min. players</span>
              <input className="input w-20" type="number" name="minPlayers" min={2} max={8} defaultValue={settings.minPlayers} />
            </label>
          </fieldset>

          <fieldset>
            <legend className="mb-1 font-medium">When we play (match must fit inside)</legend>
            <WeekRangesFields
              prefix="win"
              values={settings.windows}
              fallback={{ startMin: 18 * 60, endMin: 23 * 60 }}
            />
          </fieldset>

          <button className="btn">Save settings</button>
        </form>
      </section>
    </div>
  );
}
