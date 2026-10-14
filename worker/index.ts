/**
 * Long-running worker: daily scrape cron and an internal HTTP API for the web
 * app (never expose this port publicly).
 *
 *   POST /run          start a scrape → match run (202, or 409 if busy)
 *   GET  /status       { running }
 */
import "dotenv/config";
import { createServer, type ServerResponse } from "node:http";
import cron from "node-cron";
import { TZ } from "../src/lib/time";
import { isRunning, runPipeline, type Trigger } from "./pipeline";

const PORT = Number(process.env.WORKER_PORT ?? 4000);
const SCHEDULE = process.env.SCRAPE_CRON ?? "30 0 * * *"; // daily 00:30 Amsterdam

function trigger(kind: Trigger) {
  console.log(`[run] starting (${kind})`);
  runPipeline(kind)
    .then((r) => console.log(`[run] #${r.runId} ok: ${r.slotCount} slots, ${r.matchCount} matches`))
    .catch((e) => console.error("[run] failed", e));
}

const json = (res: ServerResponse, code: number, body: unknown) => {
  res.writeHead(code, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
};

createServer((req, res) => {
  switch (`${req.method} ${req.url}`) {
    case "POST /run":
      if (isRunning()) return json(res, 409, { error: "already running" });
      trigger("manual");
      return json(res, 202, { started: true });
    case "GET /status":
      return json(res, 200, { running: isRunning() });
    default:
      return json(res, 404, { error: "not found" });
  }
}).listen(PORT, () => console.log(`[worker] listening on :${PORT}`));

cron.schedule(SCHEDULE, () => trigger("cron"), { timezone: TZ });
console.log(`[worker] scrape scheduled "${SCHEDULE}" (${TZ})`);
