import { NextRequest } from "next/server";
import { db, users, wishlists } from "@/lib/db";
import { eq } from "drizzle-orm";
import { endpoint, requireAdmin, fail, text } from "@/lib/server";
import { hashPassword } from "@/lib/auth/password";
export async function GET(r: NextRequest) {
  return endpoint(() => {
    requireAdmin(r);
    return {
      users: db
        .select({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          role: users.role,
        })
        .from(users)
        .all(),
    };
  });
}
export async function POST(r: NextRequest) {
  return endpoint(async () => {
    requireAdmin(r);
    const body = await r.json();
    const username = text(body.username, 40).toLowerCase(),
      displayName = text(body.displayName, 80);
    if (!/^[a-z0-9][a-z0-9_-]{2,39}$/.test(username) || !displayName)
      fail(
        400,
        "Choisissez un identifiant de 3 à 40 caractères (lettres, chiffres, tirets).",
      );
    if (
      typeof body.password !== "string" ||
      body.password.length < 12 ||
      body.password.length > 1024
    )
      fail(400, "Le mot de passe doit contenir au moins 12 caractères.");
    if (db.select().from(users).where(eq(users.username, username)).get())
      fail(409, "Cet identifiant existe déjà.");
    const user = db.transaction((tx) => {
      const u = tx
        .insert(users)
        .values({
          username,
          displayName,
          passwordHash: hashPassword(body.password),
        })
        .returning()
        .get()!;
      let slug = username.replace(/_/g, "-");
      if (
        tx.select().from(wishlists).where(eq(wishlists.slug, slug)).get() ||
        ["admin", "api", "uploads", "lock"].includes(slug)
      )
        slug += "-" + u.id.slice(0, 8);
      tx.insert(wishlists)
        .values({
          ownerId: u.id,
          name: `Les envies de ${displayName}`,
          slug,
          isPublic: false,
        })
        .run();
      return { id: u.id, username, displayName, role: u.role };
    });
    return { success: true, user };
  });
}
export async function PATCH(r: NextRequest) {
  return endpoint(async () => {
    requireAdmin(r);
    const body = await r.json();
    if (
      typeof body.password !== "string" ||
      body.password.length < 12 ||
      body.password.length > 1024
    )
      fail(400, "Le mot de passe doit contenir au moins 12 caractères.");
    const user = db
      .select()
      .from(users)
      .where(eq(users.id, text(body.id)))
      .get();
    if (!user) return fail(404, "Compte introuvable.");
    db.update(users)
      .set({
        passwordHash: hashPassword(body.password),
        authVersion: user.authVersion + 1,
      })
      .where(eq(users.id, user.id))
      .run();
    return { success: true };
  });
}
