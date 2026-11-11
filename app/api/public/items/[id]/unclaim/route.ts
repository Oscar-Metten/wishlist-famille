import { NextRequest } from "next/server";
import { db, wishlistItems, wishlists } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { endpoint, requireVisitor, tokenHash, fail } from "@/lib/server";
export async function POST(
  r: NextRequest,
  c: { params: Promise<{ id: string }> },
) {
  const { id } = await c.params;
  const response = await endpoint(() => {
    requireVisitor(r);
    const item = db
      .select()
      .from(wishlistItems)
      .where(eq(wishlistItems.id, id))
      .get();
    const list =
      item &&
      db
        .select()
        .from(wishlists)
        .where(eq(wishlists.id, item.wishlistId))
        .get();
    if (!item || !list?.isPublic) fail(404, "Cadeau introuvable.");
    const proof = tokenHash(r.cookies.get(`claim_${id}`)?.value || "");
    const updated = db
      .update(wishlistItems)
      .set({
        claimedByName: null,
        claimedByNote: null,
        claimedByToken: null,
        claimedAt: null,
        isPurchased: false,
      })
      .where(
        and(eq(wishlistItems.id, id), eq(wishlistItems.claimedByToken, proof)),
      )
      .run();
    if (!updated.changes)
      fail(
        403,
        "Seule la personne qui a réservé peut annuler depuis son navigateur.",
      );
    return { success: true, message: "Réservation annulée." };
  });
  if (response.ok) response.cookies.delete(`claim_${id}`);
  return response;
}
