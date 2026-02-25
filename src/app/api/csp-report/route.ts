import { NextRequest, NextResponse } from "next/server";

/**
 * CSP violation report endpoint
 * Receives Content-Security-Policy violation reports from browsers.
 *
 * Browsers send reports as application/csp-report (legacy)
 * or application/reports+json (Reporting API v1).
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let body: unknown;

    if (
      contentType.includes("application/csp-report") ||
      contentType.includes("application/reports+json") ||
      contentType.includes("application/json")
    ) {
      body = await request.json();
    } else {
      return NextResponse.json({ error: "Unsupported content type" }, { status: 415 });
    }

    // Log the violation for monitoring
    // In production, send to a logging service (Sentry, Datadog, etc.)
    console.warn("[CSP Violation]", JSON.stringify(body, null, 2));

    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 400 });
  }
}
