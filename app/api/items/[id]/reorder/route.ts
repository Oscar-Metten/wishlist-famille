import { NextRequest } from "next/server";
import { db, wishlistItems } from "@/lib/db";
import { eq } from "drizzle-orm";
import { endpoint, requireUser, ownItem, fail, safeItem } from "@/lib/server";
export async function POST(
  r: NextRequest,
  c: { params: Promise<{ id: string }> },
) {
  return endpoint(async () => {
    const u = requireUser(r),
      current = ownItem(u, (await c.params).id);
    const { newSortOrder } = await r.json();
    const rows = db
      .select()
      .from(wishlistItems)
      .where(eq(wishlistItems.wishlistId, current.wishlistId))
      .orderBy(wishlistItems.sortOrder)
      .all();
    if (
      !Number.isInteger(newSortOrder) ||
      newSortOrder < 0 ||
      newSortOrder >= rows.length
    )
      fail(400, "Position invalide.");
    const index = rows.findIndex((row) => row.id === current.id);
    rows.splice(index, 1);
    rows.splice(newSortOrder, 0, current);
    db.transaction((tx) => {
      rows.forEach((row, sortOrder) =>
        tx
          .update(wishlistItems)
          .set({ sortOrder })
          .where(eq(wishlistItems.id, row.id))
          .run(),
      );
    });
    return {
      success: true,
      item: safeItem({ ...current, sortOrder: newSortOrder }, r, true),
    };
  });
}
