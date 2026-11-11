export function formatPrice(price: number | null, currency = "EUR") {
  if (price === null || !Number.isFinite(price)) return "";
  try {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency,
    }).format(price);
  } catch {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(price);
  }
}
