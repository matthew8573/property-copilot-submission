import type { City, Property, PropertyType } from "./types";

export type SeedProperty = Omit<Property, "geohash" | "geohashPrefix">;

/** Deterministic PRNG so the seed data set is identical on every run. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A rectangle of residential land a listing may be placed in. */
type Area = { minLat: number; maxLat: number; minLng: number; maxLng: number };

type CitySpec = {
  name: City;
  fsa: string; // postal code forward sortation area, e.g. "V6B"
  streets: string[];
  areas: Area[];
};

// Listings are placed inside hand-picked neighbourhood rectangles that are
// entirely residential land. A naive scatter around each city centre put pins
// in Burrard Inlet, False Creek, Stanley Park, and the Fraser River; these
// boxes are drawn to stay clear of water, parks, and the airport.
const CITIES: CitySpec[] = [
  {
    name: "Vancouver",
    fsa: "V6B",
    streets: ["Robson St", "Davie St", "Main St", "Cambie St", "Hastings St", "Granville St"],
    areas: [
      { minLat: 49.276, maxLat: 49.284, minLng: -123.125, maxLng: -123.108 }, // Downtown
      { minLat: 49.258, maxLat: 49.269, minLng: -123.168, maxLng: -123.14 }, // Kitsilano
      { minLat: 49.258, maxLat: 49.264, minLng: -123.138, maxLng: -123.118 }, // Fairview
      { minLat: 49.255, maxLat: 49.266, minLng: -123.11, maxLng: -123.09 }, // Mount Pleasant
      { minLat: 49.258, maxLat: 49.277, minLng: -123.07, maxLng: -123.04 }, // Grandview
      { minLat: 49.24, maxLat: 49.256, minLng: -123.12, maxLng: -123.095 } // Riley Park
    ]
  },
  {
    name: "Richmond",
    fsa: "V6X",
    streets: ["No. 3 Rd", "Westminster Hwy", "Garden City Rd", "Granville Ave", "Cook Rd"],
    areas: [
      { minLat: 49.15, maxLat: 49.185, minLng: -123.155, maxLng: -123.115 }, // City Centre
      { minLat: 49.14, maxLat: 49.175, minLng: -123.115, maxLng: -123.07 } // East Richmond
    ]
  },
  {
    name: "Burnaby",
    fsa: "V5H",
    streets: ["Kingsway", "Willingdon Ave", "Hastings St", "Canada Way", "Lougheed Hwy"],
    areas: [
      { minLat: 49.215, maxLat: 49.232, minLng: -123.008, maxLng: -122.985 }, // Metrotown
      { minLat: 49.252, maxLat: 49.272, minLng: -123.02, maxLng: -122.975 }, // Brentwood
      { minLat: 49.205, maxLat: 49.225, minLng: -122.965, maxLng: -122.935 } // Edmonds
    ]
  },
  {
    name: "Surrey",
    fsa: "V3T",
    streets: ["King George Blvd", "Fraser Hwy", "104 Ave", "152 St", "Scott Rd"],
    areas: [
      { minLat: 49.178, maxLat: 49.198, minLng: -122.865, maxLng: -122.835 }, // City Centre
      { minLat: 49.185, maxLat: 49.198, minLng: -122.805, maxLng: -122.775 }, // Guildford
      { minLat: 49.125, maxLat: 49.155, minLng: -122.87, maxLng: -122.825 }, // Newton
      { minLat: 49.15, maxLat: 49.172, minLng: -122.8, maxLng: -122.765 } // Fleetwood
    ]
  }
];

const PROPERTY_TYPES: PropertyType[] = ["apartment", "condo", "house", "townhouse"];

