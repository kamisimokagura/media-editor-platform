"use client";

import {
  ANALYTICS_EVENTS,
  type AnalyticsEventName,
  GA4_EVENT_NAME_MAP,
} from "@/lib/analytics/events";

const SESSION_STORAGE_KEY = "mediaeditor_analytics_session_id";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

type EventParams = Record<string, unknown>;

interface TrackClientEventInput {
  eventName: AnalyticsEventName;
  eventCategory?: string;
  eventParams?: EventParams;
  pagePath?: string;
  referrer?: string;
}

function buildSessionId(): string {
  const randomPart =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  return `sess_${randomPart}`;
}

function getOrCreateSessionId(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) return existing;

    const created = buildSessionId();
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, created);
    return created;
  } catch {
    return null;
  }
}

function getUtmParams(): EventParams {
  if (typeof window === "undefined") return {};

  try {
    const url = new URL(window.location.href);
    const source = url.searchParams.get("utm_source");
    const medium = url.searchParams.get("utm_medium");
    const campaign = url.searchParams.get("utm_campaign");

    return {
      ...(source ? { utm_source: source } : {}),
      ...(medium ? { utm_medium: medium } : {}),
      ...(campaign ? { utm_campaign: campaign } : {}),
    };
  } catch {
    return {};
  }
}

export async function trackClientEvent({
  eventName,
  eventCategory,
  eventParams = {},
  pagePath,
  referrer,
}: TrackClientEventInput): Promise<void> {
  if (typeof window === "undefined") return;

  const resolvedPagePath = pagePath ?? window.location.pathname;
  const resolvedReferrer = referrer ?? document.referrer ?? null;
  const sessionId = getOrCreateSessionId();
  const mergedParams: EventParams = {
    ...getUtmParams(),
    ...eventParams,
    page_path: resolvedPagePath,
  };

  const ga4EventName = GA4_EVENT_NAME_MAP[eventName] ?? eventName;
  if (typeof window.gtag === "function") {
    try {
      window.gtag("event", ga4EventName, {
        ...mergedParams,
        canonical_event_name: eventName,
      });
    } catch {
      // Ignore GA4 client errors.
    }
  }

  try {
    await fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName,
        eventCategory,
        eventParams: mergedParams,
        pagePath: resolvedPagePath,
        referrer: resolvedReferrer,
        sessionId,
      }),
      credentials: "include",
      keepalive: true,
    });
  } catch {
    // Ignore network errors to avoid blocking UX.
  }
}

export function trackPageView(
  pagePath?: string,
  eventParams?: EventParams
): Promise<void> {
  return trackClientEvent({
    eventName: ANALYTICS_EVENTS.PAGE_VIEW,
    pagePath,
    eventParams,
  });
}

export { ANALYTICS_EVENTS };
