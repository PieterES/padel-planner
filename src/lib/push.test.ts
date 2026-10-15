import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";

// Fake push service: no network in tests.
const sendNotification = vi.fn();
vi.mock("web-push", () => ({
  default: {
    generateVAPIDKeys: () => ({ publicKey: "test-public", privateKey: "test-private" }),
    sendNotification: (...args: unknown[]) => sendNotification(...args),
  },
}));

let push: typeof import("./push");
let dbm: typeof import("./db");

beforeAll(async () => {
  process.env.DATABASE_PATH = join(mkdtempSync(join(tmpdir(), "padel-push-")), "test.db");
  dbm = await import("./db");
  push = await import("./push");
});

describe("sendPush", () => {
  it("sends to every device of the given friends and drops dead subscriptions", async () => {
    const { db, schema } = dbm;
    const anna = db.insert(schema.users).values({ name: "Anna", magicToken: "a" }).returning().get();
    const bas = db.insert(schema.users).values({ name: "Bas", magicToken: "b" }).returning().get();
    db.insert(schema.pushSubscriptions)
      .values([
        { endpoint: "https://push.example/anna-phone", userId: anna.id, p256dh: "k1", auth: "a1" },
        { endpoint: "https://push.example/anna-old-laptop", userId: anna.id, p256dh: "k2", auth: "a2" },
        { endpoint: "https://push.example/bas", userId: bas.id, p256dh: "k3", auth: "a3" },
      ])
      .run();
    sendNotification.mockImplementation(async (sub: { endpoint: string }) => {
      if (sub.endpoint.endsWith("old-laptop")) throw Object.assign(new Error("gone"), { statusCode: 410 });
    });

    const sent = await push.sendPush([anna.id], { title: "Hi", body: "Match!", url: "/matches" });

    expect(sent).toBe(1);
    expect(sendNotification).toHaveBeenCalledTimes(2); // only Anna's two devices
    const [sub, payload, opts] = sendNotification.mock.calls[0];
    expect(sub).toEqual({ endpoint: "https://push.example/anna-phone", keys: { p256dh: "k1", auth: "a1" } });
    expect(JSON.parse(payload)).toEqual({ title: "Hi", body: "Match!", url: "/matches" });
    expect(opts.vapidDetails.publicKey).toBe("test-public");
    const left = db.select().from(schema.pushSubscriptions).all().map((s) => s.endpoint);
    expect(left).toEqual(["https://push.example/anna-phone", "https://push.example/bas"]);
  });

  it("generates VAPID keys once and reuses them", () => {
    expect(push.vapidKeys()).toEqual({ publicKey: "test-public", privateKey: "test-private" });
    expect(push.vapidKeys().publicKey).toBe("test-public");
  });

  it("is a no-op without recipients", async () => {
    sendNotification.mockClear();
    expect(await push.sendPush([], { title: "x", body: "y", url: "/" })).toBe(0);
    expect(sendNotification).not.toHaveBeenCalled();
  });
});
