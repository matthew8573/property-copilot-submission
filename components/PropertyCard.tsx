import type { Property } from "@/lib/types";
import { bathroomLabel, bedroomLabel, formatRent } from "@/lib/format";

type PropertyCardProps = {
  property: Property;
  active?: boolean;
  onSelect?: (id: string) => void;
  onHover?: (id: string | null) => void;
};

/**
 * Reusable listing tile, shared by the browse list (and any future detail
 * surfaces). Selectable via mouse or keyboard; hover state is reported upward
 * so the map can highlight the matching marker.
 */
export function PropertyCard({ property, active, onSelect, onHover }: PropertyCardProps) {
  return (
    <article
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      className={`overflow-hidden rounded-lg border bg-white shadow-sm transition duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
        active ? "border-blue-600 ring-1 ring-blue-600" : "border-slate-200"
      } ${onSelect ? "cursor-pointer hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg" : ""}`}
      onClick={onSelect ? () => onSelect(property.id) : undefined}
      onKeyDown={
        onSelect
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(property.id);
              }
            }
          : undefined
      }
      onMouseEnter={onHover ? () => onHover(property.id) : undefined}
      onMouseLeave={onHover ? () => onHover(null) : undefined}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={property.images[0]}
        alt={property.title}
        className="h-48 w-full object-cover"
        loading="lazy"
      />
      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {property.propertyType}
          </p>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Available
          </span>
        </div>
        <p className="mt-1 text-xl font-bold text-slate-900">{formatRent(property.rent)}</p>
        <p className="mt-1 truncate text-sm text-slate-500">
          {property.city}, {property.province}
        </p>
        <div className="my-3 border-t border-slate-200" />
        <p className="text-sm text-slate-600">
          {bedroomLabel(property.bedrooms)}, {bathroomLabel(property.bathrooms)},{" "}
          {property.squareFeet} sqft
        </p>
      </div>
    </article>
  );
}
