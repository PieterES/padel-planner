"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { cellsToRules } from "@/lib/grid";

export async function saveWeeklyGrid(cells: string[]) {
  const user = await requireUser();
  const rules = cellsToRules(z.array(z.string().max(8)).max(7 * 40).parse(cells));
  db.transaction((tx) => {
    tx.delete(schema.availabilityRules).where(eq(schema.availabilityRules.userId, user.id)).run();
    if (rules.length) {
      tx.insert(schema.availabilityRules).values(rules.map((r) => ({ ...r, userId: user.id }))).run();
    }
  });
  revalidatePath("/me");
  revalidatePath("/matches");
}

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

const exceptionForm = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    kind: z.enum(["available", "unavailable"]),
    wholeDay: z.literal("on").optional(),
    start: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")),
    end: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")),
  })
  .transform((f) => ({
    date: f.date,
    kind: f.kind,
    startMin: f.wholeDay || !f.start ? null : toMin(f.start),
    endMin: f.wholeDay || !f.end ? null : f.end === "00:00" ? 24 * 60 : toMin(f.end),
  }))
  .refine((f) => (f.startMin === null) === (f.endMin === null), "Set both times or whole day")
  .refine((f) => f.startMin === null || f.endMin! > f.startMin, "End must be after start");

export async function addException(_prev: string | null, formData: FormData): Promise<string | null> {
  const user = await requireUser();
  const parsed = exceptionForm.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return parsed.error.issues[0]?.message ?? "Invalid input";
  db.insert(schema.availabilityExceptions).values({ ...parsed.data, userId: user.id }).run();
  revalidatePath("/me");
  revalidatePath("/matches");
  return null;
}

export async function deleteException(id: number) {
  const user = await requireUser();
  db.delete(schema.availabilityExceptions)
    .where(and(eq(schema.availabilityExceptions.id, id), eq(schema.availabilityExceptions.userId, user.id)))
    .run();
  revalidatePath("/me");
  revalidatePath("/matches");
}
