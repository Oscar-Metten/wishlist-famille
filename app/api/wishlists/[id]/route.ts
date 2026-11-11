import { NextRequest } from "next/server";
import { db, wishlists } from "@/lib/db";
import { eq } from "drizzle-orm";
import { endpoint, requireUser, ownList, listData, fail } from "@/lib/server";
type Context = { params: Promise<{ id: string }> };
export async function GET(r: NextRequest, c: Context) {
  return endpoint(async () => ({
    success: true,
    wishlist: ownList(requireUser(r), (await c.params).id),
  }));
}
export async function PATCH(r: NextRequest, c: Context) {
  return endpoint(async () => {
    const list = ownList(requireUser(r), (await c.params).id);
    const data = listData({ ...list, ...(await r.json()) });
    const conflict = db
      .select()
      .from(wishlists)
      .where(eq(wishlists.slug, data.slug))
      .get();
    if (conflict && conflict.id !== list.id)
      fail(409, "Cette adresse est déjà utilisée.");
    return {
      success: true,
      wishlist: db
        .update(wishlists)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(wishlists.id, list.id))
        .returning()
        .get(),
    };
  });
}
export async function DELETE(r: NextRequest, c: Context) {
  return endpoint(async () => {
    const list = ownList(requireUser(r), (await c.params).id);
    db.delete(wishlists).where(eq(wishlists.id, list.id)).run();
    return { success: true };
  });
}
