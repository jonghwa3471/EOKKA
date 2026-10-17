import { nodeProfilingIntegration } from "@sentry/profiling-node";
import * as Sentry from "@sentry/react-router";

if (process.env.SENTRY_DSN) {
  const environment =
    process.env.SENTRY_ENVIRONMENT ||
    process.env.VERCEL_ENV ||
    process.env.NODE_ENV;
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment,
    release: process.env.SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA,
    sendDefaultPii: false,
    // Public-data gateways reject Sentry propagation headers with HTTP 400.
    // Keep error/span collection, but do not propagate traces to external APIs.
    tracePropagationTargets: [],
    integrations: [nodeProfilingIntegration()],
    tracesSampleRate: 0.1,
    profilesSampleRate: 0.1,
    beforeSend(event) {
      if (event.request?.url)
        event.request.url = event.request.url.split("?")[0];
      if (event.request) {
        delete event.request.data;
        delete event.request.cookies;
      }
      return event;
    },
  });
}
