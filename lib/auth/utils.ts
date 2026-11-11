import jwt from "jsonwebtoken";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { db, users } from "../db";
import { eq } from "drizzle-orm";
let secret: string;
function getSecret() {
  if (secret) return secret;
  if (process.env.SECRET) {
    if (process.env.SECRET.length < 32)
      throw new Error("SECRET doit contenir au moins 32 caractères.");
    return (secret = process.env.SECRET);
  }
  const dir = process.env.DATA_DIR || path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "family-session-secret");
  if (fs.existsSync(file)) return (secret = fs.readFileSync(file, "utf8"));
  secret = randomBytes(64).toString("hex");
  fs.writeFileSync(file, secret, { mode: 0o600, flag: "wx" });
  return secret;
}
export interface TokenPayload {
  id: string;
  username: string;
  displayName: string;
  role: string;
  authVersion: number;
  type?: string;
}
export function generateAccessToken(user: TokenPayload) {
  return jwt.sign(
    { id: user.id, authVersion: user.authVersion, type: "access" },
    getSecret(),
    { expiresIn: "12h" },
  );
}
export function generateRefreshToken(user: TokenPayload) {
  return jwt.sign(
    { id: user.id, authVersion: user.authVersion, type: "refresh" },
    getSecret(),
    { expiresIn: "30d" },
  );
}
function verify(token: string, type: string): TokenPayload | null {
  try {
    const payload = jwt.verify(token, getSecret()) as {
      id: string;
      authVersion: number;
      type: string;
    };
    if (payload.type !== type) return null;
    const user = db.select().from(users).where(eq(users.id, payload.id)).get();
    if (!user || user.authVersion !== payload.authVersion) return null;
    const { passwordHash: _, ...safe } = user;
    return safe;
  } catch {
    return null;
  }
}
export const verifyAccessToken = (token: string) => verify(token, "access");
export const verifyRefreshToken = (token: string) => verify(token, "refresh");
export function signSiteAccess(hash: string) {
  return jwt.sign({ type: "visitor", hash }, getSecret(), { expiresIn: "7d" });
}
export function verifySiteAccess(token: string, hash: string) {
  try {
    const p = jwt.verify(token, getSecret()) as { type: string; hash: string };
    return p.type === "visitor" && p.hash === hash;
  } catch {
    return false;
  }
}
export function isSecureCookie(request: {
  url: string;
  headers: { get(name: string): string | null };
}) {
  if (process.env.COOKIE_SECURE !== undefined)
    return process.env.COOKIE_SECURE === "true";
  return (
    request.headers.get("x-forwarded-proto") === "https" ||
    request.url.startsWith("https:")
  );
}
