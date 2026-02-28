import type { NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";

function resolveNextAuthSecret(): string {
  const configured =
    process.env.NEXTAUTH_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim();

  if (configured) {
    return configured;
  }

  // Build phase (next build) and local dev can run without production secrets.
  // At runtime in production, NextAuth will still reject unauthenticated requests
  // because OAuth providers won't have valid client IDs/secrets.
  if (
    process.env.CI === "true" ||
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PHASE === "phase-production-build"
  ) {
    return "dev-only-nextauth-secret";
  }

  throw new Error("NEXTAUTH_SECRET environment variable is required in production");
}

export const authOptions: NextAuthOptions = {
  providers: [
    // GitHub OAuth Provider
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID ?? "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
    }),
    // Google OAuth Provider
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: resolveNextAuthSecret(),
};
