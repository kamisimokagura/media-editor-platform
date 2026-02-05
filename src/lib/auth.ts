import type { NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

// Note: In production, these should come from environment variables
// For demo purposes, we'll set up the structure

export const authOptions: NextAuthOptions = {
  providers: [
    // GitHub OAuth Provider
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    }),
    // Google OAuth Provider
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    // Demo/Development Credentials Provider
    CredentialsProvider({
      name: "Demo Account",
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "demo@example.com",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },
      async authorize(credentials) {
        // Demo account for development
        if (
          credentials?.email === "demo@example.com" &&
          credentials?.password === "demo123"
        ) {
          return {
            id: "demo-user-1",
            email: "demo@example.com",
            name: "Demo User",
            image: null,
          };
        }
        return null;
      },
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
  secret: process.env.NEXTAUTH_SECRET || "your-secret-key-change-in-production",
};
