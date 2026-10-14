import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, USER_COOKIE } from "@/lib/auth";

/** POST /logout: forget this browser's friend and admin login. */
export async function POST(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/", req.url), 303);
  res.cookies.delete(USER_COOKIE);
  res.cookies.delete(ADMIN_COOKIE);
  return res;
}
