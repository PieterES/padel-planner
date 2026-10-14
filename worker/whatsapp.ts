/**
 * WhatsApp via Baileys (unofficial WhatsApp Web protocol), linked to the
 * owner's own number by scanning a QR code once. Auth state lives in
 * data/baileys-auth so the link survives restarts.
 */
import { rmSync } from "node:fs";
import { join } from "node:path";
import makeWASocket, {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState as loadAuthState, // not a React hook
  type WASocket,
} from "baileys";
import pino from "pino";

const AUTH_DIR = process.env.BAILEYS_AUTH_DIR ?? join(process.cwd(), "data", "baileys-auth");

export type WaStatus = "connecting" | "qr" | "open" | "logged_out";

let sock: WASocket | null = null;
let status: WaStatus = "connecting";
let qr: string | null = null;
let retry = 0;

export const waState = () => ({ status, qr });

export async function startWhatsApp(): Promise<void> {
  const { state, saveCreds } = await loadAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();
  status = "connecting";
  sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: process.env.WA_LOG_LEVEL ?? "warn" }),
    browser: Browsers.ubuntu("Padel Planner"),
    markOnlineOnConnect: false, // keep phone notifications working
    syncFullHistory: false,
  });
  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("connection.update", ({ connection, lastDisconnect, qr: newQr }) => {
    if (newQr) {
      qr = newQr;
      status = "qr";
      console.log("[wa] scan the QR code on /admin to link WhatsApp");
    }
    if (connection === "open") {
      status = "open";
      qr = null;
      retry = 0;
      console.log("[wa] connected");
    }
    if (connection === "close") {
      const code = (lastDisconnect?.error as { output?: { statusCode?: number } })?.output
        ?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        // Unlinked from the phone: wipe creds so the next start shows a fresh QR.
        status = "logged_out";
        rmSync(AUTH_DIR, { recursive: true, force: true });
        console.warn("[wa] logged out; relink from /admin");
        return;
      }
      const delay = Math.min(60_000, 2_000 * 2 ** retry++);
      console.warn(`[wa] connection closed (${code}); reconnecting in ${delay / 1000}s`);
      setTimeout(() => startWhatsApp().catch(console.error), delay);
    }
  });
}

/** Restart linking after a logout (shows a new QR). */
export async function relinkWhatsApp(): Promise<void> {
  if (status === "logged_out") await startWhatsApp();
}

export async function listGroups(): Promise<{ jid: string; name: string }[]> {
  if (!sock || status !== "open") return [];
  const groups = await sock.groupFetchAllParticipating();
  return Object.values(groups)
    .map((g) => ({ jid: g.id, name: g.subject }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function sendGroupMessage(jid: string, text: string): Promise<boolean> {
  if (!sock || status !== "open") return false;
  await sock.sendMessage(jid, { text });
  return true;
}
