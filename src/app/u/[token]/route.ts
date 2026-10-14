import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_OPTS, USER_COOKIE, userByToken } from "@/lib/auth";

/** Magic link: /u/<token> logs the friend in and sends them to their availability. */
export async function GET(req: NextRequest, ctx: RouteContext<"/u/[token]">) {
  const { token } = await ctx.params;
  if (!userByToken(token)) return NextResponse.redirect(new URL("/?invalid=1", req.url));
  const res = NextResponse.redirect(new URL("/me", req.url));
  res.cookies.set(USER_COOKIE, token, COOKIE_OPTS);
  return res;
}
