"use client";

import { useEffect, useRef, useState } from "react";
import { geocodePlaces, type PlaceSuggestion } from "@/lib/geocode";

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.7" />
      <path d="M14 14l4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function Spinner() {
  return (
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
  );
}

const DEBOUNCE_MS = 220;

type SearchBoxProps = {
  /** Called when the user picks a place — the page re-frames the map to it. */
  onSelectPlace: (place: PlaceSuggestion) => void;
  /** Instant local suggestions shown while (or if) the geocoder is unavailable. */
  fallback?: (query: string) => PlaceSuggestion[];
  wrapperClassName?: string;
};

/**
 * Google-Maps-style place search: type-ahead over the Photon geocoder (keyless,
 * region-clamped). Debounced + cancelable so it stays light; shows instant local
 * suggestions first and falls back to them if the geocoder is unreachable, so
 * the box never hard-breaks. Selecting a place hands it up to re-frame the map.
 */
export function SearchBox({
  onSelectPlace,
  fallback,
  wrapperClassName = "w-full sm:w-72"
}: SearchBoxProps) {
  const [value, setValue] = useState("");
  const [items, setItems] = useState<PlaceSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);

  const rootRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The label just committed by a selection — lets the query effect skip the
  // search that setting the input to that label would otherwise re-trigger.
  const selectedRef = useRef<string | null>(null);
  // Keep the latest fallback without making the query effect depend on it.
  const fallbackRef = useRef(fallback);
  fallbackRef.current = fallback;

  // Debounced geocode on each keystroke; instant local suggestions in the gap.
  useEffect(() => {
    const q = value.trim();
    if (q.length < 2) {
      setItems([]);
      setLoading(false);
      setActive(-1);
      return;
    }
    if (selectedRef.current === value) {
      // Value was just set by a selection — don't reopen the dropdown.
      selectedRef.current = null;
      setOpen(false);
      return;
    }
    const local = fallbackRef.current ? fallbackRef.current(q) : [];
    setItems(local);
    setActive(-1);
    setOpen(true);
    setLoading(true);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      geocodePlaces(q, controller.signal)
        .then((results) => {
          setItems(results.length > 0 ? results : local);
          setLoading(false);
        })
        .catch((err) => {
          if (err instanceof DOMException && err.name === "AbortError") {
            return; // superseded by a newer keystroke
          }
          setItems(local); // geocoder unreachable → keep local suggestions
          setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value]);

  // Dismiss on outside click / Escape.
  useEffect(() => {
    if (!open) {
      return;
    }
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const choose = (place: PlaceSuggestion) => {
    selectedRef.current = place.label;
    setValue(place.label);
    setItems([]);
    setActive(-1);
    setOpen(false);
    onSelectPlace(place);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, items.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      if (open && items.length > 0) {
        event.preventDefault();
        choose(items[active >= 0 ? active : 0]);
      }
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  const showDropdown = open && value.trim().length >= 2;

  return (
    <div ref={rootRef} role="search" className={`relative ${wrapperClassName}`}>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
        <SearchIcon />
      </span>
      <input
        type="text"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onFocus={() => {
          if (items.length > 0) setOpen(true);
        }}
        onKeyDown={onKeyDown}
        placeholder="Search city or address"
        aria-label="Search places"
        role="combobox"
        aria-expanded={showDropdown}
        aria-autocomplete="list"
        className="w-full rounded-md border-2 border-slate-400 bg-white py-2 pl-9 pr-9 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25"
      />
      {loading ? (
        <span className="absolute right-3 top-1/2 -translate-y-1/2">
          <Spinner />
        </span>
      ) : null}

      {showDropdown ? (
        <div className="absolute left-0 right-0 top-full z-40 mt-1 overflow-hidden rounded-md border border-slate-200 bg-white shadow-xl">
          {items.length > 0 ? (
            <ul role="listbox">
              {items.map((place, i) => (
                <li key={place.id} role="option" aria-selected={i === active}>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => choose(place)}
                    className={`flex w-full flex-col items-start px-3 py-2 text-left transition ${
                      i === active ? "bg-slate-100" : "hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-sm font-medium text-slate-900">{place.label}</span>
                    {place.detail ? (
                      <span className="text-xs text-slate-500">{place.detail}</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : loading ? (
            <div className="px-3 py-2 text-sm text-slate-500">Searching…</div>
          ) : (
            <div className="px-3 py-2 text-sm text-slate-500">No matching places</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
