import test, { mock } from "node:test";
import assert from "node:assert/strict";
import https from "node:https";
import { Readable } from "node:stream";
import { EventEmitter } from "node:events";
import { fetchProductHtml, parseProductHtml } from "../lib/scraping/service";

test("Import HTTP : connexion à l’IP validée et récupération complète", async () => {
  const html =
    '<title>Produit homelab</title><script type="application/ld+json">{"@type":"Product","name":"SSD de test","image":"https://example.com/ssd.webp","offers":{"price":"129,90","priceCurrency":"EUR"}}</script>';
  const stub = mock.method(https, "get", ((
    _url: unknown,
    options: any,
    callback: any,
  ) => {
    options.lookup(
      "example.com",
      { all: true },
      (error: unknown, addresses: unknown) => {
        assert.equal(error, null);
        assert.deepEqual(addresses, [{ address: "93.184.216.34", family: 4 }]);
      },
    );
    options.lookup(
      "example.com",
      {},
      (error: unknown, address: unknown, family: unknown) => {
        assert.equal(address, "93.184.216.34");
        assert.equal(family, 4);
      },
    );
    const req = new EventEmitter();
    queueMicrotask(() => {
      const response = Readable.from([Buffer.from(html)]) as any;
      response.statusCode = 200;
      response.headers = { "content-type": "text/html" };
      callback(response);
    });
    return req;
  }) as any);
  try {
    const page = await fetchProductHtml("https://93.184.216.34/product");
    const product = parseProductHtml(page.html, page.url);
    assert.equal(product.title, "SSD de test");
    assert.equal(product.price, 129.9);
    assert.equal(product.currency, "EUR");
    assert.equal(product.imageUrl, "https://example.com/ssd.webp");
  } finally {
    stub.mock.restore();
  }
});
test("Import HTTP : une redirection ne peut pas atteindre le NAS", async () => {
  const stub = mock.method(https, "get", ((
    _url: unknown,
    _options: unknown,
    callback: any,
  ) => {
    const req = new EventEmitter();
    queueMicrotask(() => {
      const r = Readable.from([]) as any;
      r.statusCode = 302;
      r.headers = { location: "http://192.168.1.1/admin" };
      callback(r);
    });
    return req;
  }) as any);
  try {
    await assert.rejects(
      () => fetchProductHtml("https://93.184.216.34/product"),
      /privées/,
    );
    assert.equal(stub.mock.callCount(), 1);
  } finally {
    stub.mock.restore();
  }
});
