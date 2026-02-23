import { NextRequest, NextResponse } from "next/server";
import type { Json } from "@/types/database";

type ParseJsonResult =
  | { ok: true; value: unknown }
  | { ok: false; response: NextResponse };

interface ParseJsonOptions {
  allowEmptyBody?: boolean;
  invalidJsonMessage?: string;
}

interface AnalyticsSanitizeOptions {
  maxDepth?: number;
  maxKeys?: number;
  maxNodes?: number;
  maxArrayLength?: number;
  maxStringLength?: number;
  maxRootKeys?: number;
}

interface ValidationSuccess<T> {
  ok: true;
  value: T;
}

interface ValidationFailure {
  ok: false;
  message: string;
}

type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;
type EventParams = Record<string, Json | undefined>;

const STRIPE_PRICE_ID_REGEX = /^price_[A-Za-z0-9]+$/;
const STRIPE_CUSTOMER_ID_REGEX = /^cus_[A-Za-z0-9]+$/;
const BASIC_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UNSAFE_KEYS = new Set(["__proto__", "prototype", "constructor"]);

function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function parseJsonBody(
  request: NextRequest,
  options: ParseJsonOptions = {}
): Promise<ParseJsonResult> {
  const { allowEmptyBody = false, invalidJsonMessage = "Invalid JSON payload." } = options;

  let raw = "";
  try {
    raw = await request.text();
  } catch {
    return { ok: false, response: badRequest(invalidJsonMessage) };
  }

  if (raw.trim().length === 0) {
    if (allowEmptyBody) {
      return { ok: true, value: {} };
    }
    return { ok: false, response: badRequest(invalidJsonMessage) };
  }

  try {
    return { ok: true, value: JSON.parse(raw) as unknown };
  } catch {
    return { ok: false, response: badRequest(invalidJsonMessage) };
  }
}

export function toOptionalString(value: unknown, maxLength = 2048): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  return trimmed.slice(0, maxLength);
}

export function requireNonEmptyString(
  value: unknown,
  fieldName: string,
  maxLength = 2048
): ValidationResult<string> {
  const normalized = toOptionalString(value, maxLength);
  if (!normalized) {
    return { ok: false, message: `${fieldName} is required.` };
  }
  return { ok: true, value: normalized };
}

export function requireEnumValue<const T extends readonly string[]>(
  value: unknown,
  allowed: T,
  fieldName: string
): ValidationResult<T[number]> {
  if (typeof value !== "string") {
    return { ok: false, message: `${fieldName} is invalid.` };
  }
  if (!allowed.includes(value)) {
    return { ok: false, message: `${fieldName} is invalid.` };
  }
  return { ok: true, value: value as T[number] };
}

export function optionalEnumValue<const T extends readonly string[]>(
  value: unknown,
  allowed: T,
  fieldName: string
): ValidationResult<T[number] | undefined> {
  if (value === undefined || value === null || value === "") {
    return { ok: true, value: undefined };
  }
  const required = requireEnumValue(value, allowed, fieldName);
  if (!required.ok) {
    return required;
  }
  return { ok: true, value: required.value };
}

export function requireStripePriceId(value: unknown): ValidationResult<string> {
  const required = requireNonEmptyString(value, "priceId", 128);
  if (!required.ok) return required;
  if (!STRIPE_PRICE_ID_REGEX.test(required.value)) {
    return { ok: false, message: "priceId is invalid." };
  }
  return required;
}

export function optionalStripeCustomerId(value: unknown): ValidationResult<string | undefined> {
  if (value === undefined || value === null || value === "") {
    return { ok: true, value: undefined };
  }
  const normalized = toOptionalString(value, 128);
  if (!normalized || !STRIPE_CUSTOMER_ID_REGEX.test(normalized)) {
    return { ok: false, message: "customerId is invalid." };
  }
  return { ok: true, value: normalized };
}

export function optionalEmail(value: unknown): ValidationResult<string | undefined> {
  if (value === undefined || value === null || value === "") {
    return { ok: true, value: undefined };
  }
  const normalized = toOptionalString(value, 320);
  if (!normalized || !BASIC_EMAIL_REGEX.test(normalized)) {
    return { ok: false, message: "customerEmail is invalid." };
  }
  return { ok: true, value: normalized };
}

function sanitizeJsonValue(
  value: unknown,
  depth: number,
  limits: Required<AnalyticsSanitizeOptions>,
  state: { keyCount: number; nodeCount: number; depthExceeded: boolean; nodeExceeded: boolean }
): Json | undefined {
  if (state.nodeCount >= limits.maxNodes) {
    state.nodeExceeded = true;
    return undefined;
  }
  state.nodeCount += 1;

  if (value === null) return null;

  if (typeof value === "string") {
    return value.slice(0, limits.maxStringLength);
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value !== "object") {
    return undefined;
  }

  if (depth >= limits.maxDepth) {
    state.depthExceeded = true;
    return undefined;
  }

  if (Array.isArray(value)) {
    const out: Json[] = [];
    for (const item of value.slice(0, limits.maxArrayLength)) {
      const sanitized = sanitizeJsonValue(item, depth + 1, limits, state);
      if (sanitized !== undefined) {
        out.push(sanitized);
      }
      if (state.nodeExceeded || state.depthExceeded) break;
    }
    return out;
  }

  const result: Record<string, Json | undefined> = {};
  const entries = Object.entries(value as Record<string, unknown>);
  for (const [key, childValue] of entries) {
    if (UNSAFE_KEYS.has(key)) {
      continue;
    }
    if (state.keyCount >= limits.maxKeys) {
      break;
    }
    state.keyCount += 1;

    const safeKey = key.slice(0, 128);
    if (safeKey.length === 0) {
      continue;
    }

    const sanitized = sanitizeJsonValue(childValue, depth + 1, limits, state);
    if (sanitized !== undefined) {
      result[safeKey] = sanitized;
    }
    if (state.nodeExceeded || state.depthExceeded) break;
  }

  return result;
}

export function sanitizeAnalyticsParams(
  value: unknown,
  options: AnalyticsSanitizeOptions = {}
): ValidationResult<EventParams> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: true, value: {} };
  }

  const limits: Required<AnalyticsSanitizeOptions> = {
    maxDepth: options.maxDepth ?? 4,
    maxKeys: options.maxKeys ?? 40,
    maxNodes: options.maxNodes ?? 300,
    maxArrayLength: options.maxArrayLength ?? 25,
    maxStringLength: options.maxStringLength ?? 500,
    maxRootKeys: options.maxRootKeys ?? 25,
  };

  const rootEntries = Object.keys(value as Record<string, unknown>);
  if (rootEntries.length > limits.maxRootKeys) {
    return { ok: false, message: "eventParams has too many top-level keys." };
  }

  const state = {
    keyCount: 0,
    nodeCount: 0,
    depthExceeded: false,
    nodeExceeded: false,
  };

  const sanitized = sanitizeJsonValue(value, 0, limits, state);
  if (!sanitized || typeof sanitized !== "object" || Array.isArray(sanitized)) {
    return { ok: true, value: {} };
  }

  if (state.depthExceeded) {
    return { ok: false, message: "eventParams nesting is too deep." };
  }
  if (state.nodeExceeded) {
    return { ok: false, message: "eventParams is too large." };
  }

  return { ok: true, value: sanitized as EventParams };
}

export function badRequestResponse(message: string): NextResponse {
  return badRequest(message);
}
