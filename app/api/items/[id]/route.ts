import { NextRequest } from "next/server";
import { db, wishlistItems } from "@/lib/db";
import { eq } from "drizzle-orm";
import {
  endpoint,
  requireUser,
  ownItem,
  itemData,
  safeItem,
} from "@/lib/server";
type Context = { params: Promise<{ id: string }> };
export async function GET(r: NextRequest, c: Context) {
  return endpoint(async () => ({
    success: true,
    item: safeItem(ownItem(requireUser(r), (await c.params).id), r, true),
  }));
}
export async function PATCH(r: NextRequest, c: Context) {
  return endpoint(async () => {
    const item = ownItem(requireUser(r), (await c.params).id),
      body = await r.json();
    const data = itemData({ ...item, ...body });
    const updated = db
      .update(wishlistItems)
      .set({
        ...data,
        isArchived:
          body.isArchived === undefined
            ? item.isArchived
            : body.isArchived === true,
        updatedAt: new Date(),
      })
      .where(eq(wishlistItems.id, item.id))
      .returning()
      .get();
    return { success: true, item: safeItem(updated!, r, true) };
  });
}
export async function DELETE(r: NextRequest, c: Context) {
  return endpoint(async () => {
    const item = ownItem(requireUser(r), (await c.params).id);
    db.delete(wishlistItems).where(eq(wishlistItems.id, item.id)).run();
    return { success: true };
  });
}
