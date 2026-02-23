"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { User, Session, Provider } from "@supabase/supabase-js";
import type { User as DbUser, SubscriptionTier } from "@/types/database";

interface AuthContextType {
  user: User | null;
  dbUser: DbUser | null;
  session: Session | null;
  loading: boolean;
  subscriptionTier: SubscriptionTier;
  signIn: (provider: string, callbackPath?: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    fullName?: string
  ) => Promise<{ requiresEmailVerification: boolean }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

function normalizeOrigin(candidate: string | undefined | null): string | null {
  if (!candidate) return null;
  try {
    return new URL(candidate).origin;
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

function sanitizeCallbackPath(path: string | undefined): string {
  const trimmed = path?.trim();
  if (!trimmed || trimmed === "/") return "/";
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return "/";
  return trimmed;
}

function buildAuthCallbackUrl(callbackPath?: string): string {
  const browserOrigin = window.location.origin;
  const envOrigin = normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL);
  const preferredOrigin =
    isLocalOrigin(browserOrigin) && envOrigin && !isLocalOrigin(envOrigin)
      ? envOrigin
      : browserOrigin;

  const callbackUrl = new URL("/auth/callback", preferredOrigin);
  const nextPath = sanitizeCallbackPath(callbackPath);
  if (nextPath !== "/") {
    callbackUrl.searchParams.set("next", nextPath);
  }
  return callbackUrl.toString();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = getSupabaseClient();

  const fetchDbUser = useCallback(async (userId: string): Promise<DbUser | null> => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching user:", error);
        return null;
      }

      return data as DbUser | null;
    } catch (err) {
      console.error("Error in fetchDbUser:", err);
      return null;
    }
  }, [supabase]);

  const refreshUser = useCallback(async () => {
    if (user?.id) {
      const userData = await fetchDbUser(user.id);
      setDbUser(userData);
    }
  }, [user?.id, fetchDbUser]);

  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();

        setSession(initialSession);
        setUser(initialSession?.user ?? null);

        if (initialSession?.user) {
          const userData = await fetchDbUser(initialSession.user.id);
          setDbUser(userData);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          const userData = await fetchDbUser(newSession.user.id);
          setDbUser(userData);
        } else {
          setDbUser(null);
        }

        // Handle specific auth events
        if (event === "SIGNED_IN") {
          // User signed in
        } else if (event === "SIGNED_OUT") {
          setDbUser(null);
        } else if (event === "TOKEN_REFRESHED") {
          // Token was refreshed
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, fetchDbUser]);

  const signIn = async (provider: string, callbackPath?: string) => {
    try {
      const redirectTo = buildAuthCallbackUrl(callbackPath);
      const normalizedProvider = provider as Provider;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: normalizedProvider,
        options: {
          redirectTo,
          scopes: getProviderScopes(provider),
        },
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error("Sign in error:", error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error("Email sign in error:", error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: buildAuthCallbackUrl("/"),
        },
      });

      if (error) {
        throw error;
      }

      return {
        requiresEmailVerification: !data.session,
      };
    } catch (error) {
      console.error("Sign up error:", error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      setUser(null);
      setDbUser(null);
      setSession(null);
    } catch (error) {
      console.error("Sign out error:", error);
      throw error;
    }
  };

  const value = {
    user,
    dbUser,
    session,
    loading,
    subscriptionTier: dbUser?.subscription_tier ?? "free",
    signIn,
    signInWithEmail,
    signUp,
    signOut,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Helper function to get OAuth scopes for different providers
function getProviderScopes(provider: string): string | undefined {
  switch (provider) {
    case "google":
      return "email profile";
    case "github":
      return "read:user user:email";
    default:
      return undefined;
  }
}
