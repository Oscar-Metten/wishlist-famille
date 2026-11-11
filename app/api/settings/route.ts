import { NextRequest } from "next/server";
import { db, settings } from "@/lib/db";
import { eq } from "drizzle-orm";
import {
  endpoint,
  requireAdmin,
  visitorAllowed,
  text,
  fail,
} from "@/lib/server";
import { hashPassword } from "@/lib/auth/password";
export async function GET(r: NextRequest) {
  return endpoint(() => {
    const values = Object.fromEntries(
      db
        .select()
        .from(settings)
        .all()
        .map((s) => [s.key, s.value]),
    );
    return {
      success: true,
      settings: {
        siteTitle: values.siteTitle || "Les envies de la famille",
        homepageSubtext:
          values.homepageSubtext || "Des idées pour faire plaisir à chacun.",
        passwordLockEnabled: values.passwordLockEnabled === "true",
        unlocked: visitorAllowed(r),
      },
    };
  });
}
export async function PUT(r: NextRequest) {
  return endpoint(async () => {
    requireAdmin(r);
    const body = await r.json();
    const changes: Record<string, string> = {};
    if (body.siteTitle !== undefined)
      changes.siteTitle = text(body.siteTitle, 100);
    if (body.homepageSubtext !== undefined)
      changes.homepageSubtext = text(body.homepageSubtext, 500);
    if (body.passwordLockEnabled !== undefined)
      changes.passwordLockEnabled = String(body.passwordLockEnabled === true);
    if (body.passwordLock) {
      if (
        typeof body.passwordLock !== "string" ||
        body.passwordLock.length < 12 ||
        body.passwordLock.length > 1024
      )
        fail(
          400,
          "Le mot de passe familial doit contenir au moins 12 caractères.",
        );
      changes.passwordLockHash = hashPassword(body.passwordLock);
    }
    if (
      changes.passwordLockEnabled === "true" &&
      !changes.passwordLockHash &&
      !db
        .select()
        .from(settings)
        .where(eq(settings.key, "passwordLockHash"))
        .get()
    )
      fail(400, "Définissez d’abord le mot de passe familial.");
    db.transaction((tx) => {
      for (const [key, value] of Object.entries(changes))
        tx.insert(settings)
          .values({ key, value })
          .onConflictDoUpdate({
            target: settings.key,
            set: { value, updatedAt: new Date() },
          })
          .run();
    });
    return { success: true };
  });
}
