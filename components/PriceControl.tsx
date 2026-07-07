"use client";

import { useEffect, useState } from "react";
import { RENT_BOUNDS } from "@/lib/filters";
import { formatPriceShort } from "@/lib/format";
import { FilterChip } from "./FilterChip";
import { PriceHistogram } from "./PriceHistogram";
import { RangeSlider } from "./RangeSlider";

type PriceControlProps = {
  minRent?: number;
  maxRent?: number;
  onChange: (minRent: number | undefined, maxRent: number | undefined) => void;
  /** Whole-market rent distribution for the histogram (count per bucket). */
  histogram?: number[];
  /** Popover placement, forwarded to the chip (rail opens to the right). */
  placement?: "bottom" | "right";
  /** Stretch the chip to fill its container (vertical rail). */
  fullWidth?: boolean;
};

function rangeLabel(minRent?: number, maxRent?: number): string {
  if (minRent !== undefined && maxRent !== undefined) {
    return `${formatPriceShort(minRent)}–${formatPriceShort(maxRent)}`;
  }
  if (minRent !== undefined) {
    return `${formatPriceShort(minRent)}+`;
  }
  if (maxRent !== undefined) {
    return `under ${formatPriceShort(maxRent)}`;
  }
  return "Any";
}

type BoundInputProps = {
  label: string;
  value: number;
  onCommit: (value: number) => void;
};

/** Numeric input that commits on blur or Enter, so mid-typing never jumps. */
function BoundInput({ label, value, onCommit }: BoundInputProps) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = () => {
    const parsed = Number(draft);
    if (Number.isFinite(parsed)) {
      onCommit(parsed);
    } else {
      setDraft(String(value));
    }
  };

  return (
    <label className="flex-1 text-sm font-medium text-slate-600">
      {label}
      <input
        type="number"
        inputMode="numeric"
        min={RENT_BOUNDS.min}
        max={RENT_BOUNDS.max}
        step={RENT_BOUNDS.step}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          }
        }}
        className="mt-1 w-full rounded-md border border-slate-400 px-3 py-2 text-base font-normal text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25"
      />
    </label>
  );
}

/**
 * Rent range filter: a chip popover with a price-frequency histogram, a
 * dual-thumb slider for feel, and min/max inputs for precision. The slider
 * previews live (the histogram shades to match) but only commits a fetch when
 * the thumb is released; values at the bounds mean "unconstrained".
 */
export function PriceControl({
  minRent,
  maxRent,
  onChange,
  histogram,
  placement = "bottom",
  fullWidth = false
}: PriceControlProps) {
  const low = minRent ?? RENT_BOUNDS.min;
  const high = maxRent ?? RENT_BOUNDS.max;
  const [draft, setDraft] = useState({ low, high });

  useEffect(() => {
    setDraft({ low, high });
  }, [low, high]);

  const commit = (nextLow: number, nextHigh: number) => {
    onChange(
      nextLow <= RENT_BOUNDS.min ? undefined : nextLow,
      nextHigh >= RENT_BOUNDS.max ? undefined : nextHigh
    );
  };

  return (
    <FilterChip
      label="Price"
      valueLabel={rangeLabel(minRent, maxRent)}
      active={minRent !== undefined || maxRent !== undefined}
      panelClassName="w-96"
      placement={placement}
      fullWidth={fullWidth}
    >
      {(close) => (
        <div className="p-5">
          {/* Commit on release (pointer or key), not per pixel of drag. */}
          <div
            onPointerUp={() => commit(draft.low, draft.high)}
            onKeyUp={() => commit(draft.low, draft.high)}
          >
            {histogram && histogram.length > 0 ? (
              <PriceHistogram
                counts={histogram}
                min={RENT_BOUNDS.min}
                max={RENT_BOUNDS.max}
                low={draft.low}
                high={draft.high}
              />
            ) : null}
            <RangeSlider
              min={RENT_BOUNDS.min}
              max={RENT_BOUNDS.max}
              step={RENT_BOUNDS.step}
              low={draft.low}
              high={draft.high}
              onChange={(nextLow, nextHigh) => setDraft({ low: nextLow, high: nextHigh })}
            />
            <div className="mt-1 flex justify-between text-xs font-semibold text-slate-500">
              <span>{formatPriceShort(RENT_BOUNDS.min)}</span>
              <span>{formatPriceShort(RENT_BOUNDS.max)}+</span>
            </div>
          </div>
          <div className="mt-4 flex items-end gap-3">
            <BoundInput
              label="Min"
              value={low}
              onCommit={(value) =>
                commit(Math.max(RENT_BOUNDS.min, Math.min(value, high - RENT_BOUNDS.step)), high)
              }
            />
            <span className="pb-2.5 text-gray-400">–</span>
            <BoundInput
              label="Max"
              value={high}
              onCommit={(value) =>
                commit(low, Math.min(RENT_BOUNDS.max, Math.max(value, low + RENT_BOUNDS.step)))
              }
            />
          </div>
          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => onChange(undefined, undefined)}
              className="text-base text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={close}
              className="rounded-md bg-blue-600 px-4 py-2 text-base font-medium text-white transition hover:bg-blue-700"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </FilterChip>
  );
}
