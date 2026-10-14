/**
 * Phase 0 discovery: log in to peakzpadel.nl, open the booking calendar and
 * record every XHR/fetch so we can find the availability API.
 *
 *   npm run spike            # headed browser; click around, press Enter to finish
 *   HEADLESS=1 npm run spike # headless, auto-finishes after 20s
 *
 * Output: scratch/peakz-spike/<n>-<method>-<path>.json + requests.ndjson + storage-state.json
 */
import "dotenv/config";
import { mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { chromium } from "playwright";

const BASE = "https://www.peakzpadel.nl";
const OUT = join(process.cwd(), "scratch", "peakz-spike");
const headless = !!process.env.HEADLESS;

mkdirSync(OUT, { recursive: true });
const log = join(OUT, "requests.ndjson");
writeFileSync(log, "");

const browser = await chromium.launch({ headless });
const context = await browser.newContext({ locale: "nl-NL", timezoneId: "Europe/Amsterdam" });
const page = await context.newPage();

let n = 0;
page.on("response", async (res) => {
  const req = res.request();
  if (!["xhr", "fetch"].includes(req.resourceType())) return;
  const i = ++n;
  const url = new URL(res.url());
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    try {
      body = (await res.text()).slice(0, 2000);
    } catch {}
  }
  const entry = {
    i,
    method: req.method(),
    url: res.url(),
    status: res.status(),
    requestHeaders: req.headers(),
    postData: req.postData(),
  };
  appendFileSync(log, JSON.stringify(entry) + "\n");
  const name = `${String(i).padStart(3, "0")}-${req.method()}-${url.host}${url.pathname}`
    .replace(/[^a-zA-Z0-9.-]+/g, "_")
    .slice(0, 150);
  writeFileSync(join(OUT, `${name}.json`), JSON.stringify({ ...entry, body }, null, 2));
  console.log(`[${i}] ${res.status()} ${req.method()} ${res.url()}`);
});

await page.goto(`${BASE}/reserveren/inloggen`, { waitUntil: "networkidle" });

const email = process.env.PEAKZ_EMAIL;
const password = process.env.PEAKZ_PASSWORD;
if (email && password) {
  try {
    await page.locator('input[type="email"], input[name*="mail" i]').first().fill(email, { timeout: 10_000 });
    await page.locator('input[type="password"]').first().fill(password);
    await page.locator('input[type="password"]').first().press("Enter");
    await page.waitForLoadState("networkidle");
    console.log("Login submitted.");
  } catch (e) {
    console.warn("Auto-login failed; log in by hand in the browser window.", (e as Error).message);
  }
} else {
  console.warn("PEAKZ_EMAIL/PEAKZ_PASSWORD not set; log in by hand in the browser window.");
}

// SPIKE_URLS: comma-separated pages to visit after login (default: events calendar).
const urls = (process.env.SPIKE_URLS ?? `${BASE}/reserveren/kalender`).split(",");
for (const [i, url] of urls.entries()) {
  console.log(`\n=== visiting ${url}`);
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(3_000);
  await page.screenshot({ path: join(OUT, `page-${i}.png`), fullPage: true });
  writeFileSync(join(OUT, `page-${i}.html`), await page.content());
}

if (headless) {
  await page.waitForTimeout(20_000);
} else {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  await rl.question(
    "\nClick around: pick your clubs, change dates, open a court. Press Enter here when done… ",
  );
  rl.close();
}

await context.storageState({ path: join(OUT, "storage-state.json") });
await browser.close();
console.log(`\nRecorded ${n} requests → ${OUT}`);
