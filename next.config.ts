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
  // Exclude WASM-heavy packages from server bundling
  serverExternalPackages: ["libraw-wasm", "@ffmpeg/ffmpeg", "@ffmpeg/util"],
  // Skip TypeScript errors during build (handled by tsc --noEmit separately)
  typescript: {
    ignoreBuildErrors: true,
  },
  // Image optimization settings
  images: {
    remotePatterns: [],
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
