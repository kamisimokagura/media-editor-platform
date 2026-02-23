import { notFound } from "next/navigation";
import { Header } from "@/components/layout";
import { ImageEditor } from "@/components/editor";

type ToolKey = "compress" | "resize" | "crop" | "filter" | "rotate";
type InitialTab = "adjust" | "crop" | "resize" | "filters" | "tools";

const toolConfig: Record<
  ToolKey,
  {
    title: string;
    description: string;
    initialTab: InitialTab;
    autoOpenExport?: boolean;
    notice?: string;
  }
> = {
  compress: {
    title: "画像圧縮",
    description: "品質を調整しながら画像サイズを圧縮できます。",
    initialTab: "adjust",
    autoOpenExport: true,
    notice: "画像を選択すると詳細エクスポートを自動で開きます。",
  },
  resize: {
    title: "画像リサイズ",
    description: "幅・高さを指定して画像サイズを変更できます。",
    initialTab: "resize",
  },
  crop: {
    title: "画像クロップ",
    description: "必要な範囲だけ切り抜いて保存できます。",
    initialTab: "crop",
    notice: "画像上をドラッグして範囲を選択してください。",
  },
  filter: {
    title: "画像フィルター",
    description: "プリセットフィルターをワンクリックで適用できます。",
    initialTab: "filters",
  },
  rotate: {
    title: "回転・反転",
    description: "90度回転や左右/上下反転を適用できます。",
    initialTab: "adjust",
    notice: "回転・反転ボタンは画像読み込み後に下部ツールバーへ表示されます。",
  },
};

export function generateStaticParams() {
  return (Object.keys(toolConfig) as ToolKey[]).map((tool) => ({ tool }));
}

export default async function ToolPage({
  params,
}: {
  params: Promise<{ tool: string }>;
}) {
  const { tool } = await params;
  const config = toolConfig[tool as ToolKey];

  if (!config) {
    notFound();
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100 dark:bg-dark-950">
      <Header />
      <div className="border-b border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
            {config.title}
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-1">
            {config.description}
          </p>
          {config.notice && (
            <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 mt-2">
              {config.notice}
            </p>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <ImageEditor
          initialTab={config.initialTab}
          autoOpenExport={Boolean(config.autoOpenExport)}
        />
      </div>
    </div>
  );
}
