"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Map,
  Marker,
  Popup,
  type MapRef,
  type ViewStateChangeEvent
} from "react-map-gl/maplibre";
import Supercluster from "supercluster";
import { bathroomLabel, bedroomLabel, formatPriceShort, formatRent } from "@/lib/format";
import { METRO_VANCOUVER_BBOX, type FocusRequest } from "@/lib/map";
import type { BoundingBox, Property } from "@/lib/types";

/**
 * Free, keyless vector basemap (OpenFreeMap's Liberty style): light OSM
 * colouring — parks, water, road hierarchy — gives renters neighbourhood
 * context, while the white price pills stay the strongest layer on top.
 */
const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

/** Collapse markers within ~56px of each other until zoom 14. */
const CLUSTER_RADIUS = 56;
const CLUSTER_MAX_ZOOM = 14;

/**
 * All listings live in Metro Vancouver, so the map is fenced to the region.
 * This is also the fix for the "zoom all the way out and it glitches" bug:
 * without a floor the map renders repeated world copies and scatters markers.
 * minZoom keeps the whole metro area in view at most; maxBounds stops panning
 * off into empty ocean/continent.
 */
const MIN_ZOOM = 9;
const MAX_BOUNDS: [[number, number], [number, number]] = [
  [-124.6, 48.4], // south-west
  [-121.4, 50.0] // north-east
];

type ClusterPointProps = { propertyId: string; rent: number };

type MapPanelProps = {
  properties: Property[];
  activeId?: string | null;
  hoveredId?: string | null;
  onSelect?: (id: string | null) => void;
  /** Fired continuously as the viewport moves (throttled by the parent). */
  onViewportChange?: (bbox: BoundingBox) => void;
  /** Shows the "Updating…" chip — the parent only sets this for slow fetches. */
  isUpdating?: boolean;
  /** Bounds for the first render (e.g. restored from the URL). */
  initialBounds?: BoundingBox;
  /** A request to re-frame the map on a box (id bumps to re-trigger a repeat). */
  focusRequest?: FocusRequest | null;
};

type BoundsLike = {
  getWest(): number;
  getSouth(): number;
  getEast(): number;
  getNorth(): number;
};

function toBbox(bounds: BoundsLike): BoundingBox {
  return {
    minLng: bounds.getWest(),
    minLat: bounds.getSouth(),
    maxLng: bounds.getEast(),
    maxLat: bounds.getNorth()
  };
}

/**
 * The map: clustered price-pill markers over a light vector basemap.
 *
 *   - Every listing renders as a price pill at its lat/lng; nearby pills
 *     collapse into count bubbles at low zoom (supercluster).
 *   - Clicking a pill selects the listing (two-way sync with the list);
 *     clicking a cluster zooms into it; clicking the basemap deselects.
 *   - The selected listing gets a mini-card popup, auto-positioned to stay
 *     within the map bounds.
 *   - Viewport bounds are reported upward live as the map moves, driving the
 *     server-side geospatial query.
 */
