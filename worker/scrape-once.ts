/**
 * Run the pipeline once against live Peakz data without sending anything.
 *   npm run scrape:once
 */
import "dotenv/config";
import { runPipeline } from "./pipeline";

const result = await runPipeline("cli", null);
console.log(
  `\nrun #${result.runId}: ${result.slotCount} available slots, ${result.matchCount} matches`,
);
console.log(result.message ? `\nWould post:\n\n${result.message}` : "\nNothing new to post.");
