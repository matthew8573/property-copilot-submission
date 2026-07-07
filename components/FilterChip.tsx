"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type FilterChipProps = {
  /** Dimension name, e.g. "Price", "Beds". */
  label: string;
  /** Current value shown on the chip, e.g. "Any", "2+", "under $3.8k". */
  valueLabel: string;
  /** Whether this dimension is constraining results (fills the chip). */
  active: boolean;
  /** Popover content; call `close` to dismiss (e.g. after a menu pick). */
  children: (close: () => void) => ReactNode;
  /** Popover width utility, e.g. "w-80" (default) or "w-44". */
  panelClassName?: string;
  /** Where the popover opens: below the chip (default) or to its right (rail). */
  placement?: "bottom" | "right";
  /** Stretch the chip to fill its container (used in the vertical rail). */
  fullWidth?: boolean;
};

/**
 * The shared filter control shell: a chip button that opens a popover.
 * Price, Beds, Baths, and Type all use it, so the bar reads as one system.
 * Handles outside-click and Escape dismissal.
 */
export function FilterChip({
  label,
  valueLabel,
  active,
  children,
  panelClassName = "w-80",
  placement = "bottom",
  fullWidth = false
}: FilterChipProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Keep the panel inside the viewport — on a phone a right-column chip's panel
  // would otherwise spill off the screen edge. Shift it back with a transform.
  useEffect(() => {
    if (!open) {
      return;
    }
    const el = panelRef.current;
    if (!el) {
      return;
    }
    el.style.transform = "";
    const rect = el.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    const margin = 8;
    let dx = 0;
    if (rect.right > viewportWidth - margin) {
      dx = viewportWidth - margin - rect.right;
    } else if (rect.left < margin) {
      dx = margin - rect.left;
    }
    if (dx !== 0) {
      el.style.transform = `translateX(${dx}px)`;
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="true"
        className={`flex items-center gap-1.5 rounded-md border-2 px-4 py-2 text-sm transition ${
          fullWidth ? "w-full justify-between" : ""
        } ${
          active
            ? "border-blue-600 bg-blue-600 text-white shadow-sm"
            : "border-slate-600 bg-white text-slate-900 hover:border-slate-800 hover:bg-slate-50"
        }`}
      >
        <span className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide">{label}</span>
          <span className="font-semibold">{valueLabel}</span>
        </span>
        <svg
          viewBox="0 0 12 12"
          className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>

      {open ? (
        <div
          ref={panelRef}
          className={`absolute z-30 max-w-[calc(100vw-1rem)] rounded-lg border border-slate-300 bg-white shadow-xl ${
            placement === "right" ? "left-full top-0 ml-2" : "left-0 top-full mt-2"
          } ${panelClassName}`}
        >
          {children(() => setOpen(false))}
        </div>
      ) : null}
    </div>
  );
}
