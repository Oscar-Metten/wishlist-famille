import { NextRequest } from "next/server";
import { db, wishlistItems, wishlists } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import {
  endpoint,
  requireUser,
  ownList,
  session,
  requireVisitor,
  safeItem,
  itemData,
  fail,
} from "@/lib/server";
type Context = { params: Promise<{ id: string }> };
export async function GET(r: NextRequest, c: Context) {
  return endpoint(async () => {
    const { id } = await c.params;
    const list = db.select().from(wishlists).where(eq(wishlists.id, id)).get();
    const owner = !!list && session(r)?.id === list.ownerId;
    if (!list || (!owner && !list.isPublic)) fail(404, "Liste introuvable.");
    if (!owner) requireVisitor(r);
    const manage = owner && r.nextUrl.searchParams.get("manage") === "1";
    const items = db
      .select()
      .from(wishlistItems)
      .where(
        manage
          ? eq(wishlistItems.wishlistId, id)
          : and(
              eq(wishlistItems.wishlistId, id),
              eq(wishlistItems.isArchived, false),
            ),
      )
      .orderBy(wishlistItems.sortOrder)
      .all();
    return {
      success: true,
      isOwner: owner,
      items: items.map((i) => safeItem(i, r, owner)),
    };
  });
}
export async function POST(r: NextRequest, c: Context) {
  return endpoint(async () => {
    const list = ownList(requireUser(r), (await c.params).id),
      data = itemData(await r.json());
    const count = db
      .select()
      .from(wishlistItems)
      .where(eq(wishlistItems.wishlistId, list.id))
      .all().length;
    const item = db
      .insert(wishlistItems)
      .values({ ...data, wishlistId: list.id, sortOrder: count })
      .returning()
      .get();
    return { success: true, item: safeItem(item!, r, true) };
  });
}
