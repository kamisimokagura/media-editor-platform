import type { NextConfig } from "next";
import path from "path";

/**
 * Build CSP header string from security.ts directives.
 * Inline here to avoid importing TS module in config context.
 */
const cspDirectives: Record<string, string[]> = {
  "default-src": ["'self'"],
  "script-src": ["'self'", "'unsafe-eval'", "https://js.stripe.com"],
  "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
  "font-src": ["'self'", "https://fonts.gstatic.com"],
  "img-src": ["'self'", "blob:", "data:"],
  "media-src": ["'self'", "blob:"],
  "connect-src": [
    "'self'",
    "https://unpkg.com",
    "https://cdn.jsdelivr.net",
    "https://api.stripe.com",
    "https://api.resend.com",
    "https://*.supabase.co",
  ],
  "worker-src": ["'self'", "blob:"],
  "frame-src": ["https://js.stripe.com"],
  "object-src": ["'none'"],
  "frame-ancestors": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
};

const cspHeader = Object.entries(cspDirectives)
  .map(([key, values]) => `${key} ${values.join(" ")}`)
  .join("; ");

const nextConfig: NextConfig = {
  // Set the correct root directory for Turbopack
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Security and CORS headers
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Required for SharedArrayBuffer (FFmpeg WASM)
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "require-corp",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          // CSP
          {
            key: "Content-Security-Policy",
            value: cspHeader,
          },
          // Additional security headers
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [];
  },
  // Optimize for client-side processing
  experimental: {
    optimizePackageImports: ["@ffmpeg/ffmpeg", "@ffmpeg/util"],
  },
  // Image optimization settings
  images: {
    remotePatterns: [],
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
