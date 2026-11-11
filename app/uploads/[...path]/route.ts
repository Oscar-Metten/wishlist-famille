import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { eq, and, or } from "drizzle-orm";
import { db, wishlists, wishlistItems } from "@/lib/db";
import { session, visitorAllowed } from "@/lib/server";
export async function GET(
  r: NextRequest,
  c: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await c.params;
  if (
    segments.length !== 2 ||
    segments.some((s) => !/^[a-zA-Z0-9_-]+(?:\.webp)?$/.test(s))
  )
    return new NextResponse(null, { status: 404 });
  const imageUrl = "/uploads/" + segments.join("/");
  const user = session(r);
  const ownDraft = user?.id === segments[0];
  const listImage = db
    .select()
    .from(wishlists)
    .where(
      and(
        eq(wishlists.imageUrl, imageUrl),
        user
          ? or(eq(wishlists.isPublic, true), eq(wishlists.ownerId, user.id))
          : eq(wishlists.isPublic, true),
      ),
    )
    .get();
  const itemImage = db
    .select()
    .from(wishlistItems)
    .innerJoin(wishlists, eq(wishlists.id, wishlistItems.wishlistId))
    .where(
      and(
        eq(wishlistItems.imageUrl, imageUrl),
        eq(wishlistItems.isArchived, false),
        user
          ? or(eq(wishlists.isPublic, true), eq(wishlists.ownerId, user.id))
          : eq(wishlists.isPublic, true),
      ),
    )
    .get();
  if (!ownDraft && (!(listImage || itemImage) || !visitorAllowed(r)))
    return new NextResponse(null, { status: 404 });
  try {
    const base = path.resolve(
      process.env.DATA_DIR || path.join(process.cwd(), "data"),
      "uploads",
    );
    const file = path.resolve(base, ...segments);
    if (!file.startsWith(base + path.sep))
      return new NextResponse(null, { status: 404 });
    return new NextResponse(await readFile(file), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
