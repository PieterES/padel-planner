import { redirectTo } from "@/lib/redirect";
import { ADMIN_COOKIE, USER_COOKIE } from "@/lib/auth";

/** POST /logout: forget this browser's friend and admin login. */
export async function POST() {
  const res = redirectTo("/", 303);
  res.cookies.delete(USER_COOKIE);
  res.cookies.delete(ADMIN_COOKIE);
  return res;
}
