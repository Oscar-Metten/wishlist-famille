import { NextRequest } from "next/server";
import { db, settings } from "@/lib/db";
import { eq } from "drizzle-orm";
import { endpoint, fail } from "@/lib/server";
import { checkPassword } from "@/lib/auth/password";
import { signSiteAccess, isSecureCookie } from "@/lib/auth/utils";
export async function POST(r: NextRequest) {
  let hash: string | undefined;
  const response = await endpoint(async () => {
    const { password } = await r.json();
    const stored = db
      .select()
      .from(settings)
      .where(eq(settings.key, "passwordLockHash"))
      .get()?.value;
    if (
      !stored ||
      typeof password !== "string" ||
      password.length > 1024 ||
      !checkPassword(password, stored)
    )
      fail(401, "Mot de passe incorrect.");
    hash = stored;
    return { success: true };
  });
  if (hash)
    response.cookies.set("site_unlocked", signSiteAccess(hash), {
      httpOnly: true,
      secure: isSecureCookie(r),
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 86400,
    });
  return response;
}
