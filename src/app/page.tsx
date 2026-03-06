"use client";

import Link from "next/link";
import { Header } from "@/components/layout";
import { Button, Card, DropZone } from "@/components/ui";
import { useEditorStore } from "@/stores/editorStore";
import { AI_ENABLED } from "@/lib/featureFlags";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import type { MediaFile, MediaType } from "@/types";
import {
  VideoCamera,
  Image as ImageIcon,
  Lightbulb,
  Check,
  ArrowRight,
  CloudArrowUp,
  PuzzlePiece,
  DownloadSimple,
  PlayCircle,
  MusicNote,
  Lock,
  Lightning,
  Globe,
  Package,
  Resize,
  Scissors,
  ArrowsClockwise,
  Palette,
  ArrowsCounterClockwise,
  Info,
} from "@phosphor-icons/react";

export default function HomePage() {
  const router = useRouter();
  const { createProject, addMediaFile, setCurrentImage } = useEditorStore();
  const [scrollProgress, setScrollProgress] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const heroRef = useRef<HTMLDivElement>(null);

  // Scroll progress indicator
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (window.scrollY / totalHeight) * 100;
      setScrollProgress(progress);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Mouse parallax effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
        const y = (e.clientY - rect.top - rect.height / 2) / rect.height;
        setMousePosition({ x, y });
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      createProject("新規プロジェクト");

      // Determine if files are primarily images or videos
      let hasVideo = false;
      let hasImage = false;
      let firstImageFile: MediaFile | null = null;

      for (const file of files) {
        const mediaType: MediaType = file.type.startsWith("video/")
          ? "video"
          : file.type.startsWith("audio/")
          ? "audio"
          : "image";

        if (mediaType === "video") hasVideo = true;
        if (mediaType === "image") hasImage = true;

        const url = URL.createObjectURL(file);

        const mediaFile: MediaFile = {
          id: uuidv4(),
          name: file.name,
          type: mediaType,
          mimeType: file.type,
          size: file.size,
          url,
          blob: file,
          createdAt: new Date(),
        };

        // Get image dimensions if it's an image
        if (mediaType === "image") {
          const img = new Image();
          img.src = url;
          await new Promise<void>((resolve) => {
            img.onload = () => {
              mediaFile.width = img.naturalWidth;
              mediaFile.height = img.naturalHeight;
              mediaFile.thumbnail = url;
              resolve();
            };
            img.onerror = () => resolve();
          });

          // Store the first image file for setting as current
          if (!firstImageFile) {
            firstImageFile = mediaFile;
          }
        }

        addMediaFile(mediaFile);
      }

      // Smart routing: go to appropriate editor based on file type
      if (hasVideo) {
        router.push("/editor");
      } else if (hasImage && firstImageFile) {
        // Set the first image as current so it opens immediately in editor
        setCurrentImage(firstImageFile);
        router.push("/image");
      } else {
        router.push("/editor"); // Default to video editor for audio
      }
    },
    [createProject, addMediaFile, setCurrentImage, router]
  );

  const features = [
    {
      icon: <VideoCamera size={32} weight="duotone" />,
      title: "動画編集",
      description: "トリミング、結合、フォーマット変換。タイムラインベースの直感的なインターフェースで、プロ級の動画編集を。",
      features: ["カット・トリミング", "フォーマット変換", "音声抽出"],
    },
    {
      icon: <ImageIcon size={32} weight="duotone" />,
      title: "画像編集",
      description: "明るさ、コントラスト、彩度などの調整からフィルター適用まで。リアルタイムプレビューで思い通りの仕上がりに。",
      features: ["フィルター・エフェクト", "リサイズ・クロップ", "形式変換"],
    },
    {
      icon: <Lightbulb size={32} weight="duotone" />,
      title: "AI機能",
      description: "最先端のAI技術で高画質化、背景削除、カラー化を実現。ワンクリックでプロ品質の仕上がり。",
      features: ["AI高画質化", "背景自動削除", "カラー化"],
      badge: AI_ENABLED ? undefined : "Coming Soon",
      cta: AI_ENABLED ? { label: "今すぐ試す", href: "/subscription" } : undefined,
    },
  ];

  const tools = [
    { name: "圧縮", icon: <Package size={32} weight="duotone" />, href: "/tools/compress", description: "高品質を保ちながらファイルサイズを削減" },
    { name: "リサイズ", icon: <Resize size={32} weight="duotone" />, href: "/tools/resize", description: "任意のサイズに画像をリサイズ" },
    { name: "クロップ", icon: <Scissors size={32} weight="duotone" />, href: "/tools/crop", description: "必要な部分だけを切り取り" },
    { name: "変換", icon: <ArrowsClockwise size={32} weight="duotone" />, href: "/convert", description: "動画・画像を様々な形式に変換" },
    { name: "フィルター", icon: <Palette size={32} weight="duotone" />, href: "/tools/filter", description: "10種類以上のプリセットフィルター" },
    { name: "回転/反転", icon: <ArrowsCounterClockwise size={32} weight="duotone" />, href: "/tools/rotate", description: "90度回転や左右上下反転" },
  ];

  const stats = [
    { value: "100%", label: "ローカル処理", description: "サーバーにアップロードしない" },
    { value: "2GB", label: "最大ファイルサイズ", description: "大容量ファイルも処理可能" },
    { value: "無料", label: "基本無料", description: "編集機能は完全無料" },
    { value: "0秒", label: "待ち時間", description: "登録不要ですぐ使える" },
  ];

  const howItWorks = [
    {
      step: "01",
      title: "ファイルを選択",
      description: "編集したいファイルをドラッグ＆ドロップ、または選択します",
      icon: <CloudArrowUp size={40} weight="duotone" />,
    },
    {
      step: "02",
      title: "編集する",
      description: "直感的なツールで自由に編集。リアルタイムプレビューで確認",
      icon: <PuzzlePiece size={40} weight="duotone" />,
    },
    {
      step: "03",
      title: "ダウンロード",
      description: "編集完了後、ワンクリックでダウンロード。即座に利用可能",
      icon: <DownloadSimple size={40} weight="duotone" />,
    },
  ];

  const formatCategories = [
    {
      title: "動画",
      formats: [
        { name: "MP4", desc: "最も互換性の高い動画形式。H.264/H.265コーデック対応" },
        { name: "WebM", desc: "Web最適化形式。VP9コーデックで高圧縮" },
        { name: "MOV", desc: "Apple開発の高品質形式。ProRes対応" },
        { name: "AVI", desc: "Windows標準形式。非圧縮にも対応" },
        { name: "MKV", desc: "多トラック対応のオープン形式。字幕埋め込み可" },
        { name: "FLV", desc: "Flash Video形式。ストリーミング向け" },
        { name: "WMV", desc: "Windows Media形式。DRM対応" },
        { name: "MPEG", desc: "標準動画形式。DVD等で広く使用" },
        { name: "3GP", desc: "モバイル向け軽量動画形式" },
        { name: "GIF", desc: "アニメーション対応。256色制限" },
      ],
      icon: <PlayCircle size={32} weight="duotone" />,
    },
    {
      title: "画像",
      formats: [
        { name: "PNG", desc: "可逆圧縮 / 透過対応。ロゴやイラストに最適" },
        { name: "JPG", desc: "非可逆圧縮 / 写真向け。最も汎用的な形式" },
        { name: "WebP", desc: "Google開発の次世代形式。高圧縮+透過対応" },
        { name: "AVIF", desc: "最新の高圧縮形式。WebPより更に小さいサイズ" },
        { name: "GIF", desc: "アニメーション対応。256色制限あり" },
        { name: "SVG", desc: "ベクター形式。拡大しても劣化しない" },
        { name: "HEIC", desc: "Apple標準形式。JPGの約半分のサイズ" },
        { name: "RAW", desc: "カメラ生データ。最高品質の編集が可能" },
        { name: "BMP", desc: "無圧縮ビットマップ。Windows標準" },
        { name: "TIFF", desc: "高品質印刷向け。レイヤー・透過対応" },
        { name: "ICO", desc: "アイコン形式。Webサイトfavicon等に使用" },
      ],
      icon: <ImageIcon size={32} weight="duotone" />,
    },
    {
      title: "音声",
      formats: [
        { name: "MP3", desc: "最も汎用的な音声形式。高い互換性" },
        { name: "WAV", desc: "非圧縮音声。最高音質だがサイズ大" },
        { name: "OGG", desc: "オープンソースの圧縮形式。Web向け" },
        { name: "AAC", desc: "MP3後継の高音質形式。Apple標準" },
        { name: "FLAC", desc: "可逆圧縮。CD品質を完全保持" },
        { name: "M4A", desc: "AAC音声のコンテナ形式。iTunes標準" },
        { name: "AIFF", desc: "Apple非圧縮形式。プロ音楽制作向け" },
        { name: "WMA", desc: "Windows Media Audio。DRM対応" },
      ],
      icon: <MusicNote size={32} weight="duotone" />,
    },
  ];

  return (
    <div className="min-h-screen w-full bg-[var(--color-bg)] overflow-x-hidden">
      {/* Scroll Progress */}
      <div
        className="scroll-progress"
        style={{ transform: `scaleX(${scrollProgress / 100})` }}
      />

      <Header />

      <main className="w-full">
        {/* Hero Section */}
        <section
          ref={heroRef}
          className="relative min-h-screen flex items-center justify-center overflow-hidden hero-gradient"
        >
          {/* Animated Background Elements */}
          <div className="absolute inset-0 -z-10">
            {/* Grid Pattern */}
            <div className="absolute inset-0 grid-pattern" />

            {/* Floating Orbs with Parallax */}
            <div
              className="orb w-[500px] h-[500px] bg-[var(--color-accent)]/20 top-1/4 left-1/4 -translate-x-1/2"
              style={{
                transform: `translate(${mousePosition.x * 30}px, ${mousePosition.y * 30}px)`,
              }}
            />
            <div
              className="orb w-[400px] h-[400px] bg-[var(--color-accent)]/15 bottom-1/4 right-1/4 translate-x-1/2"
              style={{
                transform: `translate(${mousePosition.x * -20}px, ${mousePosition.y * -20}px)`,
              }}
            />
            <div
              className="orb w-[300px] h-[300px] bg-[var(--color-accent)]/10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{
                transform: `translate(${mousePosition.x * 15}px, ${mousePosition.y * 15}px)`,
              }}
            />

            {/* Gradient Glow - Centered */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-[var(--color-accent)]/10 via-[var(--color-accent)]/5 to-transparent blur-3xl" />
          </div>

          <div className="relative z-10 w-full flex justify-center py-28 sm:py-36">
            <div className="w-full max-w-5xl px-8 sm:px-12 lg:px-20 text-center">
              {/* Badge */}
              <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full glass-card mb-12 stagger-item">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-success)] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--color-success)]"></span>
                </span>
                <span className="text-sm font-medium text-[var(--color-text)]">
                  完全無料・登録不要で今すぐ使える
                </span>
              </div>

              {/* Main Heading */}
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-8 sm:mb-12 stagger-item">
                <span className="block text-[var(--color-text)] mb-2 sm:mb-4">ブラウザだけで</span>
                <span className="block gradient-text-animated">プロ級編集</span>
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-xl lg:text-2xl text-[var(--color-text-muted)] max-w-2xl mx-auto mb-10 sm:mb-16 stagger-item leading-relaxed px-2 sm:px-0">
                動画トリミング、画像編集、AI高画質化まで。
                <br className="hidden sm:block" />
                <span className="font-semibold text-[var(--color-text)]">
                  サーバーにアップロードしない
                </span>
                から、プライバシーも安心。
              </p>

              {/* Quick Upload - Both video and image supported */}
              <div className="max-w-2xl mx-auto mb-16 stagger-item">
                <div className="relative group">
                  <div className="absolute -inset-2 bg-gradient-to-r from-[var(--color-accent)] via-[var(--color-accent-hover)] to-[var(--color-accent)] rounded-3xl blur-xl opacity-20 group-hover:opacity-35 transition-opacity duration-500" />
                  <div className="relative">
                    <DropZone
                      onFilesSelected={handleFilesSelected}
                      accept="all"
                      className="!border-2 !border-dashed !border-[var(--color-border)] hover:!border-[var(--color-accent)] transition-colors !py-14 !px-8"
                    />
                    <p className="text-sm text-[var(--color-text-muted)] mt-4 text-center">
                      動画・画像どちらもOK！自動で適切なエディタに移動します
                    </p>
                  </div>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-4 sm:gap-6 stagger-item px-4 sm:px-0">
                <Link href="/editor">
                  <Button
                    size="lg"
                    variant="primary"
                    icon={<VideoCamera size={20} />}
                    className="w-full sm:w-auto !px-10 !py-5 !h-auto !text-base !rounded-2xl hover:scale-105 transition-transform"
                  >
                    動画エディタを開く
                  </Button>
                </Link>
                <Link href="/image">
                  <Button
                    size="lg"
                    variant="secondary"
                    icon={<ImageIcon size={20} />}
                    className="w-full sm:w-auto !px-10 !py-5 !h-auto !text-base !rounded-2xl hover:scale-105 transition-transform"
                  >
                    画像エディタを開く
                  </Button>
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap justify-center items-center gap-8 sm:gap-12 mt-16 stagger-item">
                {[
                  { icon: <Lock size={24} weight="duotone" />, text: "100%ローカル処理" },
                  { icon: <Lightning size={24} weight="duotone" />, text: "超高速処理" },
                  { icon: <Check size={24} weight="duotone" />, text: "完全無料" },
                  { icon: <Globe size={24} weight="duotone" />, text: "登録不要" },
                ].map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 text-[var(--color-text-muted)]"
                  >
                    <span className="text-[var(--color-accent)]">{item.icon}</span>
                    <span className="text-sm font-medium">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3">
            <span className="text-sm text-[var(--color-text-muted)]">スクロール</span>
            <div className="w-6 h-10 rounded-full border-2 border-[var(--color-border)] flex justify-center pt-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-muted)] animate-bounce" />
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-32 bg-[var(--color-bg)]">
          <div className="w-full flex justify-center">
            <div className="w-full max-w-5xl px-8 sm:px-12 lg:px-20">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-10">
              {stats.map((stat, index) => (
                <Card key={index} padding="lg" className="text-center">
                  <div className="text-4xl sm:text-5xl font-bold text-[var(--color-accent)] mb-3">
                    {stat.value}
                  </div>
                  <div className="text-lg font-semibold text-[var(--color-text)] mb-2">
                    {stat.label}
                  </div>
                  <div className="text-sm text-[var(--color-text-muted)]">
                    {stat.description}
                  </div>
                </Card>
              ))}
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-36 relative overflow-hidden">
          <div className="absolute inset-0 hero-gradient opacity-50" />

          <div className="relative w-full flex justify-center">
            <div className="w-full max-w-5xl px-8 sm:px-12 lg:px-20">
              <div className="text-center mb-20">
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[var(--color-text)] mb-8">
                パワフルな機能を
                <span className="gradient-text">シンプル</span>に
              </h2>
              <p className="text-xl text-[var(--color-text-muted)] max-w-2xl mx-auto">
                プロフェッショナルな編集機能を、誰でも簡単に使えるインターフェースで
              </p>
            </div>

              <div className="grid lg:grid-cols-3 gap-8 lg:gap-10">
                {features.map((feature, index) => (
                <Card
                  key={index}
                  interactive
                  padding="lg"
                  className="relative group h-full !p-10"
                >
                    {feature.badge && (
                      <div className="absolute top-6 right-6 px-4 py-1.5 rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent-text)] text-xs font-semibold">
                        {feature.badge}
                      </div>
                    )}

                    <div className="w-18 h-18 rounded-2xl bg-[var(--color-accent-soft)] flex items-center justify-center text-[var(--color-accent)] mb-8 group-hover:scale-110 transition-transform duration-300">
                      {feature.icon}
                    </div>

                    <h3 className="text-2xl font-bold text-[var(--color-text)] mb-5">
                      {feature.title}
                    </h3>

                    <p className="text-[var(--color-text-muted)] mb-8 leading-relaxed">
                      {feature.description}
                    </p>

                    <ul className="space-y-4">
                      {feature.features.map((item, i) => (
                        <li key={i} className="flex items-center gap-4 text-[var(--color-text)]">
                          <Check size={20} weight="bold" className="text-[var(--color-success)] flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>

                    {feature.cta && (
                      <Link
                        href={feature.cta.href}
                        className="mt-8 inline-flex items-center gap-2"
                      >
                        <Button
                          size="sm"
                          variant="primary"
                          icon={<ArrowRight size={16} />}
                        >
                          {feature.cta.label}
                        </Button>
                      </Link>
                    )}
                </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Tools Grid Section */}
        <section className="py-36 bg-[var(--color-bg)]">
          <div className="w-full flex justify-center">
            <div className="w-full max-w-5xl px-8 sm:px-12 lg:px-20">
              <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-bold text-[var(--color-text)] mb-8">
                画像編集ツール
              </h2>
              <p className="text-xl text-[var(--color-text-muted)] max-w-2xl mx-auto">
                必要なツールをクリックするだけ。すべてブラウザ内で完結します。
              </p>
            </div>

              <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-5">
                {tools.map((tool, index) => (
                  <Link key={index} href={tool.href}>
                    <Card interactive className="text-center !p-6">
                      <div className="text-[var(--color-accent)] mb-4 flex justify-center group-hover:scale-125 transition-transform duration-300">
                        {tool.icon}
                      </div>
                      <h3 className="font-semibold text-[var(--color-text)] mb-2">
                        {tool.name}
                      </h3>
                      <p className="text-xs text-[var(--color-text-muted)] line-clamp-2">
                        {tool.description}
                      </p>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-36">
          <div className="w-full flex justify-center">
            <div className="w-full max-w-5xl px-8 sm:px-12 lg:px-20">
              <div className="text-center mb-20">
              <h2 className="text-4xl sm:text-5xl font-bold text-[var(--color-text)] mb-8">
                シンプルな<span className="gradient-text">3ステップ</span>
              </h2>
              <p className="text-xl text-[var(--color-text-muted)]">
                複雑な操作は一切不要
              </p>
            </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12 lg:gap-16">
                {howItWorks.map((item, index) => (
                <div key={index} className="relative text-center group">
                  {index < 2 && (
                    <div className="hidden md:block absolute top-20 left-[60%] w-[80%] h-0.5">
                      <div className="w-full h-full bg-gradient-to-r from-[var(--color-accent)]/50 to-transparent" />
                    </div>
                  )}
                  <div className="relative z-10">
                    <div className="w-28 h-28 mx-auto mb-10 bg-[var(--color-accent)] rounded-3xl flex items-center justify-center text-[var(--color-text-inverse)] shadow-2xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                      {item.icon}
                    </div>
                    <div className="absolute -top-3 -right-3 w-12 h-12 bg-[var(--color-accent-hover)] rounded-full flex items-center justify-center text-[var(--color-text-inverse)] text-sm font-bold shadow-lg left-1/2 ml-10">
                      {item.step}
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-[var(--color-text)] mb-5">
                    {item.title}
                  </h3>
                  <p className="text-[var(--color-text-muted)] max-w-xs mx-auto leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
              </div>
            </div>
          </div>
        </section>

        {/* Supported Formats */}
        <section className="py-36 bg-[var(--color-surface)] border-t border-b border-[var(--color-border)]">
          <div className="w-full flex justify-center">
            <div className="w-full max-w-5xl px-8 sm:px-12 lg:px-20">
              <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-bold text-[var(--color-text)] mb-8">
                対応フォーマット
              </h2>
              <p className="text-xl text-[var(--color-text-muted)] max-w-2xl mx-auto">
                主要なメディアフォーマットをすべてサポート
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12">
              {formatCategories.map((category, index) => (
                <Card key={index} padding="lg" className="text-center">
                  <div className="w-24 h-24 mx-auto mb-8 bg-[var(--color-accent-soft)] rounded-2xl flex items-center justify-center text-[var(--color-accent)] shadow-[var(--shadow-lg)]">
                    {category.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-[var(--color-text)] mb-8">{category.title}</h3>
                  <div className="flex flex-wrap justify-center gap-2.5 sm:gap-3">
                    {category.formats.map((format, i) => (
                      <span
                        key={i}
                        className="group relative px-3.5 py-2 sm:px-5 sm:py-2.5 bg-[var(--color-accent-soft)] text-[var(--color-accent-text)] rounded-full text-xs sm:text-sm font-medium hover:bg-[var(--color-accent)] hover:text-[var(--color-text-inverse)] transition-colors cursor-default"
                      >
                        {format.name}
                        {/* Tooltip - hidden on mobile, visible on hover for desktop */}
                        <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs text-[var(--color-text-inverse)] bg-[var(--color-text)] rounded-[var(--radius-md)] shadow-[var(--shadow-lg)] opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10 hidden sm:block">
                          {format.desc}
                          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[var(--color-text)]" />
                        </span>
                      </span>
                    ))}
                  </div>
                </Card>
              ))}
              </div>
            </div>
          </div>
        </section>

        {/* Browser Notice */}
        <section className="py-20 bg-[var(--color-warning-soft)]">
          <div className="w-full flex justify-center">
            <div className="w-full max-w-4xl px-8 sm:px-12 lg:px-20">
            <Card padding="lg" className="flex items-start gap-6 sm:gap-8 !p-8 sm:!p-10">
              <div className="flex-shrink-0 w-16 h-16 bg-[var(--color-warning)] rounded-2xl flex items-center justify-center shadow-[var(--shadow-lg)]">
                <Info size={32} weight="bold" className="text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[var(--color-text)] mb-4">
                  ブラウザ要件
                </h3>
                <p className="text-[var(--color-text-muted)] leading-relaxed">
                  本アプリケーションはWebAssembly (SharedArrayBuffer) を使用しています。
                  <strong className="text-[var(--color-text)]"> Chrome, Firefox, Edge </strong>
                  の最新版で最適な動作が期待できます。Safari は一部機能が制限される場合があります。
                </p>
              </div>
            </Card>
          </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-36 relative overflow-hidden">
          <div className="absolute inset-0 mesh-gradient opacity-50" />

          <div className="relative w-full flex justify-center">
            <div className="w-full max-w-4xl px-8 sm:px-12 lg:px-20 text-center">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[var(--color-text)] mb-12">
              今すぐ
              <span className="gradient-text">無料</span>
              で始めよう
            </h2>
            <p className="text-xl text-[var(--color-text-muted)] mb-14 max-w-2xl mx-auto leading-relaxed">
              登録不要、インストール不要。ブラウザを開くだけで、
              プロフェッショナルなメディア編集を体験できます。
            </p>
              <div className="flex flex-wrap justify-center gap-6">
                <Link href="/editor">
                  <Button
                    size="lg"
                    variant="primary"
                    icon={<ArrowRight size={20} />}
                    className="!px-12 !py-6 !h-auto !text-lg !rounded-2xl shadow-2xl hover:scale-105 transition-transform"
                  >
                    無料で始める
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[var(--color-surface)] border-t border-[var(--color-border)] py-24">
        <div className="w-full flex justify-center">
          <div className="w-full max-w-5xl px-8 sm:px-12 lg:px-20">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 sm:gap-12 mb-16">
            {/* Logo & Description */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 bg-[var(--color-accent)] rounded-xl flex items-center justify-center shadow-[var(--shadow-lg)]">
                  <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none">
                    <path d="M3 19V5l6 7 6-7v14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="20" cy="5" r="1.5" fill="currentColor" opacity="0.8"/>
                    <circle cx="18" cy="9" r="0.8" fill="currentColor" opacity="0.5"/>
                  </svg>
                </div>
                <span className="font-bold text-2xl text-[var(--color-text)]">MediEdi!</span>
              </div>
              <p className="text-[var(--color-text-muted)] leading-relaxed max-w-md">
                プライバシー重視のブラウザ内メディア編集プラットフォーム。
                全ての処理はあなたのブラウザ内で完結し、ファイルがサーバーに送信されることはありません。
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold text-lg text-[var(--color-text)] mb-6">ツール</h4>
              <ul className="space-y-4">
                {[
                  { name: "動画エディタ", href: "/editor" },
                  { name: "画像エディタ", href: "/image" },
                  { name: "変換ツール", href: "/convert" },
                  { name: "圧縮ツール", href: "/tools/compress" },
                ].map((link, i) => (
                  <li key={i}>
                    <Link href={link.href} className="text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold text-lg text-[var(--color-text)] mb-6">その他</h4>
              <ul className="space-y-4">
                {[
                  { name: "プライバシーポリシー", href: "/privacy" },
                  { name: "利用規約", href: "/terms" },
                  { name: "特定商取引法に基づく表記", href: "/tokushoho" },
                  { name: "お問い合わせ", href: "/contact" },
                ].map((link, i) => (
                  <li key={i}>
                    <Link href={link.href} className="text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-[var(--color-border)] pt-10">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <p className="text-[var(--color-text-muted)] text-sm">
                Powered by FFmpeg.wasm - 全ての処理はブラウザ内で実行されます
              </p>
              <p className="text-[var(--color-text-muted)] text-sm">
                &copy; {new Date().getFullYear()} MediEdi! All rights reserved.
              </p>
            </div>
          </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
