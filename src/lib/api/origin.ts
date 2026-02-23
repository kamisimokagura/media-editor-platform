import { NextRequest } from "next/server";

const SAFE_PROTOCOLS = new Set(["http:", "https:"]);
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

function normalizeOrigin(candidate: string | null | undefined): string | null {
  if (!candidate) return null;
  try {
    const parsed = new URL(candidate);
    if (!SAFE_PROTOCOLS.has(parsed.protocol)) return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

function isLocalOrigin(origin: string): boolean {
  try {
    return LOCAL_HOSTNAMES.has(new URL(origin).hostname);
  } catch {
    return false;
  }
}

function inferOriginFromRequest(request: NextRequest): string | null {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = request.headers.get("host");

  const resolvedHost = (forwardedHost ?? host)?.split(",")[0]?.trim();
  if (!resolvedHost) {
    return null;
  }

  const protocol =
    forwardedProto?.split(",")[0]?.trim() ??
    (resolvedHost.includes("localhost") || resolvedHost.startsWith("127.0.0.1")
      ? "http"
      : "https");

  return normalizeOrigin(`${protocol}://${resolvedHost}`);
}

function inferVercelOrigin(): string | null {
  const vercelHost =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL;
  if (!vercelHost) {
    return null;
  }

  if (vercelHost.startsWith("http://") || vercelHost.startsWith("https://")) {
    return normalizeOrigin(vercelHost);
  }

  return normalizeOrigin(`https://${vercelHost}`);
}

function pickPreferredOrigin(candidates: Array<string | null>): string | null {
  const normalized = candidates.filter((origin): origin is string => Boolean(origin));
  if (normalized.length === 0) return null;

  const nonLocal = normalized.find((origin) => !isLocalOrigin(origin));
  return nonLocal ?? normalized[0];
}

function normalizePath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) return "/";
  if (trimmed.startsWith("/")) return trimmed;
  return `/${trimmed}`;
}

export function getSafeOrigin(request: NextRequest): string {
  const envOrigin = normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL);
  const requestOrigin = inferOriginFromRequest(request);
  const nextUrlOrigin = normalizeOrigin(request.nextUrl.origin);
  const vercelOrigin = inferVercelOrigin();

  const preferred = pickPreferredOrigin([
    requestOrigin,
    nextUrlOrigin,
    envOrigin,
    vercelOrigin,
  ]);

  if (preferred) return preferred;

  return "http://localhost:3000";
}

export function getAllowedOrigins(request: NextRequest): Set<string> {
  const allowed = new Set<string>();

  const candidates = [
    getSafeOrigin(request),
    inferOriginFromRequest(request),
    normalizeOrigin(request.nextUrl.origin),
    normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL),
    inferVercelOrigin(),
  ];

  for (const origin of candidates) {
    if (origin) {
      allowed.add(origin);
    }
  }

  return allowed;
}

export function sanitizeReturnUrl(
  inputUrl: string | undefined | null,
  fallbackPath: string,
  request: NextRequest
): string {
  const baseOrigin = getSafeOrigin(request);
  const fallback = new URL(normalizePath(fallbackPath), baseOrigin).toString();
  if (!inputUrl) return fallback;

  const trimmed = inputUrl.trim();
  if (!trimmed) return fallback;

  try {
    const parsed = new URL(trimmed, baseOrigin);
    if (!SAFE_PROTOCOLS.has(parsed.protocol)) {
      return fallback;
    }

    const allowedOrigins = getAllowedOrigins(request);
    if (!allowedOrigins.has(parsed.origin)) {
      return fallback;
    }

    return parsed.toString();
  } catch {
    return fallback;
  }
}
