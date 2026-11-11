import { NextRequest } from "next/server";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { endpoint, text, fail } from "@/lib/server";
import { checkPassword, hashPassword } from "@/lib/auth/password";
import {
  generateAccessToken,
  generateRefreshToken,
  isSecureCookie,
  type TokenPayload,
} from "@/lib/auth/utils";
const attempts = new Map<string, { count: number; until: number }>();
let dummy: string;
export async function POST(r: NextRequest) {
  let user: TokenPayload | undefined;
  const response = await endpoint(async () => {
    const body = await r.json(),
      username = text(body.username, 80).toLowerCase();
    const password =
      typeof body.password === "string" && body.password.length <= 1024
        ? body.password
        : "";
    const previous = attempts.get(username);
    if (previous && previous.until > Date.now() && previous.count >= 10)
      fail(429, "Trop de tentatives. Réessayez dans 15 minutes.");
    const account = db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .get();
    dummy ||= hashPassword("dummy-password-for-timing");
    const valid = checkPassword(password, account?.passwordHash || dummy);
    if (!valid || !account) {
      if (attempts.size > 1000) {
        for (const [key, value] of attempts)
          if (value.until < Date.now()) attempts.delete(key);
        if (attempts.size > 1000) attempts.clear();
      }
      attempts.set(username, {
        count: previous && previous.until > Date.now() ? previous.count + 1 : 1,
        until: Date.now() + 900000,
      });
      fail(401, "Identifiant ou mot de passe incorrect.");
    }
    attempts.delete(username);
    const { passwordHash: _, ...safe } = account!;
    user = safe;
    return { success: true, user: safe };
  });
  if (user) {
    const options = {
      httpOnly: true,
      secure: isSecureCookie(r),
      sameSite: "lax" as const,
      path: "/",
    };
    response.cookies.set("access_token", generateAccessToken(user), {
      ...options,
      maxAge: 43200,
    });
    response.cookies.set("refresh_token", generateRefreshToken(user), {
      ...options,
      maxAge: 30 * 86400,
    });
  }
  return response;
}
