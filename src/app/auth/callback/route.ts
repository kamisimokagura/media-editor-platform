import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/server";
import { getSafeOrigin } from "@/lib/api/origin";
import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

const EMAIL_OTP_TYPES = new Set<EmailOtpType>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

function isEmailOtpType(value: string | null): value is EmailOtpType {
  return Boolean(value && EMAIL_OTP_TYPES.has(value as EmailOtpType));
}

function sanitizeNextPath(value: string | null): string {
  const trimmed = value?.trim();
  if (!trimmed) return "/";
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return "/";
  return trimmed;
}

function redirectToSignIn(origin: string, errorMessage: string) {
  return NextResponse.redirect(
    `${origin}/auth/signin?error=${encodeURIComponent(errorMessage)}`
  );
}

async function syncUserProfile(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  user: {
    id: string;
    email?: string | null;
    user_metadata?: Record<string, unknown>;
  }
) {
  if (!user.email) return;

  const metadata = user.user_metadata ?? {};
  const fullName =
    typeof metadata.full_name === "string"
      ? metadata.full_name
      : typeof metadata.name === "string"
        ? metadata.name
        : null;
  const avatarUrl =
    typeof metadata.avatar_url === "string"
      ? metadata.avatar_url
      : typeof metadata.picture === "string"
        ? metadata.picture
        : null;

  const { error } = await supabase.from("users").upsert(
    {
      id: user.id,
      email: user.email,
      full_name: fullName,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) {
    console.error("Error syncing user profile:", error);
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const appOrigin = getSafeOrigin(request);
  const nextPath = sanitizeNextPath(searchParams.get("next"));
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const otpType = searchParams.get("type");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error) {
    console.error("OAuth error:", error, errorDescription);
    return redirectToSignIn(appOrigin, errorDescription || error);
  }

  const supabase = await createServerSupabaseClient();

  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error("Code exchange error:", exchangeError);
      return redirectToSignIn(appOrigin, exchangeError.message);
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await syncUserProfile(supabase, user);

      await trackServerEvent({
        request,
        eventName: ANALYTICS_EVENTS.SIGNIN_COMPLETE,
        eventParams: {
          method: "oauth",
          provider:
            typeof user.app_metadata?.provider === "string"
              ? user.app_metadata.provider
              : null,
        },
        pagePath: "/auth/callback",
        userId: user.id,
      });
    }

    return NextResponse.redirect(`${appOrigin}${nextPath}`);
  }

  if (tokenHash && isEmailOtpType(otpType)) {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      type: otpType,
      token_hash: tokenHash,
    });

    if (verifyError) {
      console.error("Email verification error:", verifyError);
      return redirectToSignIn(appOrigin, verifyError.message);
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await syncUserProfile(supabase, user);

      await trackServerEvent({
        request,
        eventName:
          otpType === "signup"
            ? ANALYTICS_EVENTS.SIGNUP_COMPLETE
            : ANALYTICS_EVENTS.SIGNIN_COMPLETE,
        eventParams: {
          method: "email_link",
          otp_type: otpType,
        },
        pagePath: "/auth/callback",
        userId: user.id,
      });
    }

    return NextResponse.redirect(`${appOrigin}${nextPath}`);
  }

  return NextResponse.redirect(`${appOrigin}/auth/signin`);
}
