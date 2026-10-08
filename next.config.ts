import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // GitHub Pages serves static files only, so there's no server or image optimizer.
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  // Agent instructions live in CLAUDE.md and .claude/skills; stop `next dev` writing AGENTS.md.
  agentRules: false,
};

export default nextConfig;
