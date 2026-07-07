import { ValidationError } from "./errors";
import { PROPERTY_TYPES, type Property, type PropertyFilter, type PropertyType } from "./types";

/**
 * Apply renter filters to a list of properties. Pure and side-effect free so it
 * is easy to unit test and reuse on either side of the wire.
 *
 * Filters compose: every provided constraint must hold for an item to pass.
 * Dimensions: rent range, minimum bedrooms, minimum bathrooms, and an "any of"
 * set of property types.
 */
export function filterProperties(properties: Property[], filter: PropertyFilter): Property[] {
  return properties.filter((property) => {
    if (filter.minRent !== undefined && property.rent < filter.minRent) {
      return false;
    }
    if (filter.maxRent !== undefined && property.rent > filter.maxRent) {
      return false;
    }
    if (filter.bedrooms !== undefined && property.bedrooms < filter.bedrooms) {
      return false;
    }
    if (filter.bathrooms !== undefined && property.bathrooms < filter.bathrooms) {
      return false;
    }
    if (
      filter.propertyTypes !== undefined &&
      filter.propertyTypes.length > 0 &&
      !filter.propertyTypes.includes(property.propertyType)
    ) {
      return false;
    }
    return true;
  });
}

function isPropertyType(value: string): value is PropertyType {
  return (PROPERTY_TYPES as readonly string[]).includes(value);
}

/** Parse a non-negative finite number, or throw a ValidationError naming the field. */
function parseNonNegative(name: string, raw: string): number {
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    throw new ValidationError(`${name} must be a non-negative number`);
  }
  return value;
}

/** Like parseNonNegative, but additionally requires an integer. */
function parseNonNegativeInt(name: string, raw: string): number {
  const value = parseNonNegative(name, raw);
  if (!Number.isInteger(value)) {
    throw new ValidationError(`${name} must be an integer`);
  }
  return value;
}

/**
 * Parse and validate raw query-string values into a PropertyFilter.
 *
 * Absent or empty parameters leave that dimension unconstrained. Present but
 * malformed values throw a ValidationError (surfaced as a 400) instead of
 * being silently dropped, so a bad request never masquerades as "no filter".
 * `propertyType` accepts a comma-separated list and matches any of them.
 */
export function parseFilter(query: Record<string, string | undefined>): PropertyFilter {
  const filter: PropertyFilter = {};

  if (query.minRent !== undefined && query.minRent !== "") {
    filter.minRent = parseNonNegative("minRent", query.minRent);
  }
  if (query.maxRent !== undefined && query.maxRent !== "") {
    filter.maxRent = parseNonNegative("maxRent", query.maxRent);
  }
  if (
    filter.minRent !== undefined &&
    filter.maxRent !== undefined &&
    filter.minRent > filter.maxRent
  ) {
    throw new ValidationError("minRent must not exceed maxRent");
  }

  if (query.bedrooms !== undefined && query.bedrooms !== "") {
    filter.bedrooms = parseNonNegativeInt("bedrooms", query.bedrooms);
  }
  if (query.bathrooms !== undefined && query.bathrooms !== "") {
    filter.bathrooms = parseNonNegativeInt("bathrooms", query.bathrooms);
  }

  if (query.propertyType !== undefined && query.propertyType !== "") {
    const types: PropertyType[] = [];
    for (const token of query.propertyType.split(",")) {
      const value = token.trim();
      if (value === "") {
        continue;
      }
      if (!isPropertyType(value)) {
        throw new ValidationError(`unknown propertyType "${value}"`);
      }
      if (!types.includes(value)) {
        types.push(value);
      }
    }
    if (types.length > 0) {
      filter.propertyTypes = types;
    }
  }

  return filter;
}
