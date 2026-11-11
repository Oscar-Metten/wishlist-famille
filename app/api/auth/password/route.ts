import { NextRequest } from "next/server";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { endpoint, requireUser, fail } from "@/lib/server";
import { checkPassword, hashPassword } from "@/lib/auth/password";
export async function POST(r: NextRequest) {
  return endpoint(async () => {
    const u = requireUser(r),
      body = await r.json();
    if (
      typeof body.password !== "string" ||
      body.password.length < 12 ||
      body.password.length > 1024
    )
      fail(
        400,
        "Le nouveau mot de passe doit contenir au moins 12 caractères.",
      );
    const account = db.select().from(users).where(eq(users.id, u.id)).get()!;
    if (
      typeof body.currentPassword !== "string" ||
      body.currentPassword.length > 1024 ||
      !checkPassword(body.currentPassword, account.passwordHash)
    )
      fail(403, "Mot de passe actuel incorrect.");
    db.update(users)
      .set({
        passwordHash: hashPassword(body.password),
        authVersion: account.authVersion + 1,
      })
      .where(eq(users.id, u.id))
      .run();
    return { success: true };
  });
}
