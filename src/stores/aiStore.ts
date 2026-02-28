import { create } from "zustand";
import type { AILayer, AIChatMessage, LLMProvider, AIProcessingStatus } from "@/types/ai";

interface AIState {
  // Layers
  layers: AILayer[];
  addLayer: (layer: AILayer) => void;
  removeLayer: (id: string) => void;
  toggleLayerVisibility: (id: string) => void;
  clearLayers: () => void;

  // Chat
  chatMessages: AIChatMessage[];
  chatOpen: boolean;
  llmProvider: LLMProvider;
  addChatMessage: (message: AIChatMessage) => void;
  setChatOpen: (open: boolean) => void;
  setLLMProvider: (provider: LLMProvider) => void;
  clearChat: () => void;

  // Processing
  aiStatus: AIProcessingStatus;
  aiProgress: string;
  setAIStatus: (status: AIProcessingStatus, progress?: string) => void;

  // ONNX models loaded state
  loadedModels: Set<string>;
  markModelLoaded: (name: string) => void;

  // Credits (client-side cache)
  creditsRemaining: number;
  setCreditsRemaining: (credits: number) => void;
}

export const useAIStore = create<AIState>((set) => ({
  layers: [],
  addLayer: (layer) => set((s) => ({ layers: [...s.layers, layer] })),
  removeLayer: (id) => set((s) => ({ layers: s.layers.filter((l) => l.id !== id) })),
  toggleLayerVisibility: (id) =>
    set((s) => ({
      layers: s.layers.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)),
    })),
  clearLayers: () => set({ layers: [] }),

  chatMessages: [],
  chatOpen: false,
  llmProvider: "gemini",
  addChatMessage: (message) => set((s) => ({ chatMessages: [...s.chatMessages, message] })),
  setChatOpen: (open) => set({ chatOpen: open }),
  setLLMProvider: (provider) => set({ llmProvider: provider }),
  clearChat: () => set({ chatMessages: [] }),

  aiStatus: "idle",
  aiProgress: "",
  setAIStatus: (status, progress) => set({ aiStatus: status, aiProgress: progress ?? "" }),

  loadedModels: new Set(),
  markModelLoaded: (name) =>
    set((s) => {
      const next = new Set(s.loadedModels);
      next.add(name);
      return { loadedModels: next };
    }),

  creditsRemaining: 0,
  setCreditsRemaining: (credits) => set({ creditsRemaining: credits }),
}));
