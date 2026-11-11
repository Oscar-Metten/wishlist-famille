import { NextRequest } from "next/server";
import { db, wishlists } from "@/lib/db";
import { eq } from "drizzle-orm";
import { endpoint, requireUser, listData, fail } from "@/lib/server";
export async function GET(r: NextRequest) {
  return endpoint(() => {
    const u = requireUser(r);
    return {
      success: true,
      wishlists: db
        .select()
        .from(wishlists)
        .where(eq(wishlists.ownerId, u.id))
        .orderBy(wishlists.sortOrder)
        .all(),
    };
  });
}
export async function POST(r: NextRequest) {
  return endpoint(async () => {
    const u = requireUser(r),
      data = listData(await r.json());
    if (db.select().from(wishlists).where(eq(wishlists.slug, data.slug)).get())
      fail(409, "Cette adresse est déjà utilisée.");
    return {
      success: true,
      wishlist: db
        .insert(wishlists)
        .values({ ...data, ownerId: u.id })
        .returning()
        .get(),
    };
  });
}
