/**
 * Run the pipeline once against live Peakz data and print the top matches.
 *   npm run scrape:once
 */
import "dotenv/config";
import { currentMatches } from "../src/lib/data";
import { describeWhen } from "../src/lib/matching";
import { runPipeline } from "./pipeline";

const result = await runPipeline("cli");
console.log(`\nrun #${result.runId}: ${result.slotCount} available slots, ${result.matchCount} matches\n`);
for (const m of currentMatches().slice(0, 10)) {
  console.log(
    `• ${describeWhen(m.startUtc, m.durationMin)} · ${m.locationName} · ${m.courts.length} court(s) · ${m.players.map((p) => p.name).join(", ")}`,
  );
}
