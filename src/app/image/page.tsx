"use client";

import { Header } from "@/components/layout";
import { ImageEditor } from "@/components/editor";

export default function ImagePage() {
  return (
    <div className="h-screen flex flex-col bg-gray-100 dark:bg-dark-950">
      <Header />
      <div className="flex-1 overflow-hidden">
        <ImageEditor />
      </div>
    </div>
  );
}
