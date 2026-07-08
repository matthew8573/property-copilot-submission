# REPORT

## Design decisions

1. **Map provider — MapLibre GL JS + OpenFreeMap vector tiles** (via `react-map-gl`).
   GPU-rendered vector tiles pan and zoom at 60fps and require no API key, no billing
   account, and no secret in CI or Vercel — killing the deployment failure mode that
   matters most for a live-URL requirement. Google/Mapbox add key management and billing
   risk for no functional gain at this scale, and Leaflet's raster tiles + DOM-marker
   plugins look dated and hit a performance ceiling sooner.

2. **Performance at density — clustering *and* viewport-scoped data, tuned with
   measurements.** `supercluster` collapses nearby markers into count bubbles below
   zoom 14 (the four cities read as four bubbles at metro zoom, splitting as you dive),
   and the client only ever holds what the server returned for the current viewport.
   Viewport refetches stream live while the map moves — throttled to one request per
   250ms (leading + trailing edge), skipped when the move is under 1% of a span, so a
   ~1.2s drag costs ~5–7 requests and the list tracks the map in real time (only
   affordable because the adaptive geo query answers in ~75ms); filter clicks fetch
   immediately (the price slider commits on thumb release); a request id guards stale
   responses. Measured end to end in a driven browser: a filter click updates the list
   in **~120ms** (down from ~2s before profiling — see decision 3); GETs send no custom
   headers so the browser skips CORS preflights, and API Gateway caches preflights for
   a day. Pans stay smooth with all 50 markers visible; clusters re-derive only when
   the integer zoom changes.

3. **Geospatial querying — geohash-prefix fan-out on the `geo-index` GSI while the
   viewport is selective, measured crossover to a bounded scan when it isn't.** The
   requested bbox is clamped to a Metro Vancouver service area, `boundingBoxPrefixes`
   converts it to precision-5 geohash cells, each cell becomes one parallel `Query` on
   the GSI (partitions are disjoint, so results need no dedupe), and a final refine
   drops items whose exact lat/lng falls outside the box, since cells overhang its
   edges. Profiling the deployed stack exposed the trade-off: a metro-wide viewport
   covers ~130 mostly-empty partitions and cost **~2.3s** via fan-out versus **~0.1s**
   via one scan of this table, while a downtown viewport (~4 partitions) answers in
   **~90ms** via the GSI — so above 24 covering partitions the server uses the bounded
   scan, and the GSI answers every selective query. Malformed boxes get a 400; boxes
   outside the service area return empty without touching DynamoDB; as the dataset
   grows the crossover shifts toward the GSI, and a coarser second precision level
   would remove the wide case entirely.

4. **Filtering model — Price range · Beds (min) · Baths (min) · Type (any-of), composed
   with AND on the server.** Both the scan path and the viewport path run the same pure
   `filterProperties`, so a single tested implementation defines composition. The server
   validates strictly (contradictory rent ranges, unknown types, non-integer counts →
   400) while URL-state parsing is deliberately lenient (a mangled link degrades to
   defaults instead of crashing). The price control is anchored by a whole-market rent
   histogram — a small aggregate computed server-side by `/properties/stats` and
   deliberately unfiltered, so it never collapses as filters narrow the results (and the
   client never downloads the full row set to draw it). Search is a *navigation*, not a
   filter: a keyless geocoder (Photon, biased and clamped to Metro Vancouver) offers
   type-ahead place suggestions; picking one re-frames the map to that place and the viewport refetch
   repopulates the list — so "Kitsilano" flies the map there and the list follows,
   keeping the map the single source of truth. The geocoder is the one external runtime
   dependency, chosen keyless to preserve decision 1's no-secret deploy; it is debounced,
   cancelable, and falls back to instant local city suggestions if unreachable, so the
   box never hard-breaks. Clicking a list card zooms the map to that listing (a one-shot
   fit, so refetches never re-zoom). The map viewport persists in the URL, but filters
   reset on reload so re-opening always starts clean; the empty state names its cause and
   offers to clear filters; Reset appears in the bar only when something is constrained.

## What I'd add with more time

- **More filter dimensions — square footage, pet-friendly, in-unit laundry, parking** —
  the filter model and bar accommodate new dimensions cheaply (square footage needs no
  schema change; the others add fields to the data model and seed). Cut to keep the bar
  scannable within the time budget.
- **Move-in / availability date** — an `availableFrom` field on each listing, surfaced on
  the card (the card's move-in badge anticipates this) and filterable by a renter's
  desired move-in date.
- **Favourites** — a heart on each card and a saved-listings tab; localStorage first,
  moving to a per-user table once accounts exist.
- **Accounts** — the app shell already sketches the destination (Dashboard, Profile, and
  sign-out are present but inert); real authentication (e.g. Cognito) would activate
  them and let favourites and saved searches follow a renter across devices.
- **Richer mobile UI** — the map⇄list toggle works, but a draggable bottom-sheet list
  over the map (the pattern Zillow and Airbnb use) would let renters see both at once
  on a phone.
- **Listing detail view** — modal or page with the five-image gallery, reusing the card's
  building blocks (`GET /properties/:id` already exists).
- **Zoom-adaptive geohash precision** — a second, coarser GSI partition key
  (precision 3–4) chosen by viewport size, so zoomed-out views cost ~4 queries
  instead of ~40.
- **Client-side response caching (SWR)** — panning A→B→A refetches A today; keyed
  caching would make back-pans instant.
- **Pagination** — `limit`/`cursor` on `/properties`; fine at 50 listings, needed
  before the dataset outgrows single-response payloads.
- **Accessibility — the list is solid; the map is the gap.** Markers and cards are
  keyboard-operable buttons with labels, but the map has no designed keyboard
  experience for panning and zooming, popovers don't trap focus, and the popup lacks
  Escape-to-dismiss; a fuller pass adds those plus a screen-reader summary of visible
  results.
- **Tighter CORS + rate limiting** — lock `Access-Control-Allow-Origin` to the deployed
  frontend origin instead of `*`.
- **DynamoDB Local integration tests in CI** — the geospatial query is tested against a
  mocked DynamoDB client today; a service container would exercise real Query semantics
  end to end.
