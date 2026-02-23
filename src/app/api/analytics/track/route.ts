import { NextRequest, NextResponse } from "next/server";
import { ANALYTICS_EVENTS, type AnalyticsEventName } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/server";
import {
  badRequestResponse,
  parseJsonBody,
  requireEnumValue,
  sanitizeAnalyticsParams,
  toOptionalString,
} from "@/lib/api/validation";

const VALID_EVENTS = Object.values(ANALYTICS_EVENTS) as AnalyticsEventName[];

interface TrackApiRequestBody {
  eventName?: unknown;
  eventCategory?: unknown;
  eventParams?: unknown;
  pagePath?: unknown;
  referrer?: unknown;
  sessionId?: unknown;
}

export async function POST(request: NextRequest) {
  const parsedBody = await parseJsonBody(request, {
    invalidJsonMessage: "Invalid JSON payload.",
  });
  if ("response" in parsedBody) {
    return parsedBody.response;
  }
  const body = parsedBody.value as TrackApiRequestBody;

  const eventNameCheck = requireEnumValue(body.eventName, VALID_EVENTS, "eventName");
  if (!eventNameCheck.ok) {
    return badRequestResponse("Invalid eventName.");
  }

  const paramsCheck = sanitizeAnalyticsParams(body.eventParams);
  if ("message" in paramsCheck) {
    return badRequestResponse(paramsCheck.message);
  }

  await trackServerEvent({
    request,
    eventName: eventNameCheck.value,
    eventCategory: toOptionalString(body.eventCategory, 100),
    eventParams: paramsCheck.value,
    pagePath: toOptionalString(body.pagePath, 300),
    referrer: toOptionalString(body.referrer, 500),
    sessionId: toOptionalString(body.sessionId, 128),
  });

  return new NextResponse(null, { status: 204 });
}
