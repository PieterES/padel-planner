import { asc, desc } from "drizzle-orm";
import QRCode from "qrcode";
import { inviteLink, magicLink, requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { db, schema } from "@/lib/db";
import { describeWhen } from "@/lib/matching";
import { fmtMinutes } from "@/lib/time";
import { waGroups, workerStatus } from "@/lib/worker-client";
import {
  addUser,
  deleteUser,
  regenerateLink,
  relinkWhatsApp,
  resetPosted,
  saveSettings,
  setInvite,
  scrapeNow,
  sendTestMessage,
  setWhatsAppGroup,
} from "./actions";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default async function AdminPage() {
  await requireAdmin();
  const settings = getSettings();
  const users = db.select().from(schema.users).orderBy(asc(schema.users.name)).all();
  const locations = db.select().from(schema.locations).orderBy(asc(schema.locations.name)).all();
  const runs = db.select().from(schema.scrapeRuns).orderBy(desc(schema.scrapeRuns.id)).limit(5).all();
  const worker = await workerStatus();
  const groups = worker.wa.status === "open" ? await waGroups() : [];
  const qrSvg = worker.wa.qr ? await QRCode.toString(worker.wa.qr, { type: "svg", margin: 1 }) : null;

  return (
    <div className="space-y-10">
      <h1>Admin</h1>

      <section>
        <h2>Scraping</h2>
        <div className="mb-3 flex items-center gap-3">
          <form action={scrapeNow}>
            <button className="btn" disabled={!worker.reachable || worker.running}>
              {worker.running ? "Running…" : "Scrape & match now"}
            </button>
          </form>
          <span className="text-sm text-muted">
            {worker.reachable ? "Also runs daily at 00:30." : "⚠️ Worker not reachable."}
          </span>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="text-muted">
            <tr>
              <th className="py-1">Run</th>
              <th>Started</th>
              <th>Status</th>
              <th>Slots</th>
              <th>Matches</th>
              <th>Posted</th>
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
                <td>{r.postedCount ?? "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>WhatsApp</h2>
        <p className="mb-3 text-sm">
          Status: <strong>{worker.wa.status}</strong>
        </p>
        {qrSvg && (
          <div className="card max-w-xs">
            <p className="mb-2 text-sm">
              On your phone: WhatsApp → Settings → Linked devices → Link a device, then scan.
              Reload this page if the code expires.
            </p>
            <div className="bg-white p-2" dangerouslySetInnerHTML={{ __html: qrSvg }} />
          </div>
        )}
        {worker.wa.status === "logged_out" && (
          <form action={relinkWhatsApp}>
            <button className="btn">Link WhatsApp again</button>
          </form>
        )}
        {worker.wa.status === "open" && (
          <div className="flex flex-wrap items-end gap-3">
            <form action={setWhatsAppGroup} className="flex items-end gap-2">
              <label className="flex flex-col gap-1 text-sm">
                Post matches in group
                <select className="input" name="jid" defaultValue={settings.waGroupJid ?? ""}>
                  <option value="">(none, don&apos;t post)</option>
                  {groups.map((g) => (
                    <option key={g.jid} value={g.jid}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </label>
              <button className="btn">Save</button>
            </form>
            <form action={sendTestMessage}>
              <button className="btn-ghost" disabled={!settings.waGroupJid}>
                Send test message
              </button>
            </form>
            <form action={resetPosted}>
              <button className="btn-ghost">Re-post current matches next run</button>
            </form>
          </div>
        )}
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
        <form action={saveSettings} className="space-y-5 text-sm">
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
            <label className="flex flex-col gap-1">
              <span className="font-medium">Matches per message</span>
              <input className="input w-20" type="number" name="topNPosted" min={1} max={20} defaultValue={settings.topNPosted} />
            </label>
          </fieldset>

          <fieldset>
            <legend className="mb-1 font-medium">When we play (match must fit inside)</legend>
            <div className="space-y-1">
              {DAYS.map((day, i) => {
                const w = settings.windows[i];
                return (
                  <div key={day} className="flex items-center gap-2">
                    <label className="flex w-32 items-center gap-1.5">
                      <input type="checkbox" name={`win_${i}_on`} defaultChecked={!!w} />
                      {day}
                    </label>
                    <input className="input" type="time" step={1800} name={`win_${i}_start`} defaultValue={fmtMinutes(w?.startMin ?? 18 * 60)} />
                    –
                    <input className="input" type="time" step={1800} name={`win_${i}_end`} defaultValue={fmtMinutes(w?.endMin ?? 23 * 60)} />
                  </div>
                );
              })}
            </div>
          </fieldset>

          <button className="btn">Save settings</button>
        </form>
      </section>
    </div>
  );
}
