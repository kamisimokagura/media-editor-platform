/**
 * AI API input validation limits (Issue #11)
 * Centralized limits for all AI routes to prevent abuse/DoS.
 */

/** Max prompt length in characters */
export const MAX_PROMPT_LENGTH = 4000;

/** Max base64 image data length (~10MB encoded) */
export const MAX_IMAGE_DATA_LENGTH = 14_000_000;

/** Max chat messages per request */
export const MAX_CHAT_MESSAGES = 50;

/** Max single chat message content length */
export const MAX_CHAT_MESSAGE_LENGTH = 8000;

/** Allowed image MIME types */
const ALLOWED_IMAGE_MIMES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
]);

/** Validate prompt input */
export function validatePrompt(prompt: unknown): string | null {
  if (typeof prompt !== "string" || prompt.trim().length === 0) {
    return "prompt は必須です";
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return `prompt は${MAX_PROMPT_LENGTH}文字以内にしてください`;
  }
  return null;
}

/** Validate base64 image data */
export function validateImageData(data: unknown, fieldName = "image"): string | null {
  if (data === undefined || data === null) return null; // optional field
  if (typeof data !== "string") {
    return `${fieldName} は文字列である必要があります`;
  }
  if (data.length > MAX_IMAGE_DATA_LENGTH) {
    return `${fieldName} のサイズが大きすぎます（10MB以下にしてください）`;
  }
  return null;
}

/** Validate MIME type */
export function validateMimeType(mime: unknown, fieldName = "mimeType"): string | null {
  if (mime === undefined || mime === null) return null; // optional
  if (typeof mime !== "string") {
    return `${fieldName} は文字列である必要があります`;
  }
  if (!ALLOWED_IMAGE_MIMES.has(mime.toLowerCase())) {
    return `${fieldName} がサポートされていません。対応形式: PNG, JPEG, WebP, GIF`;
  }
  return null;
}

/** Validate chat messages array */
export function validateChatMessages(
  messages: unknown
): string | null {
  if (!Array.isArray(messages)) {
    return "messages は配列である必要があります";
  }
  if (messages.length === 0) {
    return "messages は1件以上必要です";
  }
  if (messages.length > MAX_CHAT_MESSAGES) {
    return `messages は${MAX_CHAT_MESSAGES}件以内にしてください`;
  }
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (!msg || typeof msg !== "object") {
      return `messages[${i}] が不正です`;
    }
    const content = (msg as Record<string, unknown>).content;
    if (typeof content !== "string") {
      return `messages[${i}].content は文字列である必要があります`;
    }
    if (content.length > MAX_CHAT_MESSAGE_LENGTH) {
      return `messages[${i}].content が長すぎます（${MAX_CHAT_MESSAGE_LENGTH}文字以内）`;
    }
  }
  return null;
}
