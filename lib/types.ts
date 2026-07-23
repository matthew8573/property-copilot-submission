export const PROPERTY_TYPES = ["apartment", "condo", "house", "townhouse"] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];

export type City = "Vancouver" | "Richmond" | "Burnaby" | "Surrey";

/** Listing shape returned by the AWS API. Mirrors the backend Property type. */
export type Property = {
  id: string;
  title: string;
  description: string;
  rent: number;
  bedrooms: number;
  bathrooms: number;
  propertyType: PropertyType;
  squareFeet: number;
  street: string;
  city: City;
  province: string;
  postalCode: string;
  lat: number;
  lng: number;
  geohash: string;
  geohashPrefix: string;
  images: string[];
  availableFrom: string;
  createdAt: string;
};

/**
 * Filters a renter can apply. Mirrors the backend PropertyFilter: `bedrooms`
 * and `bathrooms` are minimums; `propertyTypes` matches any of the listed
 * types.
 */
export type PropertyFilter = {
  minRent?: number;
  maxRent?: number;
  bedrooms?: number;
  bathrooms?: number;
  propertyTypes?: PropertyType[];
};

/** Map viewport bounds. Mirrors backend/src/geo.ts BoundingBox. */
export type BoundingBox = {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
};
