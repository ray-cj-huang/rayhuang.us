"use client";

import dynamic from "next/dynamic";

// three.js needs `window`, and the static export prerenders on the server.
// Loading client-only also keeps three.js out of the initial bundle.
const HeroScene = dynamic(() => import("./hero-scene"), {
  ssr: false,
  loading: () => null,
});

/**
 * Fixed, full-viewport 3D layer behind the whole page.
 * It never receives pointer events, and is dimmed on phones where it sits behind body text.
 */
export function SceneBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 opacity-50 md:opacity-100">
      <HeroScene />
    </div>
  );
}
