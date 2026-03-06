"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { useEditorStore } from "@/stores/editorStore";
import { AI_ENABLED } from "@/lib/featureFlags";
import {
  Sparkle,
  Sun,
  Moon,
  CaretDown,
  CreditCard,
  SignOut,
  List,
  X,
  UserSwitch,
} from "@phosphor-icons/react";

const baseNavItems = [
  { href: "/editor", label: "動画編集" },
  { href: "/image", label: "画像編集" },
  { href: "/convert", label: "変換" },
];

const navItems = AI_ENABLED
  ? [...baseNavItems, { href: "/subscription", label: "プラン" }]
  : baseNavItems;

export function Header() {
  const { user, loading, signOut } = useAuth();
  const { darkMode, toggleDarkMode } = useEditorStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignIn = () => {
    router.push("/auth/signin");
  };

  const handleSignOut = async () => {
    setIsUserMenuOpen(false);
    setIsMobileMenuOpen(false);
    await signOut();
    router.refresh();
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-[var(--color-surface)]/80 backdrop-blur-lg border-b border-[var(--color-border)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5">
              <Sparkle
                weight="fill"
                className="w-8 h-8 text-[var(--color-accent)]"
              />
              <span className="font-bold text-xl text-[var(--color-text)] font-[var(--font-heading)]">
                MediEdi!
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-3 py-1.5 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-accent-soft)] rounded-[var(--radius-md)] transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={toggleDarkMode}
              className="p-2.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] rounded-[var(--radius-md)] hover:bg-[var(--color-accent-soft)] transition-colors"
              aria-label="ダークモード切替"
            >
              {darkMode ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>

            {loading ? (
              <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-border)] animate-pulse" />
            ) : user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen((prev) => !prev)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-accent-soft)] rounded-[var(--radius-md)] hover:bg-[var(--color-border)] transition-colors cursor-pointer"
                >
                  {user.user_metadata?.avatar_url ? (
                    <img
                      src={user.user_metadata.avatar_url}
                      alt={user.user_metadata?.full_name || "User"}
                      className="w-7 h-7 rounded-[var(--radius-sm)]"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-[var(--radius-sm)] bg-[var(--color-accent)] flex items-center justify-center text-white text-xs font-medium">
                      {user.email?.[0]?.toUpperCase() || "U"}
                    </div>
                  )}
                  <span className="hidden sm:block text-sm font-medium text-[var(--color-text)] max-w-[120px] truncate">
                    {user.user_metadata?.full_name?.split(" ")[0] ||
                      user.email?.split("@")[0] ||
                      "User"}
                  </span>
                  <CaretDown
                    className={`w-4 h-4 text-[var(--color-text-muted)] transition-transform ${isUserMenuOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {/* User dropdown menu */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] py-2 z-[60]">
                    {/* User info */}
                    <div className="px-4 py-3 border-b border-[var(--color-border)]">
                      <div className="flex items-center gap-3">
                        {user.user_metadata?.avatar_url ? (
                          <img
                            src={user.user_metadata.avatar_url}
                            alt={user.user_metadata?.full_name || "User"}
                            className="w-10 h-10 rounded-[var(--radius-md)]"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--color-accent)] flex items-center justify-center text-white text-sm font-medium">
                            {user.email?.[0]?.toUpperCase() || "U"}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[var(--color-text)] truncate">
                            {user.user_metadata?.full_name || "User"}
                          </p>
                          <p className="text-xs text-[var(--color-text-muted)] truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Menu items */}
                    <div className="py-1">
                      {AI_ENABLED && (
                        <Link
                          href="/subscription"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-accent-soft)] transition-colors"
                        >
                          <CreditCard className="w-4 h-4" />
                          サブスクリプション
                        </Link>
                      )}
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          router.push("/auth/signin");
                        }}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-accent-soft)] transition-colors"
                      >
                        <UserSwitch className="w-4 h-4" />
                        アカウント切替
                      </button>
                    </div>

                    {/* Logout */}
                    <div className="border-t border-[var(--color-border)] pt-1">
                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                      >
                        <SignOut className="w-4 h-4" />
                        ログアウト
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={handleSignIn}
                className="px-5 py-2 bg-[var(--color-accent)] text-white text-sm font-semibold rounded-[var(--radius-md)] hover:opacity-90 transition-opacity"
              >
                ログイン
              </button>
            )}

            <button
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              className="md:hidden p-2.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] rounded-[var(--radius-md)] hover:bg-[var(--color-accent-soft)] transition-colors"
              aria-label="メニュー"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <List className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-[var(--color-border)]">
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="px-3 py-2.5 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-accent-soft)] rounded-[var(--radius-md)] transition-colors"
                >
                  {item.label}
                </Link>
              ))}

              {/* Mobile auth section */}
              <div className="mt-2 pt-3 border-t border-[var(--color-border)]">
                {loading ? (
                  <div className="px-4 py-3">
                    <div className="h-5 w-24 bg-[var(--color-border)] rounded-[var(--radius-sm)] animate-pulse" />
                  </div>
                ) : user ? (
                  <>
                    <div className="px-4 py-2 mb-1">
                      <div className="flex items-center gap-3">
                        {user.user_metadata?.avatar_url ? (
                          <img src={user.user_metadata.avatar_url} alt="" className="w-8 h-8 rounded-[var(--radius-sm)]" />
                        ) : (
                          <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--color-accent)] flex items-center justify-center text-white text-xs font-medium">
                            {user.email?.[0]?.toUpperCase() || "U"}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[var(--color-text)] truncate">
                            {user.user_metadata?.full_name || user.email?.split("@")[0] || "User"}
                          </p>
                          <p className="text-xs text-[var(--color-text-muted)] truncate">{user.email}</p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        router.push("/auth/signin");
                      }}
                      className="w-full px-3 py-2.5 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-accent-soft)] rounded-[var(--radius-md)] transition-colors text-left"
                    >
                      アカウント切替
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="w-full px-3 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-[var(--radius-md)] transition-colors text-left"
                    >
                      ログアウト
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleSignIn();
                    }}
                    className="mx-4 w-[calc(100%-2rem)] py-2.5 bg-[var(--color-accent)] text-white text-sm font-semibold rounded-[var(--radius-md)] text-center"
                  >
                    ログイン
                  </button>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
