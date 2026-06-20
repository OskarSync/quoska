import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // DSGVO: no telemetry
  // typedRoutes disabled during scaffold; enable once all routes exist
  // Allow an isolated build dir for parallel dev servers (e.g. e2e runs that
  // must not share .next/ with another concurrently-running dev server).
  // Only active when E2E_DIST_DIR is set; otherwise the default .next is used.
  ...(process.env.E2E_DIST_DIR ? { distDir: process.env.E2E_DIST_DIR } : {}),
};

export default nextConfig;
