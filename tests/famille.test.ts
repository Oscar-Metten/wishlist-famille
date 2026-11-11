import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
const dir = mkdtempSync(path.join(tmpdir(), "wishlist-test-"));
process.env.DATA_DIR = dir;
process.env.ADMIN_USERNAME = "admin";
process.env.ADMIN_PASSWORD = "Test-password-123456";
process.env.SECRET = randomBytes(48).toString("hex");
import {
  db,
  users,
  wishlists,
  wishlistItems,
  initializeDatabase,
} from "../lib/db";
import { eq } from "drizzle-orm";
import { generateAccessToken, verifyAccessToken } from "../lib/auth/utils";
import { hashPassword, checkPassword } from "../lib/auth/password";
import {
  parsePrice,
  parseProductHtml,
  isPublicAddress,
  validateTarget,
} from "../lib/scraping/service";
import * as accounts from "../app/api/users/route";
import * as lists from "../app/api/wishlists/route";
import * as list from "../app/api/wishlists/[id]/route";
import * as items from "../app/api/wishlists/[id]/items/route";
import * as item from "../app/api/items/[id]/route";
import * as reorder from "../app/api/items/[id]/reorder/route";
import * as listReorder from "../app/api/wishlists/[id]/reorder/route";
import * as claims from "../app/api/public/items/[id]/claim/route";
import * as cancellations from "../app/api/public/items/[id]/unclaim/route";
import * as uploads from "../app/uploads/route";
import * as images from "../app/uploads/[...path]/route";
import * as settings from "../app/api/settings/route";
import * as lock from "../app/api/lock/route";
import * as login from "../app/api/auth/login/route";
import * as me from "../app/api/auth/me/route";
import * as changePassword from "../app/api/auth/password/route";
import { proxy } from "../proxy";
const context = (id: string) => ({ params: Promise.resolve({ id }) });
const req = (url: string, method = "GET", body?: unknown, cookie = "") =>
  new NextRequest("http://localhost:3000" + url, {
    method,
    headers: { "Content-Type": "application/json", cookie },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
const cookieFor = (username: string) => {
  const u = db.select().from(users).where(eq(users.username, username)).get()!;
  return "access_token=" + generateAccessToken(u);
};

test("Import produit : prix français, données structurées et images relatives", () => {
  for (const [value, expected] of [
    ["99,99 €", 99.99],
    ["€99,99", 99.99],
    ["1 299,90 €", 1299.9],
    ["1.299,90", 1299.9],
    ["$1,299.90", 1299.9],
    ["1299.90", 1299.9],
    ["", null],
  ] as const)
    assert.equal(parsePrice(value), expected, value);
  const html = `<script type="application/ld+json">{"@graph":[{"@type":"Product","name":"LEGO Test","image":["/photo.png"],"description":"Un <b>set</b>","offers":{"price":"129,90","priceCurrency":"EUR"}}]}</script>`;
  const data = parseProductHtml(html, "https://shop.example/product");
  assert.equal(data.title, "LEGO Test");
  assert.equal(data.price, 129.9);
  assert.equal(data.currency, "EUR");
  assert.equal(data.imageUrl, "https://shop.example/photo.png");
  assert.equal(data.description, "Un set");
  const partial = parseProductHtml(
    '<meta property="og:title" content="NAS"><meta property="product:price:amount" content="100">',
    "https://example.com/p",
  );
  assert.equal(partial.title, "NAS");
  assert.equal(partial.price, null, "Aucune devise inventée");
});
test("Import : refus du réseau local, IPv6 et protocoles dangereux", async () => {
  for (const ip of [
    "127.0.0.1",
    "10.0.0.2",
    "172.16.0.2",
    "192.168.1.2",
    "169.254.169.254",
    "100.64.1.2",
    "::1",
    "::ffff:127.0.0.1",
    "fe80::1",
    "fc00::1",
    "2001:db8::1",
    "2002:7f00:1::",
  ])
    assert.equal(isPublicAddress(ip), false, ip);
  for (const ip of ["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111"])
    assert.equal(isPublicAddress(ip), true, ip);
  for (const url of [
    "http://127.0.0.1/",
    "http://2130706433/",
    "http://[::1]/",
    "file:///etc/passwd",
    "http://192.168.1.1:80",
    "http://example.com:8000",
    "https://user:pass@example.com/",
  ])
    await assert.rejects(() => validateTarget(url), url);
});
test("Mots de passe salés et comparaison", () => {
  const hash = hashPassword("Test-password-123456");
  assert.equal(checkPassword("Test-password-123456", hash), true);
  assert.equal(checkPassword("wrong", hash), false);
  assert.notEqual(hashPassword("Test-password-123456"), hash);
});
test("Parcours familial : isolation, import photos, réservations et sessions", async (t) => {
  await initializeDatabase();
  const admin = cookieFor("admin");
  assert.equal(
    (await me.GET(req("/api/auth/me", "GET", undefined, admin))).status,
    200,
  );
  await t.test("création des comptes avec première liste privée", async () => {
    for (const name of ["alice", "bob"]) {
      const r = await accounts.POST(
        req(
          "/api/users",
          "POST",
          {
            username: name,
            displayName: name,
            password: "Test-password-123456",
          },
          admin,
        ),
      );
      assert.equal(r.status, 200, await r.clone().text());
      assert.equal(
        db
          .select()
          .from(wishlists)
          .where(
            eq(
              wishlists.ownerId,
              db.select().from(users).where(eq(users.username, name)).get()!.id,
            ),
          )
          .all().length,
        1,
      );
    }
    const r = await login.POST(
      req("/api/auth/login", "POST", {
        username: "alice",
        password: "Test-password-123456",
      }),
    );
    assert.equal(r.status, 200);
    assert.ok(r.cookies.get("access_token")?.value);
    assert.equal((await r.json()).accessToken, undefined);
  });
  const alice = cookieFor("alice"),
    bob = cookieFor("bob");
  const a = db.select().from(users).where(eq(users.username, "alice")).get()!;
  const b = db.select().from(users).where(eq(users.username, "bob")).get()!;
  const al = db
    .select()
    .from(wishlists)
    .where(eq(wishlists.ownerId, a.id))
    .get()!;
  const bl = db
    .select()
    .from(wishlists)
    .where(eq(wishlists.ownerId, b.id))
    .get()!;
  await t.test("listes et paramètres privés restent isolés", async () => {
    const data = await (
      await lists.GET(req("/api/wishlists", "GET", undefined, bob))
    ).json();
    assert.deepEqual(
      data.wishlists.map((l: any) => l.id),
      [bl.id],
    );
    for (const method of ["GET", "PATCH", "DELETE"] as const) {
      const r = await list[method](
        req(
          "/api/wishlists/" + al.id,
          method,
          method === "PATCH" ? { name: "vol" } : undefined,
          bob,
        ),
        context(al.id),
      );
      assert.equal(r.status, 404);
    }
    assert.equal(
      (
        await items.GET(
          req("/api/wishlists/" + al.id + "/items", "GET", undefined, bob),
          context(al.id),
        )
      ).status,
      404,
    );
    assert.equal(
      (
        await settings.PUT(
          req("/api/settings", "PUT", { siteTitle: "vol" }, bob),
        )
      ).status,
      403,
    );
    assert.equal(
      (await accounts.GET(req("/api/users", "GET", undefined, bob))).status,
      403,
    );
    assert.equal(
      (
        await listReorder.POST(
          req("/x", "POST", { newSortOrder: 0 }, bob),
          context(al.id),
        )
      ).status,
      404,
    );
  });
  await t.test(
    "images réservées aux utilisateurs connectés, photos privées non exposées",
    async () => {
      assert.equal(
        (
          await uploads.POST(
            new NextRequest("http://localhost:3000/uploads", {
              method: "POST",
            }),
          )
        ).status,
        401,
      );
      const form = new FormData();
      form.set("type", "item");
      form.set(
        "file",
        new File(
          [
            Buffer.from(
              "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1X8AAAAASUVORK5CYII=",
              "base64",
            ),
          ],
          "test.png",
          { type: "image/png" },
        ),
      );
      const r = await uploads.POST(
        new NextRequest("http://localhost:3000/uploads", {
          method: "POST",
          headers: { cookie: alice },
          body: form,
        }),
      );
      assert.equal(r.status, 200, await r.clone().text());
      const url = (await r.json()).url;
      assert.match(url, new RegExp("/uploads/" + a.id + "/"));
      const c = { params: Promise.resolve({ path: url.split("/").slice(2) }) };
      assert.equal((await images.GET(req(url), c)).status, 404);
      assert.equal(
        (await images.GET(req(url, "GET", undefined, bob), c)).status,
        404,
      );
      assert.equal(
        (await images.GET(req(url, "GET", undefined, alice), c)).status,
        200,
      );
    },
  );
  const created = await items.POST(
    req(
      "/x",
      "POST",
      {
        name: "SSD NAS",
        price: 129.9,
        purchaseUrls: [
          { label: "LDLC", url: "https://www.ldlc.com/" },
          { label: "Amazon", url: "https://www.amazon.fr/" },
        ],
      },
      alice,
    ),
    context(al.id),
  );
  assert.equal(created.status, 200);
  const gift = (await created.json()).item;
  assert.equal(gift.currency, "EUR");
  assert.equal(gift.purchaseUrls.length, 2);
  await t.test(
    "cadeaux : modification, suppression et ordre protégés",
    async () => {
      assert.equal(
        (
          await item.PATCH(
            req("/x", "PATCH", { name: "vol" }, bob),
            context(gift.id),
          )
        ).status,
        404,
      );
      assert.equal(
        (
          await item.DELETE(
            req("/x", "DELETE", undefined, bob),
            context(gift.id),
          )
        ).status,
        404,
      );
      assert.equal(
        (
          await reorder.POST(
            req("/x", "POST", { newSortOrder: 0 }, bob),
            context(gift.id),
          )
        ).status,
        404,
      );
      assert.equal(
        (
          await reorder.POST(
            req("/x", "POST", { newSortOrder: 0 }, alice),
            context(gift.id),
          )
        ).status,
        200,
      );
      assert.equal(
        (
          await items.POST(
            req(
              "/x",
              "POST",
              {
                name: "Injection",
                purchaseUrls: [{ url: "javascript:alert(1)", label: "X" }],
              },
              alice,
            ),
            context(al.id),
          )
        ).status,
        400,
      );
    },
  );
  await list.PATCH(
    req("/x", "PATCH", { isPublic: true }, alice),
    context(al.id),
  );
  let proof = "";
  await t.test(
    "réservation atomique et annulation avec preuve seulement",
    async () => {
      const results = await Promise.all([
        claims.POST(req("/x", "POST", { name: "Mamie" }), context(gift.id)),
        claims.POST(req("/x", "POST", { name: "Papi" }), context(gift.id)),
      ]);
      assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
      const won = results.find((r) => r.ok)!;
      proof = `claim_${gift.id}=${won.cookies.get("claim_" + gift.id)!.value}`;
      const publicData = await (
        await items.GET(req("/x"), context(al.id))
      ).json();
      assert.equal(publicData.items[0].claimedByToken, undefined);
      assert.equal(publicData.items[0].canCancel, false);
      const owner = await (
        await items.GET(
          req("/x?manage=1", "GET", undefined, alice),
          context(al.id),
        )
      ).json();
      assert.equal(owner.items[0].claimedAt, null);
      assert.equal(owner.items[0].claimedByName, null);
      assert.equal(
        (await cancellations.POST(req("/x", "POST", {}), context(gift.id)))
          .status,
        403,
      );
      assert.equal(
        (await cancellations.POST(req("/x", "POST", {}, bob), context(gift.id)))
          .status,
        403,
      );
      const mine = await (
        await items.GET(req("/x", "GET", undefined, proof), context(al.id))
      ).json();
      assert.equal(mine.items[0].canCancel, true);
      assert.equal(
        (
          await cancellations.POST(
            req("/x", "POST", {}, proof),
            context(gift.id),
          )
        ).status,
        200,
      );
      assert.equal(
        (await claims.POST(req("/x", "POST", {}, alice), context(gift.id)))
          .status,
        403,
      );
    },
  );
  await t.test(
    "mot de passe familial contrôlé côté serveur, hash jamais public",
    async () => {
      const r = await settings.PUT(
        req(
          "/api/settings",
          "PUT",
          { passwordLockEnabled: true, passwordLock: "Family-password-123" },
          admin,
        ),
      );
      assert.equal(r.status, 200);
      const publicSettings = await (
        await settings.GET(req("/api/settings"))
      ).json();
      assert.equal(publicSettings.settings.passwordLockHash, undefined);
      assert.equal((await items.GET(req("/x"), context(al.id))).status, 403);
      assert.equal(
        (await claims.POST(req("/x", "POST", {}), context(gift.id))).status,
        403,
      );
      assert.equal(
        (await items.GET(req("/x", "GET", undefined, bob), context(al.id)))
          .status,
        200,
      );
      const unlock = await lock.POST(
        req("/api/lock", "POST", { password: "Family-password-123" }),
      );
      assert.equal(unlock.status, 200);
      const access =
        "site_unlocked=" + unlock.cookies.get("site_unlocked")!.value;
      assert.equal(
        (await items.GET(req("/x", "GET", undefined, access), context(al.id)))
          .status,
        200,
      );
      assert.equal(
        (
          await items.GET(
            req("/x", "GET", undefined, "site_unlocked=true"),
            context(al.id),
          )
        ).status,
        403,
      );
    },
  );
  await t.test(
    "nouveau mot de passe : anciennes sessions invalidées",
    async () => {
      const token = alice.split("=")[1];
      assert.ok(verifyAccessToken(token));
      const r = await changePassword.POST(
        req(
          "/x",
          "POST",
          {
            currentPassword: "Test-password-123456",
            password: "New-password-123456",
          },
          alice,
        ),
      );
      assert.equal(r.status, 200);
      assert.equal(verifyAccessToken(token), null);
    },
  );
});
test("Protection des mutations contre les origines externes", () => {
  assert.equal(
    proxy(
      new NextRequest("http://localhost:3000/api/users", {
        method: "POST",
        headers: { origin: "https://evil.example" },
      }),
    ).status,
    403,
  );
  assert.equal(
    proxy(
      new NextRequest("http://localhost:3000/api/users", {
        method: "POST",
        headers: { origin: "http://localhost:3000" },
      }),
    ).status,
    200,
  );
});
test.after(() => rmSync(dir, { recursive: true, force: true }));
