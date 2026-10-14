/** Client for the worker's internal HTTP API (see worker/index.ts). */
const WORKER_URL = process.env.WORKER_URL ?? "http://localhost:4000";

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

export async function workerStatus(): Promise<{ reachable: boolean; running: boolean }> {
  const status = await call<{ running: boolean }>("GET", "/status");
  return { reachable: status !== null, running: status?.running ?? false };
}

export const triggerRun = () => call<{ started?: boolean; error?: string }>("POST", "/run");
