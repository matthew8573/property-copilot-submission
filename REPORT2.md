# REPORT (Plain-English Version)

This is a friendlier rewrite of REPORT.md. Same content, less jargon.

## Design decisions

### 1. Which map library to use

I used **MapLibre with free OpenFreeMap tiles** instead of Google Maps or Mapbox.

The biggest reason: it needs **no API key and no billing account**. That means
there's no secret key to configure in CI or Vercel, and no way for the live demo
to break because a key expired or a billing limit was hit — which is the worst
possible failure when the assignment requires a working live URL.

It's also fast: the map is drawn by the GPU, so panning and zooming stay smooth.
The other free option, Leaflet, uses older image-based tiles and slows down
sooner as you add markers, so it wasn't worth the trade.

### 2. Keeping the map fast with lots of pins

Two techniques work together here:

- **Clustering:** when you're zoomed out, nearby pins merge into one bubble with
  a count on it (e.g. the four cities show as four bubbles). Zoom in and they
  split apart. This uses a library called `supercluster`.
- **Only load what's on screen:** the browser never holds the whole dataset —
  it only asks the server for listings inside the area you're currently looking at.

As you drag the map, it keeps re-asking the server for the visible area so the
list stays in sync — but politely: at most one request every 250ms, and tiny
movements (under 1% of the screen) don't trigger a request at all. A typical
one-second drag costs about 5–7 requests. That's only affordable because the
server answers those queries in about 75 milliseconds (see decision 3).

Some details that keep it feeling instant:

- Clicking a filter fetches immediately (no waiting for the throttle).
- The price slider only fires when you let go of the handle, not while dragging.
- Each request gets an ID, so if an old slow response arrives after a newer one,
  it's thrown away instead of overwriting fresh results.
- Requests are shaped so the browser can skip an extra permission round-trip it
  normally makes before cross-origin calls (a "CORS preflight"), saving latency.

I measured the result in a real automated browser: clicking a filter updates the
list in about **120ms**. Before profiling it was about 2 seconds — decision 3
explains what fixed that.

### 3. How the server finds listings inside the visible map area

The database is DynamoDB, which can't natively answer "give me everything inside
this rectangle." The standard trick is **geohashing**: the world is divided into
labeled grid cells, and each listing is stored under the label of the cell it
sits in. To answer a map query, the server figures out which cells overlap the
visible rectangle and looks up each cell (using a secondary index on the table).
Because each cell is looked up separately and no listing is in two cells, the
lookups can run in parallel and there are no duplicates to clean up. A final
check drops listings that are in an overlapping cell but just outside the actual
rectangle.

When I profiled the deployed system, I found this approach has a weakness: it's
great when you're zoomed in, and terrible when you're zoomed out.

- Zoomed into downtown: the rectangle touches ~4 cells → answers in **~90ms**.
- Zoomed out to the whole metro area: the rectangle touches ~130 cells, most of
  them empty → **~2.3 seconds** of lookups. Meanwhile, just reading the whole
  table once (it's small) takes **~0.1 seconds**.

So the server does both: it counts how many cells the rectangle covers, and if
that's more than 24, it reads the whole table and filters, otherwise it uses the
cell lookups. That threshold is where the two approaches took equal time in my
measurements. As the dataset grows, reading the whole table gets slower, so the
cell approach wins in more cases — and a second, coarser grid level would
eliminate the zoomed-out problem entirely (listed under future work).

Guard rails: a malformed rectangle gets a clear 400 error, and a rectangle
entirely outside the Metro Vancouver service area returns an empty result
without touching the database at all.

### 4. How filtering and search work

The filters are: **price range, minimum beds, minimum baths, and property type**
(you can pick several types). A listing must match all of them to show up.

- **One implementation, used everywhere.** Both database paths from decision 3
  run their results through the same small, well-tested filter function, so
  there's exactly one place that defines what "matches the filters" means.
- **Strict server, forgiving URLs.** The server rejects nonsense (like a min
  price above the max price) with a 400. But if you open a link with mangled
  filter values in the URL, the app quietly falls back to defaults instead of
  crashing.
- **The price histogram never lies.** The little bar chart behind the price
  slider shows the rent distribution of the *whole market*, computed by the
  server (`/properties/stats`). It deliberately ignores your current filters —
  otherwise it would shrink as you filtered, which is confusing — and the
  browser never has to download every listing just to draw it.
- **Search moves the map; it doesn't filter the list.** Typing in the search box
  shows place suggestions (from Photon, a free geocoding service that needs no
  API key — keeping the "no secrets to deploy" property from decision 1).
  Picking a suggestion flies the map to that place, and the normal "load what's
  on screen" behavior fills in the list. So searching "Kitsilano" takes you
  there, and the map remains the single source of truth for what's listed.
  If the geocoding service is unreachable, the box falls back to built-in local
  city suggestions, so it never breaks outright.
- **Small touches:** clicking a card zooms the map to that listing (once — later
  data refreshes won't yank the view around). The map position is saved in the
  URL so a shared link shows the same view, but filters intentionally reset on
  reload so you always start clean. If no listings match, the empty state says
  why and offers a one-click "clear filters." The Reset button only appears when
  a filter is actually active.

## What I'd add with more time

- **More filters** — square footage, pet-friendly, in-unit laundry, parking.
  The filter system makes these cheap to add; I cut them to keep the filter bar
  easy to scan within the time budget.
- **Move-in date** — an "available from" date on each listing you could filter
  by. The card already has a badge spot waiting for it.
- **Favourites** — a heart on each card and a saved-listings tab. Stored in the
  browser at first, then per-account once sign-in exists.
- **Accounts** — the header already has inert Dashboard/Profile/sign-out
  placeholders; real login (e.g. AWS Cognito) would make favourites and saved
  searches follow you across devices.
- **Better mobile layout** — right now you toggle between map and list; a
  draggable bottom sheet over the map (like Zillow and Airbnb) would show both.
- **Listing detail page** — a full view with the five-image gallery. The API
  endpoint for a single listing already exists.
- **A coarser grid level for zoomed-out views** — fixes the ~130-cell problem
  from decision 3 properly (~4 lookups instead of ~40).
- **Remembering recent map areas** — panning away and back currently refetches;
  a small cache would make going back instant.
- **Pagination** — fine at 50 listings, but needed before responses get big.
- **Map accessibility** — the list works well with a keyboard and screen reader,
  but the map doesn't: no keyboard panning/zooming, popups don't capture focus
  or close on Escape, and there's no spoken summary of visible results.
- **Tighter security** — restrict which websites may call the API (currently
  any site can), and add rate limiting.
- **Realistic database tests in CI** — the map query logic is tested against a
  fake DynamoDB today; running a real local DynamoDB in CI would test the exact
  query behavior end to end.
