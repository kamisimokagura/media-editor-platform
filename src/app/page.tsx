"use client";

import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { Header } from "@/components/layout";
import { DropZone } from "@/components/ui";
import { useEditorStore } from "@/stores/editorStore";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import type { MediaFile, MediaType } from "@/types";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { createProject, addMediaFile, setActiveTab, setCurrentImage } = useEditorStore();
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
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      title: "動画編集",
      description: "トリミング、結合、フォーマット変換。タイムラインベースの直感的なインターフェースで、プロ級の動画編集を。",
      gradient: "from-blue-500 to-cyan-400",
      features: ["カット・トリミング", "フォーマット変換", "音声抽出"],
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      title: "画像編集",
      description: "明るさ、コントラスト、彩度などの調整からフィルター適用まで。リアルタイムプレビューで思い通りの仕上がりに。",
      gradient: "from-purple-500 to-pink-400",
      features: ["フィルター・エフェクト", "リサイズ・クロップ", "形式変換"],
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      title: "AI機能",
      description: "最先端のAI技術で高画質化、背景削除、カラー化を実現。ワンクリックでプロ品質の仕上がり。",
      gradient: "from-amber-500 to-orange-400",
      features: ["AI高画質化", "背景自動削除", "カラー化"],
      badge: "Coming Soon",
    },
  ];

  const tools = [
    { name: "圧縮", icon: "📦", href: "/tools/compress", description: "高品質を保ちながらファイルサイズを削減" },
    { name: "リサイズ", icon: "📐", href: "/tools/resize", description: "任意のサイズに画像をリサイズ" },
    { name: "クロップ", icon: "✂️", href: "/tools/crop", description: "必要な部分だけを切り取り" },
    { name: "変換", icon: "🔄", href: "/convert", description: "動画・画像を様々な形式に変換" },
    { name: "フィルター", icon: "🎨", href: "/tools/filter", description: "10種類以上のプリセットフィルター" },
    { name: "回転/反転", icon: "🔃", href: "/tools/rotate", description: "90度回転や左右上下反転" },
  ];

  const stats = [
    { value: "100%", label: "ローカル処理", description: "サーバーにアップロードしない" },
    { value: "2GB", label: "最大ファイルサイズ", description: "大容量ファイルも処理可能" },
    { value: "無料", label: "完全無料", description: "隠れた料金は一切なし" },
    { value: "0秒", label: "待ち時間", description: "登録不要ですぐ使える" },
  ];

  return (
    <div className="min-h-screen w-full bg-white dark:bg-dark-950 overflow-x-hidden">
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
              className="orb w-[500px] h-[500px] bg-blue-500/20 top-1/4 left-1/4 -translate-x-1/2"
              style={{
                transform: `translate(${mousePosition.x * 30}px, ${mousePosition.y * 30}px)`,
              }}
            />
            <div
              className="orb w-[400px] h-[400px] bg-purple-500/20 bottom-1/4 right-1/4 translate-x-1/2"
              style={{
                transform: `translate(${mousePosition.x * -20}px, ${mousePosition.y * -20}px)`,
              }}
            />
            <div
              className="orb w-[300px] h-[300px] bg-pink-500/15 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{
                transform: `translate(${mousePosition.x * 15}px, ${mousePosition.y * 15}px)`,
              }}
            />

            {/* Gradient Glow - Centered */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-blue-500/10 via-purple-500/5 to-transparent blur-3xl" />
          </div>

          <div className="relative z-10 w-full max-w-5xl mx-auto px-8 sm:px-12 lg:px-16 py-28 sm:py-36">
            <div className="text-center mx-auto">
              {/* Badge */}
              <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full glass-card mb-12 stagger-item">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                </span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  完全無料・登録不要で今すぐ使える
                </span>
              </div>

              {/* Main Heading */}
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-12 stagger-item">
                <span className="block text-gray-900 dark:text-white mb-4">ブラウザだけで</span>
                <span className="block gradient-text-animated">プロ級編集</span>
              </h1>

              {/* Subtitle */}
              <p className="text-lg sm:text-xl lg:text-2xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-16 stagger-item leading-relaxed">
                動画トリミング、画像編集、AI高画質化まで。
                <br className="hidden sm:block" />
                <span className="font-semibold text-gray-900 dark:text-white">
                  サーバーにアップロードしない
                </span>
                から、プライバシーも安心。
              </p>

              {/* Quick Upload - Both video and image supported */}
              <div className="max-w-2xl mx-auto mb-16 stagger-item">
                <div className="relative group">
                  <div className="absolute -inset-2 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-3xl blur-xl opacity-25 group-hover:opacity-40 transition-opacity duration-500" />
                  <div className="relative">
                    <DropZone
                      onFilesSelected={handleFilesSelected}
                      accept="all"
                      className="glass-card !border-2 !border-dashed !border-gray-200 dark:!border-gray-700 hover:!border-blue-500 dark:hover:!border-blue-400 transition-colors !py-14 !px-8"
                    />
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 text-center">
                      🎬 動画・🖼️ 画像どちらもOK！自動で適切なエディタに移動します
                    </p>
                  </div>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-wrap justify-center gap-6 stagger-item">
                <Link href="/editor">
                  <button className="group relative px-10 py-5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold rounded-2xl overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-gray-900/20 dark:hover:shadow-white/20">
                    <span className="relative z-10 flex items-center gap-3">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      動画エディタを開く
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <span className="absolute inset-0 z-20 flex items-center justify-center gap-3 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      動画エディタを開く
                    </span>
                  </button>
                </Link>
                <Link href="/image">
                  <button className="group px-10 py-5 bg-white dark:bg-dark-800 text-gray-900 dark:text-white font-semibold rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-400 transition-all duration-300 hover:scale-105 hover:shadow-xl">
                    <span className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      画像エディタを開く
                    </span>
                  </button>
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap justify-center items-center gap-8 sm:gap-12 mt-16 stagger-item">
                {[
                  { icon: "🔒", text: "100%ローカル処理" },
                  { icon: "⚡", text: "超高速処理" },
                  { icon: "🆓", text: "完全無料" },
                  { icon: "🌐", text: "登録不要" },
                ].map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 text-gray-600 dark:text-gray-400"
                  >
                    <span className="text-2xl">{item.icon}</span>
                    <span className="text-sm font-medium">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3">
            <span className="text-sm text-gray-500 dark:text-gray-400">スクロール</span>
            <div className="w-6 h-10 rounded-full border-2 border-gray-300 dark:border-gray-600 flex justify-center pt-2">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce" />
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-32 bg-gray-50 dark:bg-dark-900">
          <div className="w-full flex justify-center">
            <div className="w-full max-w-5xl px-8 sm:px-12 lg:px-20">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-10">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className="text-center p-8 rounded-3xl bg-white dark:bg-dark-800 shadow-lg hover:shadow-xl transition-shadow"
                >
                  <div className="text-4xl sm:text-5xl font-bold gradient-text mb-3">
                    {stat.value}
                  </div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {stat.label}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {stat.description}
                  </div>
                </div>
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
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-8">
                パワフルな機能を
                <span className="gradient-text">シンプル</span>に
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                プロフェッショナルな編集機能を、誰でも簡単に使えるインターフェースで
              </p>
            </div>

              <div className="grid lg:grid-cols-3 gap-8 lg:gap-10">
                {features.map((feature, index) => (
                <div
                  key={index}
                  className="group relative"
                >
                  <div className="feature-card p-10 h-full">
                    {feature.badge && (
                      <div className="absolute top-6 right-6 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold">
                        {feature.badge}
                      </div>
                    )}

                    <div className={`w-18 h-18 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-white mb-8 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      {feature.icon}
                    </div>

                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-5">
                      {feature.title}
                    </h3>

                    <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
                      {feature.description}
                    </p>

                    <ul className="space-y-4">
                      {feature.features.map((item, i) => (
                        <li key={i} className="flex items-center gap-4 text-gray-700 dark:text-gray-300">
                          <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Tools Grid Section */}
        <section className="py-36 bg-gray-50 dark:bg-dark-900">
          <div className="w-full flex justify-center">
            <div className="w-full max-w-5xl px-8 sm:px-12 lg:px-20">
              <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-8">
                画像編集ツール
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                必要なツールをクリックするだけ。すべてブラウザ内で完結します。
              </p>
            </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
                {tools.map((tool, index) => (
                  <Link key={index} href={tool.href}>
                    <div className="group p-6 bg-white dark:bg-dark-800 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2 text-center cursor-pointer">
                      <div className="text-4xl mb-4 group-hover:scale-125 transition-transform duration-300">
                        {tool.icon}
                      </div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                        {tool.name}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                        {tool.description}
                      </p>
                    </div>
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
              <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-8">
                シンプルな<span className="gradient-text">3ステップ</span>
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300">
                複雑な操作は一切不要
              </p>
            </div>

              <div className="grid md:grid-cols-3 gap-12 lg:gap-16">
                {[
                {
                  step: "01",
                  title: "ファイルを選択",
                  description: "編集したいファイルをドラッグ＆ドロップ、または選択します",
                  icon: (
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  ),
                },
                {
                  step: "02",
                  title: "編集する",
                  description: "直感的なツールで自由に編集。リアルタイムプレビューで確認",
                  icon: (
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                    </svg>
                  ),
                },
                {
                  step: "03",
                  title: "ダウンロード",
                  description: "編集完了後、ワンクリックでダウンロード。即座に利用可能",
                  icon: (
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  ),
                },
              ].map((item, index) => (
                <div key={index} className="relative text-center group">
                  {index < 2 && (
                    <div className="hidden md:block absolute top-20 left-[60%] w-[80%] h-0.5">
                      <div className="w-full h-full bg-gradient-to-r from-blue-500/50 to-transparent" />
                    </div>
                  )}
                  <div className="relative z-10">
                    <div className="w-28 h-28 mx-auto mb-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-blue-500/30 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                      {item.icon}
                    </div>
                    <div className="absolute -top-3 -right-3 w-12 h-12 bg-gradient-to-br from-pink-500 to-orange-500 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg left-1/2 ml-10">
                      {item.step}
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-5">
                    {item.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 max-w-xs mx-auto leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
              </div>
            </div>
          </div>
        </section>

        {/* Supported Formats */}
        <section className="py-36 bg-gradient-to-br from-gray-900 to-gray-800 dark:from-dark-950 dark:to-dark-900 text-white">
          <div className="w-full flex justify-center">
            <div className="w-full max-w-5xl px-8 sm:px-12 lg:px-20">
              <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-bold mb-8">
                対応フォーマット
              </h2>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                主要なメディアフォーマットをすべてサポート
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-12">
              {[
                {
                  title: "動画",
                  formats: ["MP4", "WebM", "MOV", "AVI", "MKV", "FLV", "WMV", "MPEG", "3GP", "GIF"],
                  gradient: "from-red-500 to-orange-500",
                  icon: (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ),
                },
                {
                  title: "画像",
                  formats: ["PNG", "JPG", "WebP", "AVIF", "GIF", "SVG", "HEIC", "RAW", "BMP", "TIFF", "ICO"],
                  gradient: "from-purple-500 to-pink-500",
                  icon: (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  ),
                },
                {
                  title: "音声",
                  formats: ["MP3", "WAV", "OGG", "AAC", "FLAC", "M4A", "AIFF", "WMA"],
                  gradient: "from-green-500 to-teal-500",
                  icon: (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                  ),
                },
              ].map((category, index) => (
                <div key={index} className="text-center">
                  <div className={`w-24 h-24 mx-auto mb-8 bg-gradient-to-br ${category.gradient} rounded-2xl flex items-center justify-center shadow-2xl`}>
                    {category.icon}
                  </div>
                  <h3 className="text-2xl font-bold mb-8">{category.title}</h3>
                  <div className="flex flex-wrap justify-center gap-4">
                    {category.formats.map((format, i) => (
                      <span
                        key={i}
                        className="px-5 py-2.5 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium hover:bg-white/20 transition-colors cursor-default"
                      >
                        {format}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              </div>
            </div>
          </div>
        </section>

        {/* Browser Notice */}
        <section className="py-20 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10">
          <div className="w-full flex justify-center">
            <div className="w-full max-w-4xl px-8 sm:px-12 lg:px-20">
            <div className="flex items-start gap-6 sm:gap-8 p-8 sm:p-10 glass-card rounded-3xl">
              <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  ブラウザ要件
                </h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  本アプリケーションはWebAssembly (SharedArrayBuffer) を使用しています。
                  <strong className="text-gray-900 dark:text-white"> Chrome, Firefox, Edge </strong>
                  の最新版で最適な動作が期待できます。Safari は一部機能が制限される場合があります。
                </p>
              </div>
            </div>
          </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-36 relative overflow-hidden">
          <div className="absolute inset-0 mesh-gradient opacity-50" />

          <div className="relative w-full flex justify-center">
            <div className="w-full max-w-4xl px-8 sm:px-12 lg:px-20 text-center">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-12">
              今すぐ
              <span className="gradient-text">無料</span>
              で始めよう
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-14 max-w-2xl mx-auto leading-relaxed">
              登録不要、インストール不要。ブラウザを開くだけで、
              プロフェッショナルなメディア編集を体験できます。
            </p>
              <div className="flex flex-wrap justify-center gap-6">
                <Link href="/editor">
                  <button className="group px-12 py-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-lg font-semibold rounded-2xl shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105 transition-all duration-300">
                    <span className="flex items-center gap-3">
                      無料で始める
                      <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </span>
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-dark-950 text-white py-24">
        <div className="w-full flex justify-center">
          <div className="w-full max-w-5xl px-8 sm:px-12 lg:px-20">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            {/* Logo & Description */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="font-bold text-2xl">MediaEditor</span>
              </div>
              <p className="text-gray-400 leading-relaxed max-w-md">
                プライバシー重視のブラウザ内メディア編集プラットフォーム。
                全ての処理はあなたのブラウザ内で完結し、ファイルがサーバーに送信されることはありません。
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold text-lg mb-6">ツール</h4>
              <ul className="space-y-4">
                {[
                  { name: "動画エディタ", href: "/editor" },
                  { name: "画像エディタ", href: "/image" },
                  { name: "変換ツール", href: "/convert" },
                  { name: "圧縮ツール", href: "/tools/compress" },
                ].map((link, i) => (
                  <li key={i}>
                    <Link href={link.href} className="text-gray-400 hover:text-white transition-colors">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold text-lg mb-6">その他</h4>
              <ul className="space-y-4">
                {[
                  { name: "プライバシーポリシー", href: "/privacy" },
                  { name: "利用規約", href: "/terms" },
                  { name: "お問い合わせ", href: "/contact" },
                ].map((link, i) => (
                  <li key={i}>
                    <Link href={link.href} className="text-gray-400 hover:text-white transition-colors">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-10">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <p className="text-gray-500 text-sm">
                Powered by FFmpeg.wasm - 全ての処理はブラウザ内で実行されます
              </p>
              <p className="text-gray-500 text-sm">
                &copy; {new Date().getFullYear()} MediaEditor. All rights reserved.
              </p>
            </div>
          </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
