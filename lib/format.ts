/** Shared display formatting for listings, reused by cards, popups, and markers. */

const CAD = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 0
});

export function formatRent(rent: number): string {
  return `${CAD.format(rent)}/mo`;
}

export function bedroomLabel(bedrooms: number): string {
  if (bedrooms === 0) {
    return "Studio";
  }
  return `${bedrooms} bed${bedrooms === 1 ? "" : "s"}`;
}

export function bathroomLabel(bathrooms: number): string {
  return `${bathrooms} bath${bathrooms === 1 ? "" : "s"}`;
}

/** Compact price for map markers: $980, $2.4k, $3k. */
export function formatPriceShort(rent: number): string {
  if (rent < 1000) {
    return `$${rent}`;
  }
  const rounded = Math.round(rent / 100) / 10;
  return `$${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}k`;
}