// Curated, individually verified Unsplash photos (keyless CDN, stable ids) so
// every listing shows actual property — the previous random-photo placeholders
// surfaced people and pets. Cover image matches the listing type; the rest of
// the gallery draws from the interior pool.
const unsplash = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=800&q=80`;

/** Detached / townhouse exteriors — cover images for house-type listings. */
const HOUSE_EXTERIORS = [
  "1564013799919-ab600027ffc6",
  "1570129477492-45c003edd2be",
  "1568605114967-8130f3a36994",
  "1572120360610-d971b9d7767c",
  "1580587771525-78b9dba3b914",
  "1512917774080-9991f1c4c750",
  "1600596542815-ffad4c1539a9",
  "1600585154340-be6161a56a0c",
  "1613490493576-7fde63acd811",
  "1613977257363-707ba9348227",
  "1449844908441-8829872d2607",
  "1523217582562-09d0def993a6",
  "1494526585095-c41746248156",
  "1430285561322-7808604715df",
  "1600585154526-990dced4db0d",
  "1583608205776-bfd35f0d9f83",
  "1567496898669-ee935f5f647a",
  "1416331108676-a22ccb276e35",
  "1605146769289-440113cc3d00",
  "1598228723793-52759bba239c",
  "1600047509358-9dc75507daeb",
  "1600047509807-ba8f99d2cdde",
  "1576941089067-2de3c901e126",
  "1602343168117-bb8ffe3e2e9f",
  "1605276374104-dee2a0ed3cd6",
  "1605146768851-eda79da39897"
].map(unsplash);

/** Multi-unit building exteriors — cover images for apartments and condos. */
const BUILDING_EXTERIORS = [
  "1460317442991-0ec209397118",
  "1515263487990-61b07816b324",
  "1545324418-cc1a3fa10c00",
  "1479839672679-a46483c0e7c8",
  "1481253127861-534498168948",
  "1448630360428-65456885c650",
  "1459767129954-1b1c1f9b9ace",
  "1460574283810-2aab119d8511",
  "1494145904049-0dca59b4bbad",
  "1580216643062-cf460548a66a",
  "1523192193543-6e7296d960e4",
  "1567684014761-b65e2e59b9eb",
  "1574362848149-11496d93a7c7",
  "1624204386084-dd8c05e32226",
  "1516501312919-d0cb0b7b60b8",
  "1579632652768-6cb9dcf85912",
  "1619994121345-b61cd610c5a6",
  "1638973140785-3b918e290682",
  "1432297984334-707d34c4163a",
  "1592276040264-e10344a6a10e",
  "1643906652169-a750f3f70848",
  "1610286986642-057ece0c3656",
  "1542309175-9b88d743f89f",
  "1571236673892-13d222da2019",
  "1605267143746-999bf61d0d08",
  "1626273947634-823f04de159e"
].map(unsplash);

/** Living rooms, kitchens, bedrooms, bathrooms — the rest of each gallery. */
const INTERIORS = [
  "1536376072261-38c75010e6c9",
  "1600607687939-ce8a6c25118c",
  "1600607687920-4e2a09cf159d",
  "1522708323590-d24dbb6b0267",
  "1502672260266-1c1ef2d93688",
  "1560448204-e02f11c3d0e2",
  "1493809842364-78817add7ffb",
  "1484154218962-a197022b5858",
  "1556912173-3bb406ef7e77",
  "1584622650111-993a426fbf0a",
  "1552321554-5fefe8c9ef14",
  "1556020685-ae41abfc9365",
  "1586023492125-27b2c045efd7",
  "1554995207-c18c203602cb",
  "1598928506311-c55ded91a20c",
  "1600210492486-724fe5c67fb0",
  "1560185007-c5ca9d2c014d",
  "1560184897-ae75f418493e",
  "1560448075-bb485b067938",
  "1560185127-6ed189bf02f4",
  "1533044309907-0fa3413da946",
  "1502005229762-cf1b2da7c5d6",
  "1522156373667-4c7234bbd804"
].map(unsplash);

/**
 * A cover deck twice the pool size: every photo once as-is, then once mirrored
 * (imgix `flip=h`). Covers are dealt from the deck without reuse, so no two
 * listings share an identical cover image.
 */
const withMirrors = (urls: string[]): string[] => [
  ...urls,
  ...urls.map((url) => `${url}&flip=h`)
];

const HOUSE_COVERS = withMirrors(HOUSE_EXTERIORS);
const BUILDING_COVERS = withMirrors(BUILDING_EXTERIORS);

function postalCode(fsa: string, rng: () => number): string {
  const digit = () => Math.floor(rng() * 10);
  const letter = () => String.fromCharCode(65 + Math.floor(rng() * 26));
  return `${fsa} ${digit()}${letter()}${digit()}`;
}

/**
 * Generate 50 rental listings spread across Vancouver, Richmond, Burnaby, and
 * Surrey. Deterministic: same data every run, so the map and tests are stable.
 */
export function generateProperties(count = 50): SeedProperty[] {
  const rng = mulberry32(42);
  const properties: SeedProperty[] = [];
  let houseCount = 0;
  let buildingCount = 0;

  for (let i = 0; i < count; i += 1) {
    const city = CITIES[i % CITIES.length];
    const propertyType = PROPERTY_TYPES[Math.floor(rng() * PROPERTY_TYPES.length)];

    // Place the listing uniformly inside one of the city's land rectangles.
    const area = city.areas[Math.floor(rng() * city.areas.length)];
    const lat = Number((area.minLat + rng() * (area.maxLat - area.minLat)).toFixed(6));
    const lng = Number((area.minLng + rng() * (area.maxLng - area.minLng)).toFixed(6));

    const bedrooms = Math.floor(rng() * 5); // 0 (studio) .. 4
    const bathrooms = 1 + Math.floor(rng() * 3); // 1 .. 3
    const squareFeet = 400 + bedrooms * 250 + Math.floor(rng() * 300);
    const rent = 1500 + bedrooms * 600 + Math.floor(rng() * 1200);
    const streetNumber = 100 + Math.floor(rng() * 8900);
    const street = city.streets[Math.floor(rng() * city.streets.length)];

    // Move-in dates spread across the ~2 months after the seed base date.
    const availableFrom = new Date(Date.UTC(2026, 6, 15) + Math.floor(rng() * 60) * 86400000)
      .toISOString()
      .slice(0, 10);

    const id = `prop-${String(i + 1).padStart(3, "0")}`;
    const bedroomLabel = bedrooms === 0 ? "Studio" : `${bedrooms} Bed`;

    // Cover photo matches the listing type, dealt from a mirror-extended deck
    // large enough that no two listings ever share a cover (the modulo is a
    // safety net for counts beyond the deck). Four distinct interiors, sampled
    // per listing, complete the gallery.
    const isHouse = propertyType === "house" || propertyType === "townhouse";
    const cover = isHouse
      ? HOUSE_COVERS[houseCount++ % HOUSE_COVERS.length]
      : BUILDING_COVERS[buildingCount++ % BUILDING_COVERS.length];
    const gallery: string[] = [];
    while (gallery.length < 4) {
      const pick = INTERIORS[Math.floor(rng() * INTERIORS.length)];
      if (!gallery.includes(pick)) {
        gallery.push(pick);
      }
    }

    properties.push({
      id,
      title: `${bedroomLabel} ${propertyType} in ${city.name}`,
      description: `A ${squareFeet} sq ft ${propertyType} near ${street} in ${city.name}, BC. ${bedrooms} bed / ${bathrooms} bath.`,
      rent,
      bedrooms,
      bathrooms,
      propertyType,
      squareFeet,
      street: `${streetNumber} ${street}`,
      city: city.name,
      province: "BC",
      postalCode: postalCode(city.fsa, rng),
      lat,
      lng,
      images: [cover, ...gallery],
      availableFrom,
      createdAt: new Date("2026-01-01T00:00:00.000Z").toISOString()
    });
  }

  return properties;
}

export const SEED_PROPERTIES: SeedProperty[] = generateProperties();
