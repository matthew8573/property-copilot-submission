"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchProperties, fetchStats, type CityStat } from "@/lib/api";
import { countActiveFilters, parseBrowseParams, serializeBrowseParams } from "@/lib/filters";
import type { PlaceSuggestion } from "@/lib/geocode";
import { METRO_VANCOUVER_BBOX, movedSignificantly, type FocusRequest } from "@/lib/map";
import type { BoundingBox, Property, PropertyFilter } from "@/lib/types";
import { BrowseSidebar } from "@/components/BrowseSidebar";
import { FilterBar } from "@/components/FilterBar";
import { FirstVisitHint } from "@/components/FirstVisitHint";
import { PropertyCard } from "@/components/PropertyCard";

// MapLibre touches `window`, so the map only ever renders on the client.
const MapPanel = dynamic(() => import("@/components/MapPanel").then((m) => m.MapPanel), {
  ssr: false,
  loading: () => (
    <div className="h-full min-h-[360px] w-full animate-pulse rounded-lg border border-slate-200 bg-slate-100" />
  )
});

type LoadState = "loading" | "error" | "ready";

/**
 * Viewport refetches stream live while the map moves — the adaptive backend
 * answers in ~75ms, so panning affords one request per throttle window
 * (leading + trailing edge). Sub-1% nudges are skipped, and a request id
 * discards stale responses. Filter edits fetch immediately: they are discrete
 * decisions (the price slider commits on thumb release).
 */
const VIEWPORT_THROTTLE_MS = 250;

/**
 * The "Updating…" chip only appears when a refetch has been in flight this
 * long. Live-pan refetches finish in ~100ms and stay silent; the chip exists
 * for cold starts and slow networks, not as a strobe light while browsing.
 */
const SLOW_REFRESH_MS = 400;

