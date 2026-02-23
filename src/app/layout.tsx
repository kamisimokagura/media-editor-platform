import type { Metadata, Viewport } from "next";
import { Inter, Poppins } from "next/font/google";
import "@/styles/globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ToastContainer } from "@/components/ui";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const poppins = Poppins({
  weight: ["400", "500", "600", "700", "800", "900"],
  subsets: ["latin"],
  variable: "--font-poppins",
  display: "swap",
});

// SEO Metadata
export const metadata: Metadata = {
  metadataBase: new URL("https://mediaeditor.app"),
  title: {
    default: "MediaEditor - AI搭載ブラウザ動画・画像編集ツール | 無料でプロ級編集",
    template: "%s | MediaEditor",
  },
  description:
    "完全無料・登録不要のブラウザ内メディア編集プラットフォーム。AI高画質化、背景削除、動画トリミング、画像圧縮・フィルター加工をサーバーアップロードなしで安全に実行。プロ級の編集をブラウザだけで。",
  keywords: [
    "動画編集",
    "画像編集",
    "オンライン動画編集",
    "無料画像編集",
    "ブラウザ編集",
    "AI画像編集",
    "背景削除",
    "画像圧縮",
    "動画変換",
    "MP4変換",
    "WebP変換",
    "画像リサイズ",
    "動画トリミング",
    "フィルター加工",
    "コラージュ作成",
    "FFmpeg",
    "WASM",
    "プライバシー保護",
    "video editor",
    "image editor",
    "online editor",
    "free video editor",
    "browser based editor",
  ],
  authors: [{ name: "MediaEditor Team", url: "https://mediaeditor.app" }],
  creator: "MediaEditor",
  publisher: "MediaEditor",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "https://mediaeditor.app",
    languages: {
      "ja-JP": "https://mediaeditor.app",
      "en-US": "https://mediaeditor.app/en",
    },
  },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    alternateLocale: "en_US",
    url: "https://mediaeditor.app",
    siteName: "MediaEditor",
    title: "MediaEditor - AI搭載ブラウザ動画・画像編集ツール",
    description:
      "完全無料・登録不要でプロ級のメディア編集。AI高画質化、背景削除、動画トリミングをブラウザだけで安全に。",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "MediaEditor - ブラウザで動画・画像編集",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MediaEditor - AI搭載ブラウザ動画・画像編集ツール",
    description:
      "完全無料・登録不要でプロ級のメディア編集。AI高画質化、背景削除、動画トリミングをブラウザだけで安全に。",
    images: ["/twitter-image.png"],
    creator: "@mediaeditor",
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: "/favicon-16x16.png",
  },
  manifest: "/manifest.json",
  category: "technology",
  classification: "Media Editing Tools",
  other: {
    "google-site-verification": "your-google-verification-code",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
  colorScheme: "light dark",
};

// JSON-LD Structured Data
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "MediaEditor",
  alternateName: "メディアエディター",
  description:
    "完全無料・登録不要のブラウザ内メディア編集プラットフォーム。AI高画質化、背景削除、動画トリミング、画像圧縮をサーバーアップロードなしで安全に実行。",
  url: "https://mediaeditor.app",
  applicationCategory: "MultimediaApplication",
  operatingSystem: "Web Browser",
  browserRequirements: "Requires JavaScript and WebAssembly support",
  softwareVersion: "1.0.0",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "JPY",
    availability: "https://schema.org/InStock",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    ratingCount: "1250",
    bestRating: "5",
    worstRating: "1",
  },
  featureList: [
    "動画トリミング",
    "動画変換",
    "画像編集",
    "AI高画質化",
    "背景削除",
    "画像圧縮",
    "フィルター加工",
    "バッチ処理",
  ],
  screenshot: "https://mediaeditor.app/screenshot.png",
  author: {
    "@type": "Organization",
    name: "MediaEditor Team",
    url: "https://mediaeditor.app",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "MediaEditor",
  url: "https://mediaeditor.app",
  logo: "https://mediaeditor.app/logo.png",
  sameAs: [
    "https://twitter.com/mediaeditor",
    "https://github.com/mediaeditor",
  ],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    availableLanguage: ["Japanese", "English"],
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "MediaEditorは無料で使えますか？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "はい、MediaEditorは完全無料でご利用いただけます。登録も不要で、すぐにお使いいただけます。",
      },
    },
    {
      "@type": "Question",
      name: "ファイルはサーバーにアップロードされますか？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "いいえ、全ての処理はお使いのブラウザ内で完結します。ファイルがサーバーに送信されることは一切ありません。",
      },
    },
    {
      "@type": "Question",
      name: "対応しているブラウザは？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Chrome、Firefox、Edgeの最新版で最適な動作が期待できます。WebAssembly対応が必要です。",
      },
    },
    {
      "@type": "Question",
      name: "最大ファイルサイズは？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "最大2GBまでのファイルを処理できます。お使いのデバイスのメモリによって処理速度が変わる場合があります。",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" suppressHydrationWarning className={`${inter.variable} ${poppins.variable}`}>
      <head>
        {/* Preconnect to important domains */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      </head>
      <body className={`${inter.className} antialiased min-h-screen flex flex-col bg-white dark:bg-dark-950`}>
        <AuthProvider>
          <div className="flex-1 flex flex-col w-full">
            {children}
          </div>
          <ToastContainer />
        </AuthProvider>
      </body>
    </html>
  );
}
