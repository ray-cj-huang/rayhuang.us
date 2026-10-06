import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // GitHub Pages serves static files only — no server, no image optimizer.
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
