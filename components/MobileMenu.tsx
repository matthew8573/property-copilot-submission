"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const ICON = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "h-5 w-5 shrink-0"
};

function HamburgerIcon() {
  return (
    <svg {...ICON} aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg {...ICON} aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
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

type DrawerLinkProps = {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
};

function DrawerLink({ href, icon, label, active = false, onClick }: DrawerLinkProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
        active ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

/**
 * Mobile app menu: a hamburger (shown only below lg) that opens a slide-over
 * with the same navigation + account that the desktop rail carries, so phones
 * aren't missing that chrome. Nav links and Log out are placeholders (no auth).
 */
export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="-ml-1 flex h-9 w-9 items-center justify-center rounded-md text-slate-700 transition hover:bg-slate-100 lg:hidden"
      >
        <HamburgerIcon />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={close}
            className="absolute inset-0 bg-slate-900/40"
          />
          <div className="absolute left-0 top-0 flex h-full w-72 max-w-[82vw] flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-4">
              <Link
                href="/"
                onClick={close}
                className="text-lg font-black tracking-tight text-[#0077BE]"
              >
                Property Copilot
              </Link>
              <button
                type="button"
                onClick={close}
                aria-label="Close menu"
                className="flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <CloseIcon />
              </button>
            </div>

            <nav className="flex flex-col gap-1 p-3">
              <DrawerLink href="/browse" icon={<BrowseIcon />} label="Browse" active onClick={close} />
              <DrawerLink href="#" icon={<DashboardIcon />} label="Dashboard" onClick={close} />
              <DrawerLink href="#" icon={<ProfileIcon />} label="Profile" onClick={close} />
            </nav>

            <div className="mt-auto border-t border-slate-100 p-3">
              <div className="flex items-center gap-3 px-2 py-1.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500 text-sm font-bold text-white">
                  GU
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">Guest User</p>
                  <p className="truncate text-xs text-slate-500">guest@example.com</p>
                </div>
              </div>
              <Link
                href="#"
                onClick={close}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
              >
                <ProfileIcon />
                View profile
              </Link>
              <button
                type="button"
                onClick={close}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
              >
                <SignOutIcon />
                Log out
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
