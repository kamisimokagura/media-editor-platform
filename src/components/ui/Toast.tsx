"use client";

import { useEffect, useState } from "react";
import { useToastStore } from "@/stores/toastStore";
import type { Toast as ToastType } from "@/types";
import { CheckCircle, XCircle, Info, Warning, X } from "@phosphor-icons/react";

const iconMap = {
  success: <CheckCircle size={20} weight="fill" className="text-[var(--color-success)]" />,
  error: <XCircle size={20} weight="fill" className="text-[var(--color-error)]" />,
  info: <Info size={20} weight="fill" className="text-[var(--color-accent)]" />,
  warning: <Warning size={20} weight="fill" className="text-[var(--color-warning)]" />,
};

const borderColorMap = {
  success: "var(--color-success)",
  error: "var(--color-error)",
  info: "var(--color-accent)",
  warning: "var(--color-warning)",
};

function ToastItem({ toast }: { toast: ToastType }) {
  const [isExiting, setIsExiting] = useState(false);
  const removeToast = useToastStore((state) => state.removeToast);

  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => removeToast(toast.id), 300);
      }, toast.duration - 300);

      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.duration, removeToast]);

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3
        bg-[var(--color-surface)] rounded-[var(--radius-md)] shadow-[var(--shadow-md)]
        border border-[var(--color-border)]
        transform transition-all duration-300
        ${isExiting ? "opacity-0 translate-x-full" : "opacity-100 translate-x-0"}
      `}
      style={{ borderLeftWidth: "4px", borderLeftColor: borderColorMap[toast.type] }}
    >
      {iconMap[toast.type]}
      <p className="text-sm font-medium text-[var(--color-text)]">{toast.message}</p>
      <button
        onClick={() => removeToast(toast.id)}
        className="ml-auto -mr-1 p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] rounded transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
