import { NextRequest } from "next/server";
import { db, wishlists } from "@/lib/db";
import { eq } from "drizzle-orm";
import { endpoint, requireUser, ownList, fail } from "@/lib/server";
export async function POST(
  r: NextRequest,
  c: { params: Promise<{ id: string }> },
) {
  return endpoint(async () => {
    const u = requireUser(r),
      current = ownList(u, (await c.params).id);
    const { newSortOrder } = await r.json();
    const rows = db
      .select()
      .from(wishlists)
      .where(eq(wishlists.ownerId, u.id))
      .orderBy(wishlists.sortOrder)
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
          .update(wishlists)
          .set({ sortOrder })
          .where(eq(wishlists.id, row.id))
          .run(),
      );
    });
    return { success: true, list: { ...current, sortOrder: newSortOrder } };
  });
}
