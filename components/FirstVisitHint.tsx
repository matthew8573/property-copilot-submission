"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "pc.browseHintSeen";
const AUTO_DISMISS_MS = 7000;

/**
 * A one-time onboarding toast shown the first time someone opens the browse
 * page. It records dismissal in localStorage so it never nags on return
 * visits, and auto-dismisses after a few seconds if ignored.
 */
export function FirstVisitHint() {
  const [show, setShow] = useState(false);

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* private mode / storage disabled — no-op */
    }
  };

  useEffect(() => {
    let alreadySeen = true;
    try {
      alreadySeen = Boolean(localStorage.getItem(STORAGE_KEY));
    } catch {
      alreadySeen = false;
    }
    if (alreadySeen) {
      return;
    }
    setShow(true);
    const timer = setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!show) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed bottom-20 left-1/2 z-40 -translate-x-1/2 px-4 lg:bottom-6">
      <div className="pointer-events-auto flex items-center gap-2.5 rounded-full border border-violet-200 bg-white/95 px-5 py-2.5 shadow-lg backdrop-blur">
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4 shrink-0 text-violet-500"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M12 2l1.6 5.4L19 9l-5.4 1.6L12 16l-1.6-5.4L5 9l5.4-1.6L12 2z" />
        </svg>
        <span className="text-sm font-semibold text-slate-800">
          Property Copilot listings — pan the map to explore
        </span>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-lg leading-none text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
        >
          ×
        </button>
      </div>
    </div>
  );
}
