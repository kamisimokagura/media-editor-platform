"use client";

import Link from "next/link";
import { Header } from "@/components/layout";
import { Button, Card, DropZone } from "@/components/ui";
import { useEditorStore } from "@/stores/editorStore";
import { AI_ENABLED } from "@/lib/featureFlags";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import type { MediaFile, MediaType } from "@/types";
import {
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
  const createProject = useEditorStore((state) => state.createProject);
  const addMediaFile = useEditorStore((state) => state.addMediaFile);
  const setCurrentImage = useEditorStore((state) => state.setCurrentImage);
  const scrollProgressRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const orbOneRef = useRef<HTMLDivElement>(null);
  const orbTwoRef = useRef<HTMLDivElement>(null);
  const orbThreeRef = useRef<HTMLDivElement>(null);
  const scrollFrameRef = useRef<number | null>(null);
  const parallaxFrameRef = useRef<number | null>(null);
  const pendingMousePositionRef = useRef({ x: 0, y: 0 });

  // Scroll progress indicator
  useEffect(() => {
    const updateScrollProgress = () => {
      scrollFrameRef.current = null;
      if (!scrollProgressRef.current) return;
      const totalHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress = totalHeight > 0 ? window.scrollY / totalHeight : 0;
      const clampedProgress = Math.max(0, Math.min(progress, 1));
      scrollProgressRef.current.style.transform = `scaleX(${clampedProgress})`;
    };

    const handleScroll = () => {
      if (scrollFrameRef.current !== null) return;
      scrollFrameRef.current =
        window.requestAnimationFrame(updateScrollProgress);
    };

    updateScrollProgress();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      if (scrollFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
      }
    };
  }, []);

  // Mouse parallax effect
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;

    const applyParallax = () => {
      parallaxFrameRef.current = null;
      const { x, y } = pendingMousePositionRef.current;
      if (orbOneRef.current) {
        orbOneRef.current.style.transform = `translate(${x * 30}px, ${y * 30}px)`;
      }
      if (orbTwoRef.current) {
        orbTwoRef.current.style.transform = `translate(${x * -20}px, ${y * -20}px)`;
      }
      if (orbThreeRef.current) {
        orbThreeRef.current.style.transform = `translate(${x * 15}px, ${y * 15}px)`;
      }
    };

    const scheduleParallax = () => {
      if (parallaxFrameRef.current !== null) return;
      parallaxFrameRef.current = window.requestAnimationFrame(applyParallax);
    };

    const handlePointerMove = (e: PointerEvent) => {
      const rect = hero.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      pendingMousePositionRef.current = {
        x: (e.clientX - rect.left - rect.width / 2) / rect.width,
        y: (e.clientY - rect.top - rect.height / 2) / rect.height,
      };
      scheduleParallax();
    };

    const handlePointerLeave = () => {
      pendingMousePositionRef.current = { x: 0, y: 0 };
      scheduleParallax();
    };

    applyParallax();
    hero.addEventListener("pointermove", handlePointerMove, { passive: true });
    hero.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      hero.removeEventListener("pointermove", handlePointerMove);
      hero.removeEventListener("pointerleave", handlePointerLeave);
      if (parallaxFrameRef.current !== null) {
        window.cancelAnimationFrame(parallaxFrameRef.current);
      }
    };
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
      if (hasImage && firstImageFile) {
        // Set the first image as current so it opens immediately in editor
        setCurrentImage(firstImageFile);
        router.push("/image");
      } else {
        // Video/audio files go to format converter
        router.push("/convert");
      }
    },
    [createProject, addMediaFile, setCurrentImage, router],
  );

  const features = [
    {
      icon: <ArrowsClockwise size={32} weight="duotone" />,
      title: "形式変換",
      description:
        "動画・画像・音声を様々なフォーマットに変換。MP4、WebM、PNG、JPG、WebPなど主要形式をすべてサポート。",
      features: [
        "動画フォーマット変換",
        "画像フォーマット変換",
        "音声抽出・変換",
      ],
    },
    {
      icon: <ImageIcon size={32} weight="duotone" />,
      title: "画像編集",
      description:
        "明るさ、コントラスト、彩度などの調整からフィルター適用まで。リアルタイムプレビューで思い通りの仕上がりに。",
      features: ["フィルター・エフェクト", "リサイズ・クロップ", "形式変換"],
    },
    {
      icon: <Lightbulb size={32} weight="duotone" />,
      title: "AI機能",
      description:
        "最先端のAI技術で高画質化、背景削除、カラー化を実現。ワンクリックでプロ品質の仕上がり。",
      features: ["AI高画質化", "背景自動削除", "カラー化"],
      badge: AI_ENABLED ? undefined : "近日公開",
      cta: AI_ENABLED
        ? { label: "今すぐ試す", href: "/subscription" }
        : undefined,
    },
  ];

  const tools = [
    {
      name: "圧縮",
      icon: <Package size={32} weight="duotone" />,
      href: "/tools/compress",
      description: "高品質を保ちながらファイルサイズを削減",
    },
    {
      name: "リサイズ",
      icon: <Resize size={32} weight="duotone" />,
      href: "/tools/resize",
      description: "任意のサイズに画像をリサイズ",
    },
    {
      name: "クロップ",
      icon: <Scissors size={32} weight="duotone" />,
      href: "/tools/crop",
      description: "必要な部分だけを切り取り",
    },
    {
      name: "変換",
      icon: <ArrowsClockwise size={32} weight="duotone" />,
      href: "/convert",
      description: "動画・画像を様々な形式に変換",
    },
    {
      name: "フィルター",
      icon: <Palette size={32} weight="duotone" />,
      href: "/tools/filter",
      description: "10種類以上のプリセットフィルター",
    },
    {
      name: "回転/反転",
      icon: <ArrowsCounterClockwise size={32} weight="duotone" />,
      href: "/tools/rotate",
      description: "90度回転や左右上下反転",
    },
  ];

  const stats = [
    {
      value: "100%",
      label: "ローカル処理",
      description: "サーバーにアップロードしない",
    },
    {
      value: "2GB",
      label: "最大ファイルサイズ",
      description: "大容量ファイルも処理可能",
    },
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
        {
          name: "MP4",
          desc: "最も互換性の高い動画形式。H.264/H.265コーデック対応",
        },
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
      {/* Marquee keyframes */}
      <style>{`
        @keyframes marquee-ltr {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes marquee-rtl {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
      `}</style>

      {/* Scroll Progress */}
      <div
        ref={scrollProgressRef}
        className="scroll-progress"
        style={{ transform: "scaleX(0)" }}
      />

      <Header />

      <main className="w-full">
        {/* ═══════════════════════════════════════
            HERO — Split layout
        ═══════════════════════════════════════ */}
        <section
          ref={heroRef}
          className="relative min-h-screen flex items-center overflow-hidden hero-gradient"
        >
          {/* Background */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 grid-pattern" />
            <div
              ref={orbOneRef}
              className="orb w-[700px] h-[700px] bg-[var(--color-accent)]/15 -top-1/3 right-[-20%]"
              style={{ transform: "translate(0px, 0px)" }}
            />
            <div
              ref={orbTwoRef}
              className="orb w-[400px] h-[400px] bg-[var(--color-accent)]/10 bottom-0 right-[25%]"
              style={{ transform: "translate(0px, 0px)" }}
            />
            <div
              ref={orbThreeRef}
              className="orb w-[350px] h-[350px]"
              style={{
                background: "rgba(236, 72, 153, 0.1)",
                top: "60%",
                left: "5%",
                transform: "translate(0px, 0px)",
              }}
            />
          </div>

          <div className="relative z-10 w-full pt-24 pb-16">
            <div className="w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
              {/* LEFT: content */}
              <div className="flex-1 min-w-0">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-8 stagger-item">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-success)] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-success)]" />
                  </span>
                  <span className="text-xs font-medium text-[var(--color-text)]">
                    無料 · 登録不要 · 完全ローカル
                  </span>
                </div>

                {/* Brand name — huge */}
                <h1
                  className="font-black tracking-tighter leading-none gradient-text-animated stagger-item mb-4"
                  style={{ fontSize: "clamp(72px, 11vw, 152px)" }}
                >
                  MediEdi!
                </h1>
                <p className="text-2xl sm:text-3xl font-medium text-[var(--color-text-muted)] mb-10 stagger-item">
                  ブラウザで、本格的に。
                </p>

                {/* DropZone */}
                <div className="mb-8 max-w-xl stagger-item">
                  <div className="relative group">
                    <div
                      className="absolute -inset-1 rounded-2xl blur-lg opacity-20 group-hover:opacity-40 transition-opacity duration-500"
                      style={{
                        background:
                          "linear-gradient(90deg, #9333ea, #a855f7, #ec4899)",
                      }}
                    />
                    <div className="relative">
                      <DropZone
                        onFilesSelected={handleFilesSelected}
                        accept="all"
                        className="!border-2 !border-dashed !border-[var(--color-border)] hover:!border-[var(--color-accent)] transition-colors !py-10 !px-6"
                      />
                      <p className="text-xs text-[var(--color-text-muted)] mt-3 text-center">
                        画像 → 編集エディタ　　動画・音声 → 形式変換ツール
                      </p>
                    </div>
                  </div>
                </div>

                {/* CTA buttons */}
                <div className="flex flex-wrap gap-4 mb-10 stagger-item">
                  <Link href="/image">
                    <Button
                      size="lg"
                      variant="primary"
                      icon={<ImageIcon size={20} />}
                      className="!px-8 !py-4 !h-auto !rounded-xl hover:scale-105 transition-transform"
                    >
                      画像エディタを開く
                    </Button>
                  </Link>
                  <Link href="/convert">
                    <Button
                      size="lg"
                      variant="secondary"
                      icon={<ArrowsClockwise size={20} />}
                      className="!px-8 !py-4 !h-auto !rounded-xl hover:scale-105 transition-transform"
                    >
                      形式変換ツール
                    </Button>
                  </Link>
                </div>

                {/* Trust pills */}
                <div className="flex flex-wrap gap-5 stagger-item">
                  {[
                    {
                      icon: <Lock size={16} weight="duotone" />,
                      text: "100%ローカル処理",
                    },
                    {
                      icon: <Lightning size={16} weight="duotone" />,
                      text: "超高速処理",
                    },
                    {
                      icon: <Check size={16} weight="duotone" />,
                      text: "完全無料",
                    },
                    {
                      icon: <Globe size={16} weight="duotone" />,
                      text: "登録不要",
                    },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]"
                    >
                      <span className="text-[var(--color-accent)]">
                        {item.icon}
                      </span>
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* RIGHT: CSS editor mock — desktop only */}
              <div className="hidden lg:block w-[420px] xl:w-[460px] flex-shrink-0">
                <div
                  className="rounded-2xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)]"
                  style={{
                    boxShadow:
                      "0 0 80px rgba(168,85,247,0.18), 0 20px 60px rgba(0,0,0,0.5)",
                  }}
                >
                  {/* Title bar */}
                  <div className="flex items-center gap-2 px-4 py-3 bg-[var(--color-surface-raised)] border-b border-[var(--color-border)]">
                    <div className="flex gap-1.5">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ background: "rgba(248,113,113,0.7)" }}
                      />
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ background: "rgba(251,191,36,0.7)" }}
                      />
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ background: "rgba(52,211,153,0.7)" }}
                      />
                    </div>
                    <span className="text-xs text-[var(--color-text-muted)] flex-1 text-center font-mono">
                      photo_edit.jpg — MediEdi!
                    </span>
                  </div>

                  {/* Canvas area — checkerboard + gradient image */}
                  <div
                    className="relative h-52"
                    style={{
                      backgroundImage:
                        "linear-gradient(45deg, #0f1629 25%, transparent 25%), linear-gradient(-45deg, #0f1629 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #0f1629 75%), linear-gradient(-45deg, transparent 75%, #0f1629 75%)",
                      backgroundSize: "16px 16px",
                      backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
                      backgroundColor: "#07091a",
                    }}
                  >
                    {/* Fake image preview */}
                    <div
                      className="absolute inset-5 rounded-xl overflow-hidden"
                      style={{
                        background:
                          "linear-gradient(135deg, #1e1b4b 0%, #312e81 35%, #6d28d9 65%, #a78bfa 100%)",
                      }}
                    >
                      <div
                        className="absolute inset-0"
                        style={{
                          background:
                            "linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.6) 100%)",
                        }}
                      />
                      <div
                        className="absolute top-6 left-6 w-14 h-14 rounded-full"
                        style={{
                          background: "rgba(255,255,255,0.1)",
                          backdropFilter: "blur(4px)",
                        }}
                      />
                      <div
                        className="absolute top-10 right-6 w-20 h-8 rounded-lg"
                        style={{ background: "rgba(255,255,255,0.06)" }}
                      />
                      {/* Selection marquee */}
                      <div
                        className="absolute inset-4 rounded"
                        style={{ border: "2px dashed #a855f7" }}
                      >
                        {[
                          "-top-1 -left-1",
                          "-top-1 -right-1",
                          "-bottom-1 -left-1",
                          "-bottom-1 -right-1",
                        ].map((pos, i) => (
                          <div
                            key={i}
                            className={`absolute ${pos} w-2.5 h-2.5 rounded-sm`}
                            style={{ background: "#a855f7" }}
                          />
                        ))}
                      </div>
                    </div>
                    {/* Coordinate HUD */}
                    <div
                      className="absolute bottom-2 right-2 text-[10px] font-mono text-[var(--color-text-muted)] px-2 py-0.5 rounded"
                      style={{ background: "rgba(0,0,0,0.6)" }}
                    >
                      1920 × 1080
                    </div>
                    <div
                      className="absolute bottom-2 left-2 text-[10px] font-mono px-2 py-0.5 rounded"
                      style={{
                        background: "rgba(168,85,247,0.2)",
                        color: "#c084fc",
                      }}
                    >
                      RGB
                    </div>
                  </div>

                  {/* Adjustment sliders */}
                  <div className="p-4 space-y-3 border-b border-[var(--color-border)]">
                    {[
                      { label: "明るさ", value: 68 },
                      { label: "コントラスト", value: 52 },
                      { label: "彩度", value: 78 },
                      { label: "露出", value: 44 },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center gap-3">
                        <span className="text-xs text-[var(--color-text-muted)] w-20 text-right shrink-0">
                          {label}
                        </span>
                        <div className="flex-1 h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${value}%`,
                              background:
                                "linear-gradient(90deg, #9333ea, #a855f7)",
                            }}
                          />
                        </div>
                        <span
                          className="text-xs font-mono w-6 shrink-0"
                          style={{ color: "#c084fc" }}
                        >
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Toolbar tabs */}
                  <div className="flex divide-x divide-[var(--color-border)]">
                    {["フィルター", "クロップ", "リサイズ", "Export"].map(
                      (tab, i) => (
                        <button
                          key={tab}
                          className="flex-1 py-2.5 text-xs font-medium transition-colors"
                          style={
                            i === 0
                              ? {
                                  background: "rgba(168,85,247,0.12)",
                                  color: "#c084fc",
                                }
                              : { color: "var(--color-text-muted)" }
                          }
                        >
                          {tab}
                        </button>
                      ),
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════
            STATS — Editorial strip with giant numbers
        ═══════════════════════════════════════ */}
        <section className="border-y border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="w-full max-w-7xl mx-auto">
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-[var(--color-border)]">
              {stats.map((stat, i) => (
                <div
                  key={i}
                  className="group py-12 px-8 hover:bg-[var(--color-accent-soft)] transition-colors cursor-default"
                >
                  <div
                    className="gradient-text font-black mb-2 leading-none"
                    style={{ fontSize: "clamp(48px, 6vw, 80px)" }}
                  >
                    {stat.value}
                  </div>
                  <div className="text-sm font-semibold text-[var(--color-text)] mb-1">
                    {stat.label}
                  </div>
                  <div className="text-xs text-[var(--color-text-muted)]">
                    {stat.description}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════
            FEATURES — Editorial left-aligned header + feature-card grid
        ═══════════════════════════════════════ */}
        <section className="py-32 relative overflow-hidden">
          <div className="absolute inset-0 hero-gradient opacity-40" />
          <div className="relative w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-16">
            {/* Left-aligned editorial header */}
            <div className="mb-16 max-w-lg">
              <div className="text-xs uppercase tracking-widest text-[var(--color-accent)] mb-4 font-mono">
                Features
              </div>
              <h2 className="text-5xl sm:text-6xl font-black text-[var(--color-text)] leading-none">
                パワフルな機能を
                <br />
                <span className="gradient-text">シンプル</span>に
              </h2>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {features.map((feature, i) => (
                <div key={i} className="feature-card p-8 rounded-3xl">
                  <div className="flex items-start justify-between mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-[var(--color-accent-soft)] flex items-center justify-center text-[var(--color-accent)]">
                      {feature.icon}
                    </div>
                    {feature.badge && (
                      <span className="px-3 py-1.5 rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent-text)] text-xs font-semibold">
                        {feature.badge}
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-[var(--color-text)] mb-4">
                    {feature.title}
                  </h3>
                  <p className="text-[var(--color-text-muted)] text-sm leading-relaxed mb-6">
                    {feature.description}
                  </p>
                  <ul className="space-y-2.5">
                    {feature.features.map((item, j) => (
                      <li
                        key={j}
                        className="flex items-center gap-3 text-sm text-[var(--color-text)]"
                      >
                        <Check
                          size={14}
                          weight="bold"
                          className="text-[var(--color-success)] flex-shrink-0"
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                  {feature.cta && (
                    <Link href={feature.cta.href} className="mt-6 inline-block">
                      <Button
                        size="sm"
                        variant="primary"
                        icon={<ArrowRight size={14} />}
                      >
                        {feature.cta.label}
                      </Button>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════
            TOOLS — Bento grid
        ═══════════════════════════════════════ */}
        <section className="py-32 bg-[var(--color-bg)]">
          <div className="w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-16">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-4">
              <div>
                <div className="text-xs uppercase tracking-widest text-[var(--color-accent)] mb-3 font-mono">
                  Tools
                </div>
                <h2 className="text-4xl sm:text-5xl font-black text-[var(--color-text)]">
                  画像編集ツール
                </h2>
              </div>
              <p className="text-sm text-[var(--color-text-muted)] max-w-xs sm:text-right">
                必要なツールをクリックするだけ。
                <br />
                すべてブラウザ内で完結します。
              </p>
            </div>

            {/* Bento: first cell wider */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <Link href={tools[0].href} className="sm:col-span-2">
                <div className="group h-28 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)] transition-all duration-200 p-5 flex items-center gap-5">
                  <div className="text-[var(--color-accent)] group-hover:scale-110 transition-transform flex-shrink-0">
                    {tools[0].icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[var(--color-text)] mb-1">
                      {tools[0].name}
                    </div>
                    <div className="text-sm text-[var(--color-text-muted)] truncate">
                      {tools[0].description}
                    </div>
                  </div>
                  <ArrowRight
                    size={16}
                    className="text-[var(--color-accent)] flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                </div>
              </Link>

              {tools.slice(1).map((tool, i) => (
                <Link key={i + 1} href={tool.href}>
                  <div className="group h-28 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)] transition-all duration-200 p-5 flex flex-col justify-between">
                    <div className="text-[var(--color-accent)] group-hover:scale-110 transition-transform w-fit">
                      {tool.icon}
                    </div>
                    <div>
                      <div className="font-semibold text-[var(--color-text)] text-sm">
                        {tool.name}
                      </div>
                      <div className="text-xs text-[var(--color-text-muted)] mt-0.5 line-clamp-1">
                        {tool.description}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════
            HOW IT WORKS — Oversized step numbers as background
        ═══════════════════════════════════════ */}
        <section className="py-32 relative overflow-hidden">
          <div className="w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-16">
            <div className="text-center mb-20">
              <div className="text-xs uppercase tracking-widest text-[var(--color-accent)] mb-4 font-mono">
                How it works
              </div>
              <h2 className="text-5xl sm:text-6xl font-black text-[var(--color-text)]">
                シンプルな<span className="gradient-text">3ステップ</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
              {howItWorks.map((item, i) => (
                <div key={i} className="relative group">
                  {/* Giant decorative number */}
                  <div
                    className="absolute font-black text-[var(--color-accent)] select-none pointer-events-none"
                    style={{
                      fontSize: "clamp(120px, 18vw, 200px)",
                      lineHeight: 1,
                      opacity: 0.04,
                      top: "-20px",
                      left: "-10px",
                    }}
                  >
                    {item.step}
                  </div>

                  {/* Content */}
                  <div className="relative z-10 pt-10">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-accent)] mb-6 group-hover:border-[var(--color-accent)] group-hover:bg-[var(--color-accent-soft)] transition-all">
                      {item.icon}
                    </div>
                    <div className="text-xs font-mono text-[var(--color-text-muted)] mb-3">
                      STEP {item.step}
                    </div>
                    <h3 className="text-xl font-bold text-[var(--color-text)] mb-4">
                      {item.title}
                    </h3>
                    <p className="text-[var(--color-text-muted)] text-sm leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  {/* Connector */}
                  {i < 2 && (
                    <div
                      className="hidden md:block absolute top-16 left-full w-1/2 h-px"
                      style={{
                        background:
                          "linear-gradient(90deg, rgba(168,85,247,0.4), transparent)",
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════
            FORMATS — Marquee ticker rows
        ═══════════════════════════════════════ */}
        <section className="py-24 bg-[var(--color-surface)] border-t border-b border-[var(--color-border)] overflow-hidden">
          <div className="w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 mb-12">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-widest text-[var(--color-accent)] mb-3 font-mono">
                  Supported Formats
                </div>
                <h2 className="text-4xl sm:text-5xl font-black text-[var(--color-text)]">
                  対応フォーマット
                </h2>
              </div>
              <p className="text-sm text-[var(--color-text-muted)]">
                主要なメディアフォーマットをすべてサポート
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {formatCategories.map((cat, i) => (
              <div key={i} className="flex overflow-hidden group/row">
                <div
                  className="flex gap-3 items-center whitespace-nowrap group-hover/row:[animation-play-state:paused]"
                  style={{
                    animation: `${i % 2 === 0 ? "marquee-ltr" : "marquee-rtl"} ${22 + i * 5}s linear infinite`,
                  }}
                >
                  {/* Duplicate for seamless loop */}
                  {[...cat.formats, ...cat.formats].map((fmt, j) => (
                    <span
                      key={j}
                      title={fmt.desc}
                      className="relative inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium flex-shrink-0 cursor-default group/pill"
                      style={{
                        background: "var(--color-accent-soft)",
                        color: "var(--color-accent-text)",
                      }}
                    >
                      <span className="text-[var(--color-accent)] opacity-60">
                        {cat.icon}
                      </span>
                      {fmt.name}
                      {/* Tooltip */}
                      <span
                        className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[200px] px-3 py-1.5 rounded-lg text-xs font-normal text-[var(--color-text)] opacity-0 group-hover/pill:opacity-100 transition-opacity whitespace-normal text-center z-50"
                        style={{
                          background: "var(--color-surface-raised)",
                          boxShadow: "var(--shadow-md)",
                          border: "1px solid var(--color-border)",
                        }}
                      >
                        {fmt.desc}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════
            BROWSER NOTICE — Compact strip
        ═══════════════════════════════════════ */}
        <section className="py-6 bg-[var(--color-warning-soft)]">
          <div className="w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-16">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-warning)] flex items-center justify-center flex-shrink-0">
                <Info size={20} weight="bold" className="text-white" />
              </div>
              <p className="text-sm text-[var(--color-text-muted)]">
                <strong className="text-[var(--color-text)]">
                  推奨ブラウザ:{" "}
                </strong>
                Chrome, Firefox, Edge の最新版。WebAssembly (SharedArrayBuffer)
                を使用しています。Safari は一部機能が制限される場合があります。
              </p>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════
            CTA — Full-screen mesh gradient
        ═══════════════════════════════════════ */}
        <section
          className="relative overflow-hidden"
          style={{ minHeight: "70vh", display: "flex", alignItems: "center" }}
        >
          <div className="absolute inset-0 mesh-gradient" />
          <div
            className="absolute inset-0 grid-pattern"
            style={{ opacity: 0.3 }}
          />

          <div className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 py-32 text-center">
            <div
              className="font-black text-[var(--color-text)] leading-none mb-8"
              style={{ fontSize: "clamp(48px, 9vw, 120px)" }}
            >
              今すぐ<span className="gradient-text">無料</span>で<br />
              始めよう
            </div>
            <p className="text-lg sm:text-xl text-[var(--color-text-muted)] mb-12 max-w-xl mx-auto leading-relaxed">
              登録不要、インストール不要。
              <br />
              ブラウザを開くだけで始められます。
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/image">
                <Button
                  size="lg"
                  variant="primary"
                  icon={<ArrowRight size={20} />}
                  className="!px-12 !py-5 !h-auto !text-lg !rounded-2xl hover:scale-105 transition-transform"
                >
                  無料で始める
                </Button>
              </Link>
              <Link href="/convert">
                <Button
                  size="lg"
                  variant="secondary"
                  icon={<ArrowsClockwise size={20} />}
                  className="!px-10 !py-5 !h-auto !text-lg !rounded-2xl hover:scale-105 transition-transform"
                >
                  形式変換を試す
                </Button>
              </Link>
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
                    <svg
                      className="w-8 h-8 text-white"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <path
                        d="M3 19V5l6 7 6-7v14"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle
                        cx="20"
                        cy="5"
                        r="1.5"
                        fill="currentColor"
                        opacity="0.8"
                      />
                      <circle
                        cx="18"
                        cy="9"
                        r="0.8"
                        fill="currentColor"
                        opacity="0.5"
                      />
                    </svg>
                  </div>
                  <span className="font-bold text-2xl text-[var(--color-text)]">
                    MediEdi!
                  </span>
                </div>
                <p className="text-[var(--color-text-muted)] leading-relaxed max-w-md">
                  プライバシー重視のブラウザ内メディア編集プラットフォーム。
                  全ての処理はあなたのブラウザ内で完結し、ファイルがサーバーに送信されることはありません。
                </p>
              </div>

              {/* Quick Links */}
              <div>
                <h4 className="font-semibold text-lg text-[var(--color-text)] mb-6">
                  ツール
                </h4>
                <ul className="space-y-4">
                  {[
                    { name: "画像エディタ", href: "/image" },
                    { name: "形式変換ツール", href: "/convert" },
                    { name: "圧縮ツール", href: "/tools/compress" },
                  ].map((link, i) => (
                    <li key={i}>
                      <Link
                        href={link.href}
                        className="text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Legal */}
              <div>
                <h4 className="font-semibold text-lg text-[var(--color-text)] mb-6">
                  その他
                </h4>
                <ul className="space-y-4">
                  {[
                    { name: "プライバシーポリシー", href: "/privacy" },
                    { name: "利用規約", href: "/terms" },
                    { name: "特定商取引法に基づく表記", href: "/tokushoho" },
                    { name: "お問い合わせ", href: "/contact" },
                  ].map((link, i) => (
                    <li key={i}>
                      <Link
                        href={link.href}
                        className="text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
                      >
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
                  &copy; {new Date().getFullYear()} MediEdi! All rights
                  reserved.
                </p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
