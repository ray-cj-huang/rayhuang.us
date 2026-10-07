"use client";

import dynamic from "next/dynamic";

// three.js needs `window`, and the static export prerenders on the server,
// so load the scene client-only and keep it out of the initial JS bundle.
const HeroScene = dynamic(() => import("./hero-scene"), {
  ssr: false,
  loading: () => null,
});

// Fixed, full-viewport layer behind the whole page so the stingray can swim anywhere.
// It never takes pointer events; the stingray tracks the cursor via a window listener.
// On phones it's dimmed because, once scrolled, it sits behind body text.
export function SceneBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 opacity-50 md:opacity-100">
      <HeroScene />
    </div>
  );
}
