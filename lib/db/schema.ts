import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";
import { sql } from "drizzle-orm";

/** Schéma familial : comptes personnels, listes et réservations. */

export const users = sqliteTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("member"),
  authVersion: integer("auth_version").notNull().default(1),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Wishlists table
export const wishlists = sqliteTable("wishlists", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  ownerId: text("owner_id").references(() => users.id),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  preferences: text("preferences"), // General interests/likes section
  imageUrl: text("image_url"),
  isPublic: integer("is_public", { mode: "boolean" }).notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Wishlist items table
export const wishlistItems = sqliteTable("wishlist_items", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  wishlistId: text("wishlist_id")
    .notNull()
    .references(() => wishlists.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  price: real("price"),
  currency: text("currency").notNull().default("EUR"),
  quantity: integer("quantity").notNull().default(1),
  imageUrl: text("images"), // Stored as 'images' in DB but exposed as imageUrl
  purchaseUrls: text("purchase_urls", { mode: "json" }).$type<
    Array<{
      label: string;
      url: string;
    }>
  >(),

  isArchived: integer("is_archived", { mode: "boolean" })
    .notNull()
    .default(false),

  // Claim information
  claimedByName: text("claimed_by_name"),
  claimedByNote: text("claimed_by_note"),
  claimedByToken: text("claimed_by_token").unique(),
  claimedAt: integer("claimed_at", { mode: "timestamp" }),
  isPurchased: integer("is_purchased", { mode: "boolean" })
    .notNull()
    .default(false),

  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Settings table
export const settings = sqliteTable("settings", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Type exports
export type Wishlist = typeof wishlists.$inferSelect;
export type WishlistItem = typeof wishlistItems.$inferSelect;
export type Setting = typeof settings.$inferSelect;
