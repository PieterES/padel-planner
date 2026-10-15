import { asc, desc } from "drizzle-orm";
import Link from "next/link";
import { requireViewer } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { db, schema } from "@/lib/db";
import { describeWhen } from "@/lib/matching";
import { workerStatus } from "@/lib/worker-client";
import { PageHeader, Section, StatusDot } from "../ui";
import { WeekRangesFields } from "../week-ranges-fields";
import { saveSettings } from "./actions";
import { ScrapeButton } from "./scrape-button";

/** Group settings + court check: every friend (and the admin) can use this. */
export default async function SettingsPage() {
  await requireViewer();
  const settings = getSettings();
  const locations = db.select().from(schema.locations).orderBy(asc(schema.locations.name)).all();
  const runs = db.select().from(schema.scrapeRuns).orderBy(desc(schema.scrapeRuns.id)).limit(5).all();
  const worker = await workerStatus();
  const when = (d: Date) => describeWhen(d, 0).split("–")[0];

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Everyone" title="Settings">
        What counts as a match for the whole group, and a button to check Peakz right now. Changes
        apply to everyone.
      </PageHeader>

      <Section
        icon="refresh"
        title="Court check"
        description="Fetches Peakz availability for the next 4 weeks and finds matches."
        aside={<ScrapeButton reachable={worker.reachable} running={worker.running} />}
      >
        <ul className="divide-y divide-line rounded-xl border border-line">
          {runs.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2.5 text-sm">
              <span className="flex w-44 items-center gap-2 font-medium" title={r.error ?? undefined}>
                <StatusDot status={r.status} />
                {when(r.startedAt)}
              </span>
              <span className="chip-muted">{r.trigger === "cron" ? "nightly" : r.trigger}</span>
              <span
                className="text-muted"
                title="Free (court, start time, length) options at the enabled clubs, next 28 days"
              >
                {r.slotCount?.toLocaleString("nl-NL") ?? "–"} free court times
              </span>
              {r.status === "ok" ? (
                <Link href={`/runs?run=${r.id}`} className="ml-auto font-semibold text-court no-underline">
                  {r.matchCount} matches →
                </Link>
              ) : (
                <span className="ml-auto text-muted">{r.status}</span>
              )}
            </li>
          ))}
          {!runs.length && <li className="px-3 py-4 text-sm text-muted">No runs yet.</li>}
        </ul>
      </Section>

      <Section icon="sliders" title="Group settings" description="Applies to the whole group.">
        {/* key: after an action React resets the form to its first-render defaults;
            remount with the saved values instead. */}
        <form
          key={JSON.stringify([settings, locations.map((l) => l.enabled)])}
          action={saveSettings}
          className="space-y-6 text-sm"
        >
          <fieldset>
            <legend className="eyebrow mb-2">Clubs</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {locations.map((l) => {
                const [city, venue] = l.name.split(" - ");
                return (
                  <label
                    key={l.id}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-line p-3 transition has-[:checked]:border-court has-[:checked]:bg-court-soft"
                  >
                    <input type="checkbox" className="check" name="location" value={l.id} defaultChecked={l.enabled} />
                    <span>
                      <span className="block font-semibold">{venue ?? l.name}</span>
                      <span className="text-xs text-muted">{city}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="grid gap-6 sm:grid-cols-3">
            <fieldset>
              <legend className="eyebrow mb-2">Court</legend>
              <div className="flex rounded-xl border border-line p-1">
                {(
                  [
                    ["any", "Any"],
                    ["indoor", "Indoor"],
                    ["outdoor", "Outdoor"],
                  ] as const
                ).map(([v, label]) => (
                  <label
                    key={v}
                    className="flex-1 cursor-pointer rounded-lg py-1.5 text-center font-medium text-muted transition has-[:checked]:bg-navy has-[:checked]:text-navy-ink"
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      name="indoorOutdoor"
                      value={v}
                      defaultChecked={settings.indoorOutdoor === v}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="eyebrow mb-2">Duration</legend>
              <div className="flex gap-2">
                {[60, 90, 120].map((d) => (
                  <label
                    key={d}
                    className="flex-1 cursor-pointer rounded-xl border border-line py-1.5 text-center font-medium text-muted transition has-[:checked]:border-court has-[:checked]:bg-court-soft has-[:checked]:text-court"
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      name="duration"
                      value={d}
                      defaultChecked={settings.durations.includes(d)}
                    />
                    {d}′
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="flex flex-col">
              <span className="eyebrow mb-2">Min. players</span>
              <input
                className="input w-24"
                type="number"
                name="minPlayers"
                min={2}
                max={8}
                defaultValue={settings.minPlayers}
              />
            </label>
          </div>

          <fieldset>
            <legend className="eyebrow mb-2">When we play (a match must fit inside)</legend>
            <WeekRangesFields
              prefix="win"
              values={settings.windows}
              fallback={{ startMin: 18 * 60, endMin: 23 * 60 }}
            />
          </fieldset>

          <button className="btn">Save settings</button>
        </form>
      </Section>
    </div>
  );
}
