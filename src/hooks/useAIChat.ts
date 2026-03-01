"use client";

import { useState, useCallback, useRef } from "react";
import { useAIStore } from "@/stores/aiStore";
import type { AIChatMessage, AIChatAction, LLMProvider } from "@/types/ai";
import { v4 as uuidv4 } from "uuid";

export function useAIChat() {
  const {
    chatMessages, addChatMessage, clearChat,
    llmProvider, setLLMProvider, setChatOpen,
  } = useAIStore();

  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const parseActions = (text: string): { cleanText: string; actions: AIChatAction[] } => {
    const match = text.match(/\[ACTIONS\]\s*([\s\S]*?)\s*\[\/ACTIONS\]/);
    if (!match) return { cleanText: text, actions: [] };

    try {
      const actions = JSON.parse(match[1]) as AIChatAction[];
      const cleanText = text.replace(/\[ACTIONS\][\s\S]*?\[\/ACTIONS\]/, "").trim();
      return { cleanText, actions };
    } catch {
      return { cleanText: text, actions: [] };
    }
  };

  const sendMessage = useCallback(async (
    content: string,
    imageContext?: string
  ) => {
    const userMsg: AIChatMessage = {
      id: uuidv4(),
      role: "user",
      content,
      timestamp: Date.now(),
    };
    addChatMessage(userMsg);

    setStreaming(true);
    abortRef.current = new AbortController();

    try {
      const messages = [...chatMessages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages,
          llm_provider: llmProvider,
          image_context: imageContext,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const err = await res.json() as { error: string };
        throw new Error(err.error ?? "チャットに失敗しました");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("Streaming not supported");

      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        // Extract text from SSE data events
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              // Handle different SSE formats
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text // Gemini
                ?? data.delta?.text // Claude
                ?? data.choices?.[0]?.delta?.content // OpenAI/Grok
                ?? "";
              fullText += text;
            } catch {
              // Skip non-JSON lines
            }
          }
        }
      }

      const { cleanText, actions } = parseActions(fullText);

      const assistantMsg: AIChatMessage = {
        id: uuidv4(),
        role: "assistant",
        content: cleanText,
        actions: actions.length > 0 ? actions : undefined,
        timestamp: Date.now(),
      };
      addChatMessage(assistantMsg);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        const errorMsg: AIChatMessage = {
          id: uuidv4(),
          role: "assistant",
          content: `エラー: ${err instanceof Error ? err.message : "不明なエラー"}`,
          timestamp: Date.now(),
        };
        addChatMessage(errorMsg);
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [chatMessages, llmProvider, addChatMessage]);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return {
    messages: chatMessages,
    streaming,
    llmProvider,
    setLLMProvider,
    sendMessage,
    stopStreaming,
    clearChat,
    setChatOpen,
  };
}
