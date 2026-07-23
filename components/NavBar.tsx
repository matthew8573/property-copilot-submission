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
          className="flex items-center gap-2 text-lg font-black tracking-tight text-[#0077BE] transition hover:opacity-80"
          href="/"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/PropertyCopilotLogo.png" alt="" aria-hidden="true" className="h-8 w-8 object-contain" />
          Property Copilot
        </Link>
      </nav>
    </header>
  );
}
