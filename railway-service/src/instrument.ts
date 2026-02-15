import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || "production",
  release: process.env.RAILWAY_GIT_COMMIT_SHA,

  tracesSampleRate: 0.3,

  initialScope: {
    tags: { service: "railway-service" },
  },
});
