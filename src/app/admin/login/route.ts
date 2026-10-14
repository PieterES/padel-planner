import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, COOKIE_OPTS, isAdminToken } from "@/lib/auth";

/** /admin/login?token=<ADMIN_TOKEN> grants admin access in this browser. */
export async function GET(req: NextRequest) {
  // A literal "+" in a query string decodes to a space; base64 tokens contain "+".
  const token = req.nextUrl.searchParams.get("token")?.replaceAll(" ", "+");
  if (!isAdminToken(token)) return NextResponse.redirect(new URL("/?invalid=1", req.url));
  const res = NextResponse.redirect(new URL("/admin", req.url));
  res.cookies.set(ADMIN_COOKIE, token!, COOKIE_OPTS);
  return res;
}
