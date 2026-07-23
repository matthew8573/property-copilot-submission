"use client";

import { useState } from "react";
import type { Property } from "@/lib/types";
import { bathroomLabel, bedroomLabel, formatMoveInDate, formatRent } from "@/lib/format";

type PropertyCardProps = {
  property: Property;
  active?: boolean;
  onSelect?: (id: string) => void;
  onHover?: (id: string | null) => void;
};

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d={direction === "left" ? "M12.5 4.5L7 10l5.5 5.5" : "M7.5 4.5L13 10l-5.5 5.5"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Reusable listing tile, shared by the browse list (and any future detail
 * surfaces). Selectable via mouse or keyboard; hover state is reported upward
 * so the map can highlight the matching marker.
 */
export function PropertyCard({ property, active, onSelect, onHover }: PropertyCardProps) {
  const [imageIndex, setImageIndex] = useState(0);
  const images = property.images;
  const current = images[imageIndex % images.length];

  // Arrows live inside the clickable card, so stop both the click and the
  // keydown from bubbling up and selecting/zooming the card.
  const step = (event: React.MouseEvent, delta: number) => {
    event.stopPropagation();
    setImageIndex((i) => (i + delta + images.length) % images.length);
  };

  return (
    <article
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      className={`group overflow-hidden rounded-lg border bg-white shadow-sm transition duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
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
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current}
          alt={`${property.title} — photo ${imageIndex + 1} of ${images.length}`}
          className="h-48 w-full object-cover"
          loading="lazy"
        />
        {images.length > 1 ? (
          <>
            <button
              type="button"
              aria-label="Previous photo"
              onClick={(event) => step(event, -1)}
              onKeyDown={(event) => event.stopPropagation()}
              className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow transition hover:bg-white sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
            >
              <ChevronIcon direction="left" />
            </button>
            <button
              type="button"
              aria-label="Next photo"
              onClick={(event) => step(event, 1)}
              onKeyDown={(event) => event.stopPropagation()}
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow transition hover:bg-white sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
            >
              <ChevronIcon direction="right" />
            </button>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5"
            >
              {images.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 w-1.5 rounded-full shadow-sm ${
                    i === imageIndex % images.length ? "bg-white" : "bg-white/50"
                  }`}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {property.propertyType}
          </p>
          <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-emerald-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Move-in: {formatMoveInDate(property.availableFrom)}
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
