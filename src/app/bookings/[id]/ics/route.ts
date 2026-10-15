import { eq } from "drizzle-orm";
import { currentUser, isAdmin } from "@/lib/auth";
import { db, schema } from "@/lib/db";

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (s: string) => s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");

/** Calendar file for a booked game ("Add to calendar"). */
export async function GET(_req: Request, ctx: RouteContext<"/bookings/[id]/ics">) {
  if (!(await currentUser()) && !(await isAdmin())) return new Response("Forbidden", { status: 403 });
  const id = Number((await ctx.params).id);
  const b = db.select().from(schema.bookings).where(eq(schema.bookings.id, id)).get();
  if (!b) return new Response("Not found", { status: 404 });

  const end = new Date(b.startUtc.getTime() + b.durationMin * 60_000);
  const venue = b.locationName.split(" - ").at(-1) ?? b.locationName;
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Padel Planner//EN",
    "BEGIN:VEVENT",
    `UID:booking-${b.id}@padel-planner`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(b.startUtc)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(`🎾 Padel at ${venue}`)}`,
    `LOCATION:${esc(`Peakz Padel ${b.locationName}`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");

  return new Response(ics, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="padel-${b.id}.ics"`,
    },
  });
}
