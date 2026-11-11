import http from "node:http";
import https from "node:https";
import { lookup } from "node:dns/promises";
import { isIP, BlockList } from "node:net";
import * as cheerio from "cheerio";
export interface ScrapedData {
  title: string | null;
  description: string | null;
  price: number | null;
  currency: string | null;
  imageUrl: string | null;
  url: string;
}
const blocked = new BlockList();
for (const [ip, bits] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const)
  blocked.addSubnet(ip, bits, "ipv4");
blocked.addSubnet("2001::", 23, "ipv6");
blocked.addSubnet("2001:db8::", 32, "ipv6");
blocked.addSubnet("2002::", 16, "ipv6");
export function isPublicAddress(address: string) {
  const family = isIP(address);
  if (family === 4) return !blocked.check(address, "ipv4");
  // Accept global unicast IPv6 only; mapped IPv4, local and transition ranges are refused.
  if (family === 6)
    return /^[23]/i.test(address) && !blocked.check(address, "ipv6");
  return false;
}
export async function validateTarget(input: string) {
  const url = new URL(input);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    (url.port && !["80", "443"].includes(url.port))
  )
    throw new Error(
      "Seuls les liens de boutiques HTTP ou HTTPS sont acceptés.",
    );
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  if (!hostname.includes(".") && !isIP(hostname))
    throw new Error("Adresse de boutique invalide.");
  const addresses = isIP(hostname)
    ? [{ address: hostname, family: isIP(hostname) }]
    : await lookup(hostname, { all: true });
  if (!addresses.length || addresses.some((a) => !isPublicAddress(a.address)))
    throw new Error("Les adresses locales et privées sont interdites.");
  return { url, address: addresses[0] };
}
export async function fetchProductHtml(
  input: string,
  signal = AbortSignal.timeout(12000),
  redirects = 0,
): Promise<{ html: string; url: string }> {
  const { url, address } = await validateTarget(input);
  return new Promise((resolve, reject) => {
    const transport = url.protocol === "https:" ? https : http;
    const req = transport.get(
      url,
      {
        signal,
        headers: {
          "User-Agent": "WishlistFamille/1.0 (product metadata)",
          Accept: "text/html,application/xhtml+xml",
          "Accept-Encoding": "identity",
        },
        // Pin the validated address so a second DNS resolution cannot reach the home network.
        lookup: (_host, options, callback) => {
          if (options.all) callback(null, [address]);
          else callback(null, address.address, address.family);
        },
      },
      (res) => {
        if (
          res.statusCode &&
          [301, 302, 303, 307, 308].includes(res.statusCode) &&
          res.headers.location
        ) {
          res.resume();
          if (redirects >= 4) return reject(new Error("Trop de redirections."));
          return fetchProductHtml(
            new URL(res.headers.location, url).href,
            signal,
            redirects + 1,
          ).then(resolve, reject);
        }
        if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
          res.resume();
          return reject(
            new Error(
              "Cette boutique refuse la récupération automatique. Vous pouvez remplir la fiche manuellement.",
            ),
          );
        }
        if (
          !/text\/html|application\/xhtml\+xml/i.test(
            res.headers["content-type"] || "",
          )
        ) {
          res.resume();
          return reject(
            new Error("Ce lien ne correspond pas à une page produit."),
          );
        }
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > 3 * 1024 * 1024) {
            res.destroy();
            reject(new Error("Page trop volumineuse."));
          } else chunks.push(chunk);
        });
        res.on("end", () =>
          resolve({
            html: Buffer.concat(chunks).toString("utf8"),
            url: url.href,
          }),
        );
        res.on("error", reject);
      },
    );
    req.on("error", reject);
  });
}
export function parsePrice(value: unknown): number | null {
  if (typeof value === "number")
    return Number.isFinite(value) && value >= 0 ? value : null;
  if (typeof value !== "string") return null;
  let s = value.replace(/[\s\u00a0\u202f]/g, "").replace(/[^\d.,]/g, "");
  if (!s) return null;
  const comma = s.lastIndexOf(","),
    dot = s.lastIndexOf(".");
  if (comma >= 0 && dot >= 0)
    s =
      comma > dot
        ? s.replace(/\./g, "").replace(",", ".")
        : s.replace(/,/g, "");
  else if (comma >= 0)
    s = /,\d{1,2}$/.test(s) ? s.replace(",", ".") : s.replace(/,/g, "");
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
type JsonObject = Record<string, any>;
function findProduct(value: unknown): JsonObject | null {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findProduct(item);
      if (found) return found;
    }
    return null;
  }
  const obj = value as JsonObject;
  const types = Array.isArray(obj["@type"]) ? obj["@type"] : [obj["@type"]];
  if (
    types.some(
      (t: unknown) => typeof t === "string" && /(?:^|\/)Product$/.test(t),
    )
  )
    return obj;
  return findProduct(obj["@graph"]) || findProduct(obj.mainEntity);
}
export function parseProductHtml(html: string, url: string): ScrapedData {
  const $ = cheerio.load(html);
  const meta = (...selectors: string[]) => {
    for (const selector of selectors) {
      const value = $(selector).first().attr("content");
      if (value) return value;
    }
    return null;
  };
  let product: JsonObject | null = null;
  $('script[type="application/ld+json"]').each((_i, el) => {
    if (product) return;
    try {
      product = findProduct(JSON.parse($(el).text()));
    } catch {}
  });
  const p = product as JsonObject | null;
  let offer = Array.isArray(p?.offers) ? p.offers[0] : p?.offers;
  if (offer?.offers)
    offer = Array.isArray(offer.offers) ? offer.offers[0] : offer.offers;
  const amount =
    offer?.price ??
    offer?.lowPrice ??
    offer?.priceSpecification?.price ??
    meta(
      'meta[property="product:price:amount"]',
      'meta[property="og:price:amount"]',
      'meta[itemprop="price"]',
    ) ??
    $('[itemprop="price"]').first().attr("content") ??
    $(".a-price .a-offscreen, .product-price, .price").first().text();
  const currencyRaw =
    offer?.priceCurrency ??
    offer?.priceSpecification?.priceCurrency ??
    meta(
      'meta[property="product:price:currency"]',
      'meta[property="og:price:currency"]',
      'meta[itemprop="priceCurrency"]',
    );
  // Never label an unknown foreign price as EUR: the person confirms it manually.
  const currency =
    typeof currencyRaw === "string" &&
    /^[A-Z]{3}$/.test(currencyRaw.toUpperCase())
      ? currencyRaw.toUpperCase()
      : typeof amount === "string" && amount.includes("€")
        ? "EUR"
        : null;
  const price = parsePrice(amount);
  const image = Array.isArray(p?.image) ? p.image[0] : p?.image;
  const imageString = typeof image === "string" ? image : image?.url;
  let imageUrl: string | null = null;
  try {
    const candidate = new URL(
      imageString ||
        meta('meta[property="og:image"]', 'meta[name="twitter:image"]') ||
        "",
      url,
    );
    if (
      candidate.href !== url &&
      ["http:", "https:"].includes(candidate.protocol)
    )
      imageUrl = candidate.href;
  } catch {}
  const clean = (value: unknown, max: number) =>
    typeof value === "string"
      ? $("<div>").html(value).text().trim().slice(0, max) || null
      : null;
  return {
    title: clean(
      p?.name || meta('meta[property="og:title"]') || $("title").text(),
      200,
    ),
    description: clean(
      p?.description ||
        meta('meta[property="og:description"]', 'meta[name="description"]'),
      3000,
    ),
    price: currency ? price : null,
    currency,
    imageUrl,
    url,
  };
}
export async function scrapeUrl(url: string) {
  const page = await fetchProductHtml(url);
  return parseProductHtml(page.html, page.url);
}
