import { NextRequest, NextResponse } from "next/server";
import {
  db,
  wishlists,
  wishlistItems,
  settings,
  type WishlistItem,
} from "./db";
import { eq } from "drizzle-orm";
import {
  verifyAccessToken,
  verifySiteAccess,
  type TokenPayload,
} from "./auth/utils";
import { createHash } from "node:crypto";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const fail = (status: number, message: string): never => {
  throw new HttpError(status, message);
};
export async function endpoint(fn: () => unknown | Promise<unknown>) {
  try {
    return NextResponse.json(await fn(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof HttpError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    if (error instanceof SyntaxError)
      return NextResponse.json(
        { error: "Données invalides." },
        { status: 400 },
      );
    console.error(error);
    return NextResponse.json(
      { error: "Une erreur est survenue." },
      { status: 500 },
    );
  }
}
export function session(request: NextRequest) {
  const token = request.cookies.get("access_token")?.value;
  return token ? verifyAccessToken(token) : null;
}
export function requireUser(request: NextRequest) {
  return session(request) || fail(401, "Connectez-vous pour continuer.");
}
export function requireAdmin(request: NextRequest) {
  const u = requireUser(request);
  if (u.role !== "admin") fail(403, "Action réservée à l’administrateur.");
  return u;
}
export function ownList(user: TokenPayload, id: string) {
  const list = db.select().from(wishlists).where(eq(wishlists.id, id)).get();
  if (!list || list.ownerId !== user.id) return fail(404, "Liste introuvable.");
  return list;
}
export function ownItem(user: TokenPayload, id: string) {
  const item = db
    .select()
    .from(wishlistItems)
    .where(eq(wishlistItems.id, id))
    .get();
  if (!item) return fail(404, "Cadeau introuvable.");
  ownList(user, item.wishlistId);
  return item;
}
export function visitorAllowed(request: NextRequest) {
  if (session(request)) return true;
  const all = db.select().from(settings).all();
  const enabled =
    all.find((s) => s.key === "passwordLockEnabled")?.value === "true";
  const hash = all.find((s) => s.key === "passwordLockHash")?.value || "";
  return (
    !enabled ||
    verifySiteAccess(request.cookies.get("site_unlocked")?.value || "", hash)
  );
}
export function requireVisitor(request: NextRequest) {
  if (!visitorAllowed(request))
    fail(403, "Saisissez le mot de passe familial.");
}
export const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export function safeItem(
  item: WishlistItem,
  request: NextRequest,
  hideClaims = false,
) {
  const { claimedByToken, ...safe } = item;
  return {
    ...safe,
    claimedAt: hideClaims ? null : safe.claimedAt,
    claimedByName: hideClaims ? null : safe.claimedByName,
    claimedByNote: hideClaims ? null : safe.claimedByNote,
    isPurchased: hideClaims ? false : safe.isPurchased,
    canCancel:
      !hideClaims &&
      !!claimedByToken &&
      tokenHash(request.cookies.get(`claim_${item.id}`)?.value || "") ===
        claimedByToken,
  };
}
export function text(value: unknown, max = 3000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
export function validImage(value: unknown) {
  const s = text(value, 2000);
  if (!s) return null;
  if (/^\/uploads\/[a-zA-Z0-9_/-]+\.webp$/.test(s)) return s;
  try {
    const url = new URL(s);
    if (
      ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password
    )
      return s;
  } catch {}
  return fail(400, "Adresse d’image invalide.");
}
export function itemData(body: Record<string, unknown>) {
  const name = text(body.name, 200);
  if (!name) fail(400, "Le nom du cadeau est obligatoire.");
  const price =
    body.price === null || body.price === undefined || body.price === ""
      ? null
      : Number(body.price);
  if (price !== null && (!Number.isFinite(price) || price < 0 || price > 1e8))
    fail(400, "Prix invalide.");
  const currency = text(body.currency || "EUR", 3).toUpperCase();
  if (!["EUR", "USD", "GBP", "CHF", "CAD"].includes(currency))
    fail(400, "Devise invalide.");
  if (
    body.purchaseUrls &&
    (!Array.isArray(body.purchaseUrls) || body.purchaseUrls.length > 20)
  )
    fail(400, "Trop de liens.");
  const purchaseUrls = (
    (body.purchaseUrls as { label: unknown; url: unknown }[]) || []
  ).map((link) => {
    try {
      const url = new URL(text(link.url, 2000));
      if (
        ["https:", "http:"].includes(url.protocol) &&
        !url.username &&
        !url.password
      )
        return { label: text(link.label, 100) || url.hostname, url: url.href };
    } catch {}
    return fail(400, "Un lien de boutique est invalide.");
  });
  return {
    name,
    description: text(body.description) || null,
    price,
    currency,
    imageUrl: validImage(body.imageUrl),
    purchaseUrls,
    quantity: 1,
  };
}
export function listData(body: Record<string, unknown>) {
  const name = text(body.name, 100),
    slug = text(body.slug, 80);
  if (
    !name ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
    ["admin", "api", "uploads", "lock"].includes(slug)
  )
    fail(
      400,
      "Nom ou adresse de liste invalide. Utilisez des lettres minuscules, chiffres et tirets.",
    );
  return {
    name,
    slug,
    description: text(body.description) || null,
    preferences: text(body.preferences, 20000) || null,
    imageUrl: validImage(body.imageUrl),
    isPublic: body.isPublic === true,
  };
}
