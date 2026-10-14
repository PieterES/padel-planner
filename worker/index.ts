/**
 * Long-running worker: WhatsApp connection, daily cron, and an internal HTTP
 * API for the web app (never expose this port publicly).
 *
 *   POST /run          start a scrape → match → notify run (202, or 409 if busy)
 *   GET  /status       { running, wa: { status } }
 *   GET  /wa/qr        { status, qr } (raw QR string for linking)
 *   GET  /wa/groups    [{ jid, name }]
 *   POST /wa/relink    restart linking after a logout
 *   POST /wa/test      send a test message to the configured group
 */
import "dotenv/config";
import { createServer, type ServerResponse } from "node:http";
import cron from "node-cron";
import { getSettings } from "../src/lib/data";
import { TZ } from "../src/lib/time";
import { isRunning, runPipeline, type Notifier, type Trigger } from "./pipeline";
import {
  listGroups,
  relinkWhatsApp,
  sendGroupMessage,
  startWhatsApp,
  waState,
} from "./whatsapp";

const PORT = Number(process.env.WORKER_PORT ?? 4000);
const SCHEDULE = process.env.SCRAPE_CRON ?? "30 0 * * *"; // daily 00:30 Amsterdam

const notify: Notifier = async (text) => {
  const jid = getSettings().waGroupJid;
  if (!jid) {
    console.warn("[notify] no WhatsApp group configured; skipping");
    return false;
  }
  return sendGroupMessage(jid, text);
};

function trigger(kind: Trigger) {
  console.log(`[run] starting (${kind})`);
  runPipeline(kind, notify)
    .then((r) =>
      console.log(`[run] #${r.runId} ok: ${r.slotCount} slots, ${r.matchCount} matches, posted=${r.posted}`),
    )
    .catch((e) => console.error("[run] failed", e));
}

const json = (res: ServerResponse, code: number, body: unknown) => {
  res.writeHead(code, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
};

createServer(async (req, res) => {
  try {
    const route = `${req.method} ${req.url}`;
    switch (route) {
      case "POST /run":
        if (isRunning()) return json(res, 409, { error: "already running" });
        trigger("manual");
        return json(res, 202, { started: true });
      case "GET /status":
        return json(res, 200, { running: isRunning(), wa: { status: waState().status } });
      case "GET /wa/qr":
        return json(res, 200, waState());
      case "GET /wa/groups":
        return json(res, 200, await listGroups());
      case "POST /wa/relink":
        await relinkWhatsApp();
        return json(res, 200, waState());
      case "POST /wa/test":
        return json(res, 200, { sent: await notify("🎾 Padel Planner is connected.") });
      default:
        return json(res, 404, { error: "not found" });
    }
  } catch (e) {
    console.error(e);
    json(res, 500, { error: String(e) });
  }
}).listen(PORT, () => console.log(`[worker] listening on :${PORT}`));

cron.schedule(SCHEDULE, () => trigger("cron"), { timezone: TZ });
console.log(`[worker] scrape scheduled "${SCHEDULE}" (${TZ})`);

startWhatsApp().catch((e) => console.error("[wa] failed to start", e));
