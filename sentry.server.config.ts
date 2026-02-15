// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { SupabaseClient } from "@supabase/supabase-js";
import { supabaseIntegration } from "@supabase/sentry-js-integration";

Sentry.init({
  dsn: "https://863a553563b1f65e83c58d1f7d99b93f@o4510586080919552.ingest.us.sentry.io/4510892299911168",
  environment: process.env.NODE_ENV,
  release: process.env.VERCEL_GIT_COMMIT_SHA,

  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,

  enableLogs: true,
  sendDefaultPii: true,

  integrations: [
    supabaseIntegration(SupabaseClient, Sentry, {
      tracing: true,
      breadcrumbs: true,
      errors: true,
    }),
    Sentry.nativeNodeFetchIntegration({
      breadcrumbs: true,
      ignoreOutgoingRequests: (url) => {
        return url.startsWith(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest`,
        );
      },
    }),
  ],

  tracePropagationTargets: [
    "localhost",
    /railway\.app/,
    ...(process.env.RAILWAY_SERVICE_URL
      ? [process.env.RAILWAY_SERVICE_URL]
      : []),
  ],

  initialScope: {
    tags: { service: "nextjs-app" },
  },

  debug: process.env.NODE_ENV === "development",
});
