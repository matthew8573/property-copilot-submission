"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { PlaceSuggestion } from "@/lib/geocode";
import type { PropertyFilter } from "@/lib/types";
import { FilterBar } from "./FilterBar";

const ICON = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "h-5 w-5 shrink-0"
};

function DashboardIcon() {
  return (
    <svg {...ICON} aria-hidden="true">
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  );
}

function BrowseIcon() {
  return (
    <svg {...ICON} aria-hidden="true">
      <path d="M9 20l-6 2V6l6-2 6 2 6-2v16l-6 2-6-2z" />
      <path d="M9 4v16M15 6v16" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg {...ICON} aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0116 0" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg {...ICON} aria-hidden="true">
      <path d="M15 4h3a1 1 0 011 1v14a1 1 0 01-1 1h-3" />
      <path d="M10 17l-5-5 5-5M5 12h11" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 12 12"
      className={`h-3 w-3 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
      aria-hidden="true"
    >
      <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/**
 * The account control pinned to the bottom of the rail: the "Guest User" row is
 * a button that opens a small menu (Profile · Log out) above it. Outside-click
 * and Escape dismiss it. Profile and Log out are placeholders — no auth backend.
 */
function AccountMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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
    <div ref={rootRef} className="relative border-t border-slate-100 p-3">
      {open ? (
        <div className="absolute inset-x-3 bottom-full mb-2 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl">
          <Link
            href="#"
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <ProfileIcon />
            Profile
          </Link>
          <button
            type="button"
            className="flex w-full items-center gap-3 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <SignOutIcon />
            Log out
          </button>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="true"
        className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition hover:bg-slate-50"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500 text-sm font-bold text-white">
          GU
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">Guest User</p>
          <p className="truncate text-xs text-slate-500">guest@example.com</p>
        </div>
        <ChevronIcon open={open} />
      </button>
    </div>
  );
}

type NavLinkProps = {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
};

/** One app-nav row. `active` highlights the current section. */
function NavLink({ href, icon, label, active = false }: NavLinkProps) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition ${
        active
          ? "bg-blue-50 text-blue-700"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

type BrowseSidebarProps = {
  filter: PropertyFilter;
  onChange: (filter: PropertyFilter) => void;
  onSelectPlace: (place: PlaceSuggestion) => void;
  placeFallback?: (query: string) => PlaceSuggestion[];
  rentHistogram?: number[];
};

/**
 * The desktop left rail (lg+): app navigation on top, the vertical search +
 * filter controls in the middle, and an account menu pinned to the bottom.
 * Hidden on mobile, where the browse page falls back to a horizontal FilterBar.
 *
 * The nav links (Dashboard, Profile) and the account menu (Profile, Log out)
 * are presentational placeholders — this build has no auth or backend for them.
 */
export function BrowseSidebar({
  filter,
  onChange,
  onSelectPlace,
  placeFallback,
  rentHistogram
}: BrowseSidebarProps) {
  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
      <nav className="flex flex-col gap-1 border-b border-slate-100 p-3">
        <NavLink href="#" icon={<DashboardIcon />} label="Dashboard" />
        <NavLink href="/browse" icon={<BrowseIcon />} label="Browse" active />
        <NavLink href="#" icon={<ProfileIcon />} label="Profile" />
      </nav>

      <div className="flex-1 p-3">
        <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Refine
        </p>
        <FilterBar
          orientation="vertical"
          filter={filter}
          onChange={onChange}
          onSelectPlace={onSelectPlace}
          placeFallback={placeFallback}
          rentHistogram={rentHistogram}
        />
      </div>

      <AccountMenu />
    </aside>
  );
}
