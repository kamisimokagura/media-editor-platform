import { createServerSupabaseAdmin, createServerSupabaseClient } from "@/lib/supabase/server";
import type { AnalyticsEventName } from "@/lib/analytics/events";
import type { Json } from "@/types/database";

type EventParams = Record<string, Json | undefined>;

interface TrackServerEventInput {
  request?: Request;
  eventName: AnalyticsEventName;
  eventCategory?: string;
  eventParams?: EventParams;
  pagePath?: string;
  referrer?: string;
  sessionId?: string | null;
  userId?: string | null;
  createdAt?: string;
}

function getHeaderValue(headers: Headers | undefined, name: string): string | null {
  if (!headers) return null;
  return headers.get(name);
}

function detectDeviceType(userAgent: string): string | null {
  if (!userAgent) return null;
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet/.test(ua)) return "tablet";
  if (/mobi|iphone|android/.test(ua)) return "mobile";
  return "desktop";
}

function detectBrowser(userAgent: string): string | null {
  if (!userAgent) return null;
  const ua = userAgent.toLowerCase();
  if (ua.includes("edg/")) return "edge";
  if (ua.includes("chrome/") && !ua.includes("edg/")) return "chrome";
  if (ua.includes("safari/") && !ua.includes("chrome/")) return "safari";
  if (ua.includes("firefox/")) return "firefox";
  return "other";
}

function coerceEventParams(value: unknown): EventParams {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as EventParams;
}

function hasTrackingConfig(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function resolvePagePath(request: Request | undefined, explicitPath: string | undefined): string | null {
  if (explicitPath) return explicitPath;
  if (!request) return null;

  try {
    const parsed = new URL(request.url);
    return parsed.pathname;
  } catch {
    return null;
  }
}

function resolveReferrer(request: Request | undefined, explicitReferrer: string | undefined): string | null {
  if (explicitReferrer) return explicitReferrer;
  return getHeaderValue(request?.headers, "referer");
}

export async function trackServerEvent({
  request,
  eventName,
  eventCategory,
  eventParams,
  pagePath,
  referrer,
  sessionId,
  userId,
  createdAt,
}: TrackServerEventInput): Promise<void> {
  if (!hasTrackingConfig()) return;

  const normalizedParams = coerceEventParams(eventParams);
  const resolvedPagePath = resolvePagePath(request, pagePath);
  const resolvedReferrer = resolveReferrer(request, referrer);
  const ua = getHeaderValue(request?.headers, "user-agent") ?? "";
  const country =
    getHeaderValue(request?.headers, "x-vercel-ip-country") ??
    getHeaderValue(request?.headers, "cf-ipcountry");
  const resolvedSessionId =
    sessionId ??
    (typeof normalizedParams.session_id === "string" ? normalizedParams.session_id : null);

  let resolvedUserId = userId ?? null;
  if (!resolvedUserId) {
    try {
      const sessionClient = await createServerSupabaseClient();
      const {
        data: { user },
      } = await sessionClient.auth.getUser();
      resolvedUserId = user?.id ?? null;
    } catch {
      resolvedUserId = null;
    }
  }

  try {
    const admin = await createServerSupabaseAdmin();
    const { error } = await admin.from("analytics_events").insert({
      user_id: resolvedUserId,
      session_id: resolvedSessionId,
      event_name: eventName,
      event_category: eventCategory ?? null,
      event_params: normalizedParams,
      page_path: resolvedPagePath,
      referrer: resolvedReferrer,
      utm_source:
        typeof normalizedParams.utm_source === "string"
          ? normalizedParams.utm_source
          : null,
      utm_medium:
        typeof normalizedParams.utm_medium === "string"
          ? normalizedParams.utm_medium
          : null,
      utm_campaign:
        typeof normalizedParams.utm_campaign === "string"
          ? normalizedParams.utm_campaign
          : null,
      device_type: detectDeviceType(ua),
      browser: detectBrowser(ua),
      country,
      created_at: createdAt ?? new Date().toISOString(),
    });

    if (error) {
      console.error("Analytics insert error:", error.message);
    }
  } catch (error) {
    console.error("Analytics tracking error:", error);
  }
}
