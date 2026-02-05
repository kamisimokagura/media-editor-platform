import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import type { Toast, ToastType } from "@/types";

interface ToastState {
  toasts: Toast[];
  addToast: (type: ToastType, message: string, duration?: number) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  addToast: (type, message, duration = 5000) => {
    const id = uuidv4();
    const toast: Toast = { id, type, message, duration };

    set((state) => ({
      toasts: [...state.toasts, toast],
    }));

    // Auto remove after duration
    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clearToasts: () => {
    set({ toasts: [] });
  },
}));

// Helper functions for convenience
export const toast = {
  success: (message: string, duration?: number) =>
    useToastStore.getState().addToast("success", message, duration),
  error: (message: string, duration?: number) =>
    useToastStore.getState().addToast("error", message, duration),
  info: (message: string, duration?: number) =>
    useToastStore.getState().addToast("info", message, duration),
  warning: (message: string, duration?: number) =>
    useToastStore.getState().addToast("warning", message, duration),
};