export default function BrowsePage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [slowRefresh, setSlowRefresh] = useState(false);
  const [filter, setFilter] = useState<PropertyFilter>({});
  const [bbox, setBbox] = useState<BoundingBox>(METRO_VANCOUVER_BBOX);
  // Mobile only: which pane fills the screen (toggled by the floating button).
  // Desktop (lg+) ignores this and always shows the map and list side by side.
  const [mobileView, setMobileView] = useState<"map" | "list">("map");
  // The whole market, fetched once (below). Powers the price histogram and the
  // search box's instant local fallback suggestions.
  // A pending "fit the map to this box" request; id bumps to re-trigger a repeat.
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);
  // Whole-market rent histogram (server-computed, unfiltered so it never
  // collapses) + each city's extent for the search box's local fallback.
  const [rentHistogram, setRentHistogram] = useState<number[]>([]);
  const [cityStats, setCityStats] = useState<CityStat[]>([]);
  // URL params apply after hydration (window is client-only); fetching waits.
  const [hydrated, setHydrated] = useState(false);

  const initialBounds = useRef<BoundingBox>(METRO_VANCOUVER_BBOX);
  const lastFetchedBbox = useRef<BoundingBox | null>(null);
  const requestId = useRef(0);
  const cardRefs = useRef(new globalThis.Map<string, HTMLDivElement>());

  // 1. Restore only the viewport from the URL. Filters intentionally reset on
  //    every page open, so re-opening always starts with a clean, unfiltered
  //    search rather than restoring whatever was last applied.
  useEffect(() => {
    const parsed = parseBrowseParams(window.location.search);
    if (parsed.bbox) {
      initialBounds.current = parsed.bbox;
      setBbox(parsed.bbox);
    }
    setHydrated(true);
  }, []);

  // One-time whole-market stats fetch — a server-computed summary (histogram +
  // city extents), NOT every row: powers the price histogram and the search
  // box's local city fallback.
  useEffect(() => {
    let cancelled = false;
    fetchStats()
      .then((stats) => {
        if (!cancelled) {
          setRentHistogram(stats.histogram);
          setCityStats(stats.cities);
        }
      })
      .catch(() => {
        /* stats are a non-critical enhancement; ignore failures */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 2. Server fetch whenever the filters or the viewport change. Fires
  //    immediately — viewport changes were already throttled at the source.
  //    A request id guards against out-of-order responses.
  useEffect(() => {
    if (!hydrated) {
      return;
    }
    const id = ++requestId.current;
    const isRefetch = lastFetchedBbox.current !== null;

    async function load() {
      if (isRefetch) {
        setRefreshing(true);
      } else {
        setState("loading");
      }
      try {
        const data = await fetchProperties(filter, bbox);
        if (requestId.current !== id) {
          return; // superseded by a newer request
        }
        lastFetchedBbox.current = bbox;
        setProperties(data);
        setState("ready");
        // Keep the selection only while it is still on screen.
        setActiveId((current) =>
          current && !data.some((p) => p.id === current) ? null : current
        );
      } catch (err) {
        if (requestId.current === id) {
          setError(err instanceof Error ? err.message : "Failed to load listings");
          setState("error");
        }
      } finally {
        if (requestId.current === id) {
          setRefreshing(false);
        }
      }
    }

    void load();
  }, [hydrated, filter, bbox]);

  // 3. Reflect only the viewport into the URL (filters deliberately do not
  //    survive a reload). replaceState keeps history clean and avoids Next
  //    router re-renders on every map move.
  useEffect(() => {
    if (!hydrated) {
      return;
    }
    const query = serializeBrowseParams({}, bbox);
    window.history.replaceState(null, "", query || window.location.pathname);
  }, [hydrated, bbox]);

  // Only surface the refresh indicator when a fetch is actually slow.
  useEffect(() => {
    if (!refreshing) {
      setSlowRefresh(false);
      return;
    }
    const timer = setTimeout(() => setSlowRefresh(true), SLOW_REFRESH_MS);
    return () => clearTimeout(timer);
  }, [refreshing]);

  // Live viewport-driven refetch: leading+trailing throttle, so the list
  // tracks the map while dragging and always lands on the final position.
  const viewportTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastViewportAt = useRef(0);
  const handleViewportChange = useCallback((next: BoundingBox) => {
    const apply = () => {
      lastViewportAt.current = Date.now();
      const prev = lastFetchedBbox.current;
      if (!prev || movedSignificantly(prev, next)) {
        setBbox(next);
      }
    };

    if (viewportTimer.current) {
      clearTimeout(viewportTimer.current);
      viewportTimer.current = null;
    }
    const elapsed = Date.now() - lastViewportAt.current;
    if (elapsed >= VIEWPORT_THROTTLE_MS) {
      apply();
    } else {
      viewportTimer.current = setTimeout(apply, VIEWPORT_THROTTLE_MS - elapsed);
    }
  }, []);

  useEffect(
    () => () => {
      if (viewportTimer.current) {
        clearTimeout(viewportTimer.current);
      }
    },
    []
  );

  // Map -> list sync: selecting a marker scrolls its card into view (the list
  // pane is its own scroll container, so the page frame never moves).
  useEffect(() => {
    if (activeId) {
      cardRefs.current.get(activeId)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [activeId]);

  const retry = () => {
    setState("loading");
    setBbox((current) => ({ ...current }));
  };

  const hasActiveFilters = countActiveFilters(filter) > 0;

  // Search = navigate. Picking a place re-frames the map to it (fit its extent
  // for a city/neighbourhood, else centre on the point); the viewport refetch
  // then loads whatever listings are there.
  const handleSelectPlace = useCallback((place: PlaceSuggestion) => {
    const box = place.bbox ?? {
      minLat: place.lat,
      minLng: place.lng,
      maxLat: place.lat,
      maxLng: place.lng
    };
    setFocusRequest({ bbox: box, id: Date.now(), maxZoom: place.bbox ? 15 : 14 });
  }, []);

  // Instant local suggestions — the cities present in the data — shown while
  // the geocoder loads and used as a fallback if it is unreachable, so the
  // search box always does something. Coordinates are derived from the data.
  const localPlaceSuggest = useCallback(
    (query: string): PlaceSuggestion[] => {
      const q = query.trim().toLowerCase();
      if (!q) {
        return [];
      }
      return cityStats
        .filter((c) => c.city.toLowerCase().includes(q))
        .map((c) => ({
          id: `city-${c.city}`,
          label: c.city,
          detail: "British Columbia",
          lat: (c.bbox.minLat + c.bbox.maxLat) / 2,
          lng: (c.bbox.minLng + c.bbox.maxLng) / 2,
          bbox: c.bbox
        }));
    },
    [cityStats]
  );

  // Selecting a card selects the listing AND zooms the map to it (a zero-area
  // box + maxZoom), with generous top padding so the popup clears the top edge.
  // The zoom is a one-shot (focusRequest id), so viewport refetches never
  // re-zoom — the old "can't zoom back out" trap. Markers keep the plain
  // select-and-pan (no zoom); this is only for list-card clicks.
  const handleCardSelect = useCallback(
    (id: string) => {
      setActiveId(id);
      // On mobile, jump to the map so the tapped listing is in view.
      setMobileView("map");
      const p = properties.find((property) => property.id === id);
      if (p) {
        setFocusRequest({
          bbox: { minLat: p.lat, minLng: p.lng, maxLat: p.lat, maxLng: p.lng },
          id: Date.now(),
          maxZoom: 14,
          padding: { top: 350, right: 56, bottom: 56, left: 56 }
        });
      }
    },
    [properties]
  );

  return (
    // App frame: everything above the grid is fixed; the list pane scrolls
    // internally and the map fills the rest. 57px = the h-14 nav + its border.
    // Full-bleed: no side padding, so the panes reach both window edges.
    <section className="flex h-[calc(100dvh-57px)]">
      <FirstVisitHint />

      {/* Desktop: vertical rail — app nav + search + filters + account. */}
      <BrowseSidebar
        filter={filter}
        onChange={setFilter}
        onSelectPlace={handleSelectPlace}
        placeFallback={localPlaceSuggest}
        rentHistogram={rentHistogram}
      />

      {/* Content column: mobile filter bar (rail replaces it on lg+) + panes. */}
      <div className="flex min-w-0 flex-1 flex-col pb-2">
        <div className="shrink-0 p-2 lg:hidden">
          <FilterBar
            filter={filter}
            onChange={setFilter}
            onSelectPlace={handleSelectPlace}
            placeFallback={localPlaceSuggest}
            rentHistogram={rentHistogram}
          />
        </div>

      {state === "loading" ? (
        <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] gap-0 lg:grid-cols-[1.5fr_1fr]">
          <div className="h-full animate-pulse rounded-lg border border-slate-200 bg-slate-100" />
          <div className="hidden h-full animate-pulse rounded-lg border border-slate-200 bg-slate-100 lg:block" />
        </div>
      ) : null}

      {state === "error" ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
            <p className="text-base font-medium text-red-800">Could not load listings</p>
            <p className="mt-1 text-base text-red-700">{error}</p>
            <button
              type="button"
              onClick={retry}
              className="mt-4 rounded-md border border-red-300 bg-white px-4 py-2 text-base font-medium text-red-800 transition hover:bg-red-100"
            >
              Try again
            </button>
          </div>
        </div>
      ) : null}

      {state === "ready" ? (
        <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] gap-0 lg:grid-cols-[1.5fr_1fr]">
          {/* Map pane (left on desktop). On mobile it fills the screen or hides
              behind the list, driven by the toggle button. */}
          <div className={mobileView === "map" ? "h-full min-h-0" : "hidden h-full min-h-0 lg:block"}>
            <MapPanel
              properties={properties}
              activeId={activeId}
              hoveredId={hoveredId}
              onSelect={setActiveId}
              onViewportChange={handleViewportChange}
              isUpdating={slowRefresh}
              initialBounds={initialBounds.current}
              focusRequest={focusRequest}
            />
          </div>

          {/* List pane (right on desktop): title, count, and cards all live in
              one scroll container, so the header scrolls away with the cards. */}
          <div
            className={`min-h-0 flex-col lg:border-l lg:border-slate-300 lg:shadow-[-9px_0_18px_-5px_rgba(0,0,0,0.22)] ${
              mobileView === "list" ? "flex" : "hidden lg:flex"
            }`}
          >
            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 sm:px-4">
              <div className="pb-3 pt-3">
                <h2 className="text-2xl font-black tracking-tight text-slate-900">Rental listings</h2>
                <h3 className="text-sm text-slate-500">
                  {properties.length} listings that fit your criteria
                </h3>
              </div>
            {properties.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="rounded-lg border border-slate-200 bg-white p-8">
                  <p className="text-base font-medium text-slate-900">No listings match</p>
                  <p className="mt-1 text-base text-slate-600">
                    {hasActiveFilters
                      ? "Try loosening a filter, or pan the map."
                      : "Try panning or zooming out."}
                  </p>
                  
                  {hasActiveFilters ? (
                    <button
                      type="button"
                      onClick={() => setFilter({})}
                      className="mt-4 rounded-md border border-slate-300 bg-white px-4 py-2 text-base font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
                    >
                      Clear all filters
                    </button>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 sm:gap-[10px]">
                {properties.map((property) => (
                  <div
                    key={property.id}
                    ref={(el) => {
                      if (el) {
                        cardRefs.current.set(property.id, el);
                      } else {
                        cardRefs.current.delete(property.id);
                      }
                    }}
                  >
                    <PropertyCard
                      property={property}
                      active={property.id === activeId}
                      onSelect={handleCardSelect}
                      onHover={setHoveredId}
                    />
                  </div>
                ))}
              </div>
            )}
            </div>
          </div>
        </div>
      ) : null}

      </div>

      {/* Mobile-only list/map toggle; desktop shows both panes at once. */}
      {state === "ready" ? (
        <button
          type="button"
          onClick={() => setMobileView((view) => (view === "map" ? "list" : "map"))}
          className="fixed bottom-5 left-1/2 z-30 -translate-x-1/2 rounded-full bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-lg transition hover:bg-blue-700 lg:hidden"
        >
          {mobileView === "map" ? `List (${properties.length})` : "Map"}
        </button>
      ) : null}
    </section>
  );
}
