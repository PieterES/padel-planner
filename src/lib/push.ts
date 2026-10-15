import { eq, inArray } from "drizzle-orm";
import webpush from "web-push";
import { db as defaultDb, schema, type Db } from "./db";
import type { PushMessage } from "./notify";

/** VAPID keys live in the settings row; generated the first time they're needed. */
export function vapidKeys(db: Db = defaultDb): { publicKey: string; privateKey: string } {
  const s = db.select().from(schema.settings).where(eq(schema.settings.id, 1)).get();
  if (s?.vapidPublicKey && s.vapidPrivateKey) {
    return { publicKey: s.vapidPublicKey, privateKey: s.vapidPrivateKey };
  }
  const keys = webpush.generateVAPIDKeys();
  db.update(schema.settings)
    .set({ vapidPublicKey: keys.publicKey, vapidPrivateKey: keys.privateKey })
    .where(eq(schema.settings.id, 1))
    .run();
  return keys;
}

/**
 * Send one notification to every device of the given friends. Never throws:
 * a failed push must not break a booking or a scrape. Dead endpoints
 * (404/410: unsubscribed or app removed) are deleted.
 */
export async function sendPush(userIds: number[], message: PushMessage, db: Db = defaultDb): Promise<number> {
  if (!userIds.length) return 0;
  const subs = db
    .select()
    .from(schema.pushSubscriptions)
    .where(inArray(schema.pushSubscriptions.userId, userIds))
    .all();
  if (!subs.length) return 0;

  const { publicKey, privateKey } = vapidKeys(db);
  const payload = JSON.stringify(message);
  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, {
          vapidDetails: { subject: "mailto:padel-planner@users.noreply.local", publicKey, privateKey },
          TTL: 60 * 60 * 12,
        });
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) {
          db.delete(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.endpoint, s.endpoint)).run();
        } else {
          console.warn("[push] send failed", code ?? e);
        }
      }
    }),
  );
  return sent;
}
