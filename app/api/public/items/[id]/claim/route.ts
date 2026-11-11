import { NextRequest } from "next/server";
import { db, wishlistItems, wishlists } from "@/lib/db";
import { eq, and, isNull } from "drizzle-orm";
import {
  endpoint,
  requireVisitor,
  session,
  tokenHash,
  text,
  fail,
} from "@/lib/server";
import { randomBytes } from "node:crypto";
import { isSecureCookie } from "@/lib/auth/utils";
export async function POST(
  r: NextRequest,
  c: { params: Promise<{ id: string }> },
) {
  let claim: { id: string; token: string } | undefined;
  const response = await endpoint(async () => {
    requireVisitor(r);
    const item = db
      .select()
      .from(wishlistItems)
      .where(eq(wishlistItems.id, (await c.params).id))
      .get();
    const list =
      item &&
      db
        .select()
        .from(wishlists)
        .where(eq(wishlists.id, item.wishlistId))
        .get();
    if (!item || item.isArchived || !list?.isPublic)
      return fail(404, "Cadeau introuvable.");
    if (session(r)?.id === list.ownerId)
      fail(403, "Vous ne pouvez pas réserver vos propres cadeaux.");
    const body = await r.json(),
      token = randomBytes(32).toString("hex");
    const updated = db
      .update(wishlistItems)
      .set({
        claimedByName: text(body.name, 80) || "Un proche",
        claimedByNote: text(body.note, 500) || null,
        claimedByToken: tokenHash(token),
        claimedAt: new Date(),
      })
      .where(
        and(
          eq(wishlistItems.id, item.id),
          isNull(wishlistItems.claimedByToken),
        ),
      )
      .run();
    if (!updated.changes)
      fail(409, "Ce cadeau vient d’être réservé par quelqu’un d’autre.");
    claim = { id: item.id, token };
    return {
      success: true,
      message: "Cadeau réservé. Vous pourrez annuler depuis ce navigateur.",
    };
  });
  if (claim)
    response.cookies.set(`claim_${claim.id}`, claim.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: isSecureCookie(r),
      path: "/",
      maxAge: 365 * 86400,
    });
  return response;
}
