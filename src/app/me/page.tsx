import { and, asc, eq, gte } from "drizzle-orm";
import { magicLink, requireUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { rulesToCells } from "@/lib/grid";
import { fmtMinutes, toLocal } from "@/lib/time";
import { deleteException } from "./actions";
import { ExceptionForm } from "./exception-form";
import { WeeklyGrid } from "./weekly-grid";

export default async function MePage({ searchParams }: PageProps<"/me">) {
  const { welcome } = await searchParams;
  const user = await requireUser();
  const today = toLocal(new Date()).date;
  const rules = db
    .select()
    .from(schema.availabilityRules)
    .where(eq(schema.availabilityRules.userId, user.id))
    .all();
  const exceptions = db
    .select()
    .from(schema.availabilityExceptions)
    .where(
      and(
        eq(schema.availabilityExceptions.userId, user.id),
        gte(schema.availabilityExceptions.date, today),
      ),
    )
    .orderBy(asc(schema.availabilityExceptions.date))
    .all();

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
      <section>
        <h1>My availability</h1>
        <p className="mb-4 text-sm text-muted">
          Tap or drag to mark when you can usually play. This repeats every week.
        </p>
        <WeeklyGrid initial={rulesToCells(rules)} />
      </section>

      <section>
        <h2>Exceptions</h2>
        <p className="mb-3 text-sm text-muted">
          Holidays, a free evening, a busy week: these override the weekly pattern on that date.
        </p>
        <ExceptionForm minDate={today} />
        <ul className="mt-4 divide-y divide-line">
          {exceptions.map((e) => (
            <li key={e.id} className="flex items-center gap-3 py-2 text-sm">
              <span className="w-28 font-medium">{e.date}</span>
              <span>
                {e.kind === "available" ? "✅ available" : "❌ not available"}{" "}
                {e.startMin === null
                  ? "all day"
                  : `${fmtMinutes(e.startMin)}–${fmtMinutes(e.endMin!)}`}
              </span>
              <form action={deleteException.bind(null, e.id)} className="ml-auto">
                <button className="btn-ghost">Remove</button>
              </form>
            </li>
          ))}
          {!exceptions.length && <li className="py-2 text-sm text-muted">No upcoming exceptions.</li>}
        </ul>
      </section>

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
