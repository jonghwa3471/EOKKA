/**
 * Google Tag Manager analytics integration module.
 *
 * Events are pushed to the dataLayer. Google Tag Manager decides which services
 * (GA4, Google Ads, etc.) receive each event.
 *
 * The module offers a type-safe way to track custom events with optional properties,
 * making it easy to implement consistent analytics tracking throughout the application.
 */

/**
 * Extend Window with the dataLayer created by the GTM container snippet.
 */
declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

export const analyticsEventNames = [
  "sign_up",
  "login",
  "quick_analysis_complete",
  "precise_analysis_complete",
  "portfolio_transaction_added",
  "portfolio_transaction_updated",
  "portfolio_transaction_deleted",
  "support_ticket_created",
  "begin_checkout",
  "purchase",
  "subscription_cancelled",
  "account_deleted",
] as const;

export type AnalyticsEventName = (typeof analyticsEventNames)[number];

const PENDING_EVENT_KEY = "eokka:pending-analytics-event";

export function isAnalyticsEventName(
  value: string,
): value is AnalyticsEventName {
  return (analyticsEventNames as readonly string[]).includes(value);
}

export function markPendingAnalyticsEvent(eventName: AnalyticsEventName) {
  window.sessionStorage.setItem(
    PENDING_EVENT_KEY,
    JSON.stringify({ eventName, createdAt: Date.now() }),
  );
}

export function consumePendingAnalyticsEvent(eventName: AnalyticsEventName) {
  const raw = window.sessionStorage.getItem(PENDING_EVENT_KEY);
  window.sessionStorage.removeItem(PENDING_EVENT_KEY);
  if (!raw) return false;
  try {
    const pending = JSON.parse(raw) as {
      eventName?: string;
      createdAt?: number;
    };
    if (
      pending.eventName !== eventName ||
      typeof pending.createdAt !== "number" ||
      Date.now() - pending.createdAt > 30 * 60 * 1000
    )
      return false;
    trackEvent(eventName);
    return true;
  } catch {
    return false;
  }
}

/**
 * Push a custom event to Google Tag Manager.
 *
 * GTM can route the same event to GA4, Google Ads, or another configured tag.
 *
 * @example
 * // Track a simple event
 * trackEvent('button_click');
 *
 * // Track an event with additional properties
 * trackEvent('purchase', {
 *   currency: 'USD',
 *   value: 49.99,
 *   items: [{ id: 'subscription_premium' }]
 * });
 *
 * @param eventName - The name of the event to track
 * @param properties - Optional object containing additional event properties
 * @returns The new dataLayer length, or undefined if GTM is not configured
 */
export default function trackEvent(
  eventName: AnalyticsEventName | "test_event",
  properties?: Record<string, unknown>,
) {
  return window.dataLayer?.push({ event: eventName, ...properties });
}

/**
 * Records client-side route changes without including query parameters.
 * Query strings can contain share-card copy or temporary auth state, neither of
 * which belongs in analytics.
 */
export function trackPageView(pathname: string, title: string) {
  return window.dataLayer?.push({
    event: "page_view",
    page_location: `${window.location.origin}${pathname}`,
    page_path: pathname,
    page_title: title,
  });
}
