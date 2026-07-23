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

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Format an ISO calendar date (YYYY-MM-DD) as "Aug 3". Parsed by string split,
 * not Date, so the day never shifts across timezones.
 */
export function formatMoveInDate(isoDate: string): string {
  const [, month, day] = isoDate.split("-").map(Number);
  return `${MONTHS[month - 1]} ${day}`;
}

/** Compact price for map markers: $980, $2.4k, $3k. */
export function formatPriceShort(rent: number): string {
  if (rent < 1000) {
    return `$${rent}`;
  }
  const rounded = Math.round(rent / 100) / 10;
  return `$${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}k`;
}
