import { NextRequest, NextResponse } from "next/server";
import {
  badRequestResponse,
  optionalEmail,
  parseJsonBody,
  requireNonEmptyString,
  toOptionalString,
} from "@/lib/api/validation";

interface ContactRequestBody {
  name?: unknown;
  email?: unknown;
  message?: unknown;
}

const CONTACT_TO_EMAIL = "kamigaminosinri@gmail.com";
const RESEND_API_URL = "https://api.resend.com/emails";
const DEFAULT_CONTACT_FROM = "onboarding@resend.dev";

export async function POST(request: NextRequest) {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "お問い合わせ送信の設定が未完了です。RESEND_API_KEYを設定してください。" },
      { status: 503 }
    );
  }

  const parsedBody = await parseJsonBody(request, {
    invalidJsonMessage: "JSONリクエストの形式が不正です。",
  });
  if ("response" in parsedBody) {
    return parsedBody.response;
  }
  const body = parsedBody.value as ContactRequestBody;

  const nameCheck = requireNonEmptyString(body.name, "name", 120);
  if (!nameCheck.ok) {
    return badRequestResponse("お名前は必須です。");
  }

  const emailCheck = optionalEmail(body.email);
  if (!emailCheck.ok || !emailCheck.value) {
    return badRequestResponse("メールアドレスが不正です。");
  }

  const messageCheck = requireNonEmptyString(body.message, "message", 4000);
  if (!messageCheck.ok) {
    return badRequestResponse("お問い合わせ内容は必須です。");
  }

  const fromEmail = toOptionalString(process.env.CONTACT_FROM_EMAIL, 320) ?? DEFAULT_CONTACT_FROM;
  const submittedAt = new Date().toISOString();
  const subject = `[MediaEditor] お問い合わせ: ${nameCheck.value}`;
  const text = [
    "MediaEditor お問い合わせ",
    `Name: ${nameCheck.value}`,
    `Email: ${emailCheck.value}`,
    `Submitted At (UTC): ${submittedAt}`,
    "",
    "Message:",
    messageCheck.value,
  ].join("\n");

  try {
    const resendResponse = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [CONTACT_TO_EMAIL],
        subject,
        text,
      }),
      cache: "no-store",
    });

    let result: unknown = null;
    try {
      result = (await resendResponse.json()) as unknown;
    } catch {
      result = null;
    }

    if (!resendResponse.ok) {
      const errorMessage =
        typeof (result as { message?: unknown })?.message === "string"
          ? (result as { message: string }).message
          : "メール送信に失敗しました。";
      return NextResponse.json({ error: errorMessage }, { status: 502 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "メール送信中に予期しないエラーが発生しました。",
      },
      { status: 500 }
    );
  }
}
