import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { workerStatus } from "@/lib/worker-client";

/** Worker run state; polled by the admin page while a scrape is running. */
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json(await workerStatus(), { headers: { "cache-control": "no-store" } });
}
