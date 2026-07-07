"use client";

import Link from "next/link";
import { MobileMenu } from "./MobileMenu";

/**
 * Top navigation. A hamburger (mobile only) opens the app menu; the brand sits
 * on the left in a sea-blue wordmark. Fixed h-14 — the browse page sizes its
 * full-height app frame against it.
 */
export function NavBar() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <nav className="flex h-14 items-center gap-3 px-4 text-base sm:px-6">
        <MobileMenu />
        <Link
          className="text-lg font-black tracking-tight text-[#0077BE] transition hover:opacity-80"
          href="/"
        >
          Property Copilot
        </Link>
      </nav>
    </header>
  );
}