export function MapPanel({
  properties,
  activeId,
  hoveredId,
  onSelect,
  onViewportChange,
  isUpdating,
  initialBounds = METRO_VANCOUVER_BBOX,
  focusRequest
}: MapPanelProps) {
  const mapRef = useRef<MapRef>(null);
  const [zoom, setZoom] = useState(10);

  const index = useMemo(() => {
    const supercluster = new Supercluster<ClusterPointProps>({
      radius: CLUSTER_RADIUS,
      maxZoom: CLUSTER_MAX_ZOOM
    });
    supercluster.load(
      properties.map((property) => ({
        type: "Feature" as const,
        properties: { propertyId: property.id, rent: property.rent },
        geometry: {
          type: "Point" as const,
          coordinates: [property.lng, property.lat]
        }
      }))
    );
    return supercluster;
  }, [properties]);

  // Fifty points make cluster math trivial, so cluster across the whole world
  // and re-derive only when the integer zoom level changes.
  const clusters = useMemo(() => index.getClusters([-180, -85, 180, 85], zoom), [index, zoom]);

  const selected = activeId ? (properties.find((p) => p.id === activeId) ?? null) : null;

  // The active selection and the last observed zoom, in refs so the viewport
  // handler can dismiss the popup the instant the user zooms out.
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;
  const lastZoomRef = useRef(0);

  // Live viewport reporting: fires on every move frame and on settle. The
  // parent throttles, so this stays cheap.
  const handleViewportEvent = useCallback(
    (event: ViewStateChangeEvent) => {
      const nextZoom = event.viewState.zoom;
      // Zooming out is the cue to drop the selection: the popup looks wrong
      // hovering over a cluster, and re-selecting is a single click away.
      if (activeIdRef.current && nextZoom < lastZoomRef.current - 0.05) {
        onSelect?.(null);
      }
      lastZoomRef.current = nextZoom;
      setZoom(Math.floor(nextZoom));
      onViewportChange?.(toBbox(event.target.getBounds()));
    },
    [onViewportChange, onSelect]
  );

  const handleLoad = useCallback(
    (event: { target: { getBounds(): BoundsLike; getZoom(): number } }) => {
      const nextZoom = event.target.getZoom();
      lastZoomRef.current = nextZoom;
      setZoom(Math.floor(nextZoom));
      onViewportChange?.(toBbox(event.target.getBounds()));
    },
    [onViewportChange]
  );

  // Selection auto-pan: when a property is selected, nudge the map so the
  // marker (and its popup) sits fully on screen. No zoom — if the property is
  // clustered the popup simply shows there, and zooming out dismisses it.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selected) {
      return;
    }
    const point = map.project([selected.lng, selected.lat]);
    const container = map.getContainer();
    const EDGE_MARGIN = 48;
    // Reserve room above the marker for the whole popup — measured from the DOM
    // so it tracks the card design (the redesign made it taller) — plus its 18px
    // offset and a little breathing room. Falls back to a safe estimate if the
    // popup has not mounted on this commit yet.
    const popupEl = container.querySelector<HTMLElement>(".maplibregl-popup-content");
    const popupHeight = popupEl ? popupEl.getBoundingClientRect().height : 300;
    const POPUP_HEADROOM = popupHeight + 18 + 24;
    let dx = 0;
    let dy = 0;
    if (point.x < EDGE_MARGIN) {
      dx = point.x - EDGE_MARGIN;
    } else if (point.x > container.clientWidth - EDGE_MARGIN) {
      dx = point.x - (container.clientWidth - EDGE_MARGIN);
    }
    if (point.y < POPUP_HEADROOM) {
      dy = point.y - POPUP_HEADROOM;
    } else if (point.y > container.clientHeight - EDGE_MARGIN) {
      dy = point.y - (container.clientHeight - EDGE_MARGIN);
    }
    if (dx !== 0 || dy !== 0) {
      map.panBy([dx, dy], { duration: 350 });
    }
  }, [selected]);

  // The popup always sits ABOVE its marker (fixed anchor — no side-flipping
  // jitter). To stay inside the map near the edges, the card slides
  // horizontally just enough to fit while the tip keeps pointing at the
  // marker. Imperative on purpose: it tracks every move frame without
  // re-rendering React.
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !selected) {
      return;
    }

    const clampPopup = () => {
      const container = map.getContainer();
      const content = container.querySelector<HTMLElement>(".maplibregl-popup-content");
      if (!content) {
        return;
      }
      content.style.transform = "";
      const rect = content.getBoundingClientRect();
      const bounds = container.getBoundingClientRect();
      const margin = 8;
      let dx = 0;
      if (rect.left < bounds.left + margin) {
        dx = bounds.left + margin - rect.left;
      } else if (rect.right > bounds.right - margin) {
        dx = bounds.right - margin - rect.right;
      }
      if (dx !== 0) {
        content.style.transform = `translateX(${dx}px)`;
      }
    };

    clampPopup();
    const raf = requestAnimationFrame(clampPopup); // after the popup mounts
    map.on("move", clampPopup);
    return () => {
      cancelAnimationFrame(raf);
      map.off("move", clampPopup);
    };
  }, [selected]);

  // Search re-frame: fit the map to the bounding box of the matching listings.
  // The parent bumps `id` on every submit, so repeating the same search still
  // re-triggers; the ensuing move drives the normal viewport refetch. maxZoom
  // keeps a single-match box from zooming in to street level.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusRequest) {
      return;
    }
    const { bbox } = focusRequest;
    map.fitBounds(
      [
        [bbox.minLng, bbox.minLat],
        [bbox.maxLng, bbox.maxLat]
      ],
      {
        padding: focusRequest.padding ?? 64,
        maxZoom: focusRequest.maxZoom ?? 14,
        duration: 700
      }
    );
  }, [focusRequest]);

  const handleClusterClick = (clusterId: number, lng: number, lat: number) => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    // End any open popup's lifecycle first. Otherwise the selected-marker
    // auto-pan keeps firing on each viewport refetch during the ease and yanks
    // the map back to the old popup — which beats a short ease to a nearby
    // cluster, so the navigation appears to fail. Clicking a cluster is a fresh
    // intent: drop the selection, then fly in.
    onSelect?.(null);
    const targetZoom = Math.min(index.getClusterExpansionZoom(clusterId), 18);
    map.easeTo({ center: [lng, lat], zoom: targetZoom, duration: 500 });
  };

  return (
    <div className="relative h-full min-h-[360px] w-full overflow-hidden rounded-lg border border-slate-200">
      <Map
        ref={mapRef}
        initialViewState={{
          bounds: [
            initialBounds.minLng,
            initialBounds.minLat,
            initialBounds.maxLng,
            initialBounds.maxLat
          ],
          fitBoundsOptions: { padding: 32 }
        }}
        mapStyle={MAP_STYLE}
        style={{ width: "100%", height: "100%" }}
        minZoom={MIN_ZOOM}
        maxBounds={MAX_BOUNDS}
        renderWorldCopies={false}
        onLoad={handleLoad}
        onMove={handleViewportEvent}
        onMoveEnd={handleViewportEvent}
        onClick={() => onSelect?.(null)}
      >
        {clusters.map((feature) => {
          const [lng, lat] = feature.geometry.coordinates as [number, number];

          if ("cluster" in feature.properties && feature.properties.cluster) {
            const { cluster_id: clusterId, point_count: count } = feature.properties;
            const size = 38 + Math.min(count, 20) * 1.6;
            return (
              <Marker key={`cluster-${clusterId}`} longitude={lng} latitude={lat}>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleClusterClick(clusterId, lng, lat);
                  }}
                  className="flex items-center justify-center rounded-full bg-gray-900 text-base font-semibold text-white shadow-md ring-4 ring-gray-900/15 transition-transform hover:scale-105"
                  style={{ width: size, height: size }}
                  aria-label={`Zoom into ${count} listings`}
                >
                  {count}
                </button>
              </Marker>
            );
          }

          const { propertyId, rent } = feature.properties as ClusterPointProps;
          const isActive = propertyId === activeId;
          const isHovered = propertyId === hoveredId;
          return (
            <Marker
              key={propertyId}
              longitude={lng}
              latitude={lat}
              style={{ zIndex: isActive ? 2 : isHovered ? 1 : 0 }}
            >
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onSelect?.(propertyId);
                }}
                className={`rounded-full border px-3 py-1.5 text-sm font-semibold shadow-sm transition-transform ${
                  isActive
                    ? "scale-110 border-blue-600 bg-blue-600 text-white"
                    : isHovered
                      ? "scale-110 border-blue-500 bg-white text-blue-700"
                      : "border-slate-300 bg-white text-slate-900 hover:scale-110 hover:border-blue-400"
                }`}
                aria-label={`Select listing at ${formatPriceShort(rent)} per month`}
                aria-pressed={isActive}
              >
                {formatPriceShort(rent)}
              </button>
            </Marker>
          );
        })}

        {selected ? (
          <Popup
            longitude={selected.lng}
            latitude={selected.lat}
            anchor="bottom"
            offset={18}
            closeButton={false}
            closeOnClick={false}
            maxWidth="320px"
          >
            <div className="relative w-72">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selected.images[0]}
                alt={selected.title}
                className="h-40 w-full object-cover"
                loading="lazy"
              />
              <button
                type="button"
                onClick={() => onSelect?.(null)}
                aria-label="Close"
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-base text-gray-700 shadow hover:bg-white"
              >
                ×
              </button>
              <div className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {selected.propertyType}
                  </p>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Move-in by: *date*
                  </span>
                </div>
                <p className="mt-1 text-lg font-bold text-slate-900">
                  {formatRent(selected.rent)}
                </p>
                <p className="mt-1 truncate text-sm text-slate-500">
                  {selected.city}, {selected.province}
                </p>
                <div className="my-2 border-t border-slate-200" />
                <p className="text-sm text-slate-600">
                  {bedroomLabel(selected.bedrooms)}, {bathroomLabel(selected.bathrooms)},{" "}
                  {selected.squareFeet} sqft
                </p>
              </div>
            </div>
          </Popup>
        ) : null}
      </Map>

      {isUpdating ? (
        <div className="pointer-events-none absolute left-1/2 top-3 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/95 px-3.5 py-2 text-sm font-medium text-gray-700 shadow-md">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700" />
          Updating…
        </div>
      ) : null}
    </div>
  );
}
