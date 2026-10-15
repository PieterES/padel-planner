/**
 * Generates the app icons from one padel-ball SVG.
 *   npx tsx scripts/make-icons.ts
 *
 * Writes:
 *   src/app/icon.svg            favicon (ball on transparent)
 *   src/app/apple-icon.png      180×180, iOS home screen (full-bleed navy)
 *   public/icons/icon-192.png   PWA "any" icon (navy rounded square)
 *   public/icons/icon-512.png
 *   public/icons/maskable-512.png  PWA maskable (ball inside the 80% safe zone)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const NAVY = "#0b1f3a";

/** The ball, centred in a 100×100 box, `r` = radius. */
function ball(r: number): string {
  const s = r / 40; // seams drawn for r=40, scaled
  return `
    <defs>
      <radialGradient id="g" cx="38%" cy="32%" r="75%">
        <stop offset="0" stop-color="#ecff8a"/>
        <stop offset=".55" stop-color="#c8f03c"/>
        <stop offset="1" stop-color="#93c11a"/>
      </radialGradient>
      <clipPath id="c"><circle cx="50" cy="50" r="${r}"/></clipPath>
    </defs>
    <circle cx="50" cy="50" r="${r}" fill="url(#g)"/>
    <g clip-path="url(#c)">
      <g fill="none" stroke="#fff" stroke-opacity=".95" stroke-width="3.6" stroke-linecap="round"
         transform="translate(50 50) scale(${s}) translate(-50 -50)">
        <!-- seams run off the ball's edge; the clip trims them -->
        <path d="M2 24 C30 30 41 48 35 70 C32 82 25 92 18 102"/>
        <path d="M98 76 C70 70 59 52 65 30 C68 18 75 8 82 -2"/>
      </g>
    </g>
    <circle cx="50" cy="50" r="${r}" fill="none" stroke="#000" stroke-opacity=".08" stroke-width="1"/>`;
}

const svg = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${body}</svg>`;

const favicon = svg(ball(46));
const roundedSquare = svg(`<rect width="100" height="100" rx="22" fill="${NAVY}"/>${ball(34)}`);
const fullBleed = (r: number) => svg(`<rect width="100" height="100" fill="${NAVY}"/>${ball(r)}`);

async function png(markup: string, size: number, path: string) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${markup.replace("<svg ", `<svg width="${size}" height="${size}" `)}</body></html>`,
  );
  await page.screenshot({ path, omitBackground: true });
  await page.close();
  console.log("wrote", path);
}

mkdirSync("public/icons", { recursive: true });
writeFileSync("src/app/icon.svg", favicon + "\n");
console.log("wrote src/app/icon.svg");

const browser = await chromium.launch();
await png(fullBleed(32), 180, "src/app/apple-icon.png");
await png(roundedSquare, 192, "public/icons/icon-192.png");
await png(roundedSquare, 512, "public/icons/icon-512.png");
await png(fullBleed(28), 512, "public/icons/maskable-512.png");
await browser.close();
