import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Set the correct root directory for Turbopack
  turbopack: {
    root: path.resolve(__dirname),
  },
  // FFmpeg WASM requires these headers for SharedArrayBuffer
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "require-corp",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
        ],
      },
    ];
  },
  // Security headers
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
