import * as Sentry from "@sentry/nextjs";
import { SupabaseClient } from "@supabase/supabase-js";
import { supabaseIntegration } from "@supabase/sentry-js-integration";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.VERCEL_GIT_COMMIT_SHA,

  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,

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
