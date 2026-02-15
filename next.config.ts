import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {};

export default withSentryConfig(nextConfig, {
  org: "hammaad",
  project: "gc-comms",

  silent: !process.env.CI,

  widenClientFileUpload: true,

  // Route browser Sentry requests through Next.js to bypass ad blockers
  tunnelRoute: "/monitoring",

  disableLogger: true,

  bundleSizeOptimizations: {
    excludeDebugStatements: true,
    excludeReplayIframe: true,
    excludeReplayShadowDom: true,
  },

  webpack: {
    automaticVercelMonitors: true,
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
