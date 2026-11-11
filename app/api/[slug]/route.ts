import { NextRequest } from "next/server";
import { db, wishlists } from "@/lib/db";
import { eq } from "drizzle-orm";
import { endpoint, session, requireVisitor, fail } from "@/lib/server";
export async function GET(
  r: NextRequest,
  c: { params: Promise<{ slug: string }> },
) {
  return endpoint(async () => {
    const list = db
      .select()
      .from(wishlists)
      .where(eq(wishlists.slug, (await c.params).slug))
      .get();
    if (!list || !list.isPublic) fail(404, "Liste introuvable.");
    requireVisitor(r);
    const { ownerId, ...safe } = list!;
    return {
      success: true,
      wishlist: safe,
      isOwner: ownerId === session(r)?.id,
    };
  });
}
