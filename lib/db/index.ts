import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "node:path";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { hashPassword } from "../auth/password";
let connection: ReturnType<typeof drizzle> | undefined;
export function getDb() {
  if (connection) return connection;
  const dataDir = process.env.DATA_DIR || path.join(process.cwd(), "data");
  fs.mkdirSync(path.join(dataDir, "db"), { recursive: true });
  const sqlite = new Database(path.join(dataDir, "db", "wishlist.db"));
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY NOT NULL, username TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL, password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member', auth_version INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS wishlists (
      id TEXT PRIMARY KEY NOT NULL, owner_id TEXT REFERENCES users(id),
      name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, description TEXT,
      preferences TEXT, image_url TEXT, is_public INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()), updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS wishlist_items (
      id TEXT PRIMARY KEY NOT NULL, wishlist_id TEXT NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
      name TEXT NOT NULL, description TEXT, price REAL, currency TEXT NOT NULL DEFAULT 'EUR',
      quantity INTEGER NOT NULL DEFAULT 1, images TEXT, purchase_urls TEXT,
      is_archived INTEGER NOT NULL DEFAULT 0, claimed_by_name TEXT, claimed_by_note TEXT,
      claimed_by_token TEXT UNIQUE, claimed_at INTEGER, is_purchased INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()), updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY NOT NULL, key TEXT NOT NULL UNIQUE, value TEXT NOT NULL,
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);
  const columns = sqlite.pragma("table_info(wishlists)") as { name: string }[];
  for (const [name, definition] of Object.entries({
    owner_id: "TEXT REFERENCES users(id)",
    preferences: "TEXT",
    image_url: "TEXT",
    sort_order: "INTEGER NOT NULL DEFAULT 0",
  })) {
    if (!columns.some((c) => c.name === name))
      sqlite.exec(`ALTER TABLE wishlists ADD COLUMN ${name} ${definition}`);
  }
  // Bootstrap once. Existing credentials are never overwritten at subsequent starts.
  const count = sqlite.prepare("SELECT count(*) AS n FROM users").get() as {
    n: number;
  };
  if (!count.n && process.env.ADMIN_PASSWORD) {
    if (
      process.env.ADMIN_PASSWORD.length < 12 ||
      process.env.ADMIN_PASSWORD === "changeme"
    )
      throw new Error("ADMIN_PASSWORD doit contenir au moins 12 caractères.");
    const id = randomUUID();
    sqlite.transaction(() => {
      sqlite
        .prepare(
          "INSERT INTO users (id,username,display_name,password_hash,role) VALUES (?,?,?,?,?)",
        )
        .run(
          id,
          (process.env.ADMIN_USERNAME || "admin").toLowerCase(),
          process.env.ADMIN_DISPLAY_NAME || "Administrateur",
          hashPassword(process.env.ADMIN_PASSWORD!),
          "admin",
        );
      sqlite
        .prepare("UPDATE wishlists SET owner_id=? WHERE owner_id IS NULL")
        .run(id);
    })();
  }
  // No example lists or sample gifts are inserted in a family installation.
  connection = drizzle(sqlite, { schema });
  return connection;
}
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    return Reflect.get(getDb(), prop);
  },
});
export async function initializeDatabase() {
  getDb();
  return true;
}
export * from "./schema";
