"use client";

import dynamic from "next/dynamic";

// three.js needs `window`, and the static export prerenders on the server,
// so load the scene client-only and keep it out of the initial JS bundle.
const HeroScene = dynamic(() => import("./hero-scene"), {
  ssr: false,
  loading: () => null,
});

export function HeroCanvas() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 opacity-40 md:pointer-events-auto md:opacity-100">
      <HeroScene />
    </div>
  );
}
