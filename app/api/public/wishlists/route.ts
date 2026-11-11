import { NextRequest } from "next/server";
import { db, wishlists } from "@/lib/db";
import { eq } from "drizzle-orm";
import { endpoint, requireVisitor } from "@/lib/server";
export async function GET(r: NextRequest) {
  return endpoint(() => {
    requireVisitor(r);
    return {
      success: true,
      wishlists: db
        .select()
        .from(wishlists)
        .where(eq(wishlists.isPublic, true))
        .orderBy(wishlists.sortOrder)
        .all()
        .map(({ ownerId: _, ...list }) => list),
    };
  });
}
