import { redirectTo } from "@/lib/redirect";
import { COOKIE_OPTS, USER_COOKIE, userByToken } from "@/lib/auth";

/** Magic link: /u/<token> logs the friend in and sends them to their availability. */
export async function GET(_req: Request, ctx: RouteContext<"/u/[token]">) {
  const { token } = await ctx.params;
  if (!userByToken(token)) return redirectTo("/?invalid=1");
  const res = redirectTo("/me");
  res.cookies.set(USER_COOKIE, token, COOKIE_OPTS);
  return res;
}
