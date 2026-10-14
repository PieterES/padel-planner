/** Client for the worker's internal HTTP API (see worker/index.ts). */
const WORKER_URL = process.env.WORKER_URL ?? "http://localhost:4000";

export interface WorkerStatus {
  reachable: boolean;
  running: boolean;
  wa: { status: "connecting" | "qr" | "open" | "logged_out" | "unknown"; qr: string | null };
}

async function call<T>(method: "GET" | "POST", path: string): Promise<T | null> {
  try {
    const res = await fetch(`${WORKER_URL}${path}`, {
      method,
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function workerStatus(): Promise<WorkerStatus> {
  const [status, wa] = await Promise.all([
    call<{ running: boolean }>("GET", "/status"),
    call<WorkerStatus["wa"]>("GET", "/wa/qr"),
  ]);
  return {
    reachable: status !== null,
    running: status?.running ?? false,
    wa: wa ?? { status: "unknown", qr: null },
  };
}

export const triggerRun = () => call<{ started?: boolean; error?: string }>("POST", "/run");
export const waGroups = async () => (await call<{ jid: string; name: string }[]>("GET", "/wa/groups")) ?? [];
export const waTest = () => call<{ sent: boolean }>("POST", "/wa/test");
export const waRelink = () => call("POST", "/wa/relink");
