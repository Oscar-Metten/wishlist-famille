import { NextRequest } from "next/server";
import { endpoint, requireUser, fail, text } from "@/lib/server";
import { scrapeUrl } from "@/lib/scraping/service";
export async function POST(r: NextRequest) {
  return endpoint(async () => {
    requireUser(r);
    const { url } = await r.json();
    if (!text(url, 2000)) fail(400, "Collez un lien de boutique.");
    try {
      return { success: true, data: await scrapeUrl(text(url, 2000)) };
    } catch (error) {
      return fail(
        422,
        error instanceof Error &&
          /^(Seuls|Adresse|Les adresses|Trop|Cette boutique|Ce lien|Page)/.test(
            error.message,
          )
          ? error.message
          : "La boutique ne répond pas ou bloque la récupération. Complétez la fiche manuellement.",
      );
    }
  });
}
