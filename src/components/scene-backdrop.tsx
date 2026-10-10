"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { getScrollDepth } from "./ocean/scroll-depth";

// three.js needs `window`, and the static export prerenders on the server.
// Loading client-only also keeps three.js out of the initial bundle.
const OceanScene = dynamic(() => import("./ocean/ocean-scene"), {
  ssr: false,
  loading: () => null,
});

/**
 * Fixed, full-viewport ocean behind the whole page; it never receives pointer events.
 * Also publishes scroll depth as the `--depth` CSS variable, so text outside cards can lighten as the water darkens.
 */
export function SceneBackdrop() {
  const [ready, setReady] = useState(false);

  // Wait until the page has loaded and the main thread is idle, so the three.js chunk never competes with first paint.
  useEffect(() => {
    let idle = 0;
    const start = () => {
      idle = window.requestIdleCallback
        ? window.requestIdleCallback(() => setReady(true), { timeout: 1500 })
        : window.setTimeout(() => setReady(true), 200);
    };
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
    return () => {
      window.removeEventListener("load", start);
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => root.style.setProperty("--depth", getScrollDepth().toFixed(3));
    sync();
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      window.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);

  return <div className="pointer-events-none fixed inset-0 -z-10">{ready && <OceanScene />}</div>;
}
