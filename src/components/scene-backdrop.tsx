"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
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

  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      <OceanScene />
    </div>
  );
}
