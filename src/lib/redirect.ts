import { NextResponse } from "next/server";

/**
 * Redirect with a relative Location header. Behind Docker + Cloudflare the
 * server sees its own URL as http://localhost:3000, so `new URL(path, req.url)`
 * would send the browser there; a relative path keeps it on the public domain.
 */
export function redirectTo(path: string, status: 303 | 307 = 307): NextResponse {
  return new NextResponse(null, { status, headers: { Location: path } });
}
