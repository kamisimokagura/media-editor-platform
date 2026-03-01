"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAIChat } from "@/hooks/useAIChat";
import type { AIChatAction, LLMProvider } from "@/types/ai";

const LLM_OPTIONS: Array<{ id: LLMProvider; label: string; cost: string }> = [
  { id: "gemini", label: "Gemini", cost: "Free" },
  { id: "claude", label: "Claude", cost: "2cr" },
  { id: "grok", label: "Grok", cost: "1cr" },
];

interface AIChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  imageContext?: string;
  onAction?: (action: AIChatAction) => void;
}

export function AIChatPanel({ isOpen, onClose, imageContext, onAction }: AIChatPanelProps) {
  const { messages, streaming, llmProvider, setLLMProvider, sendMessage, stopStreaming, clearChat } = useAIChat();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || streaming) return;
    sendMessage(input.trim(), imageContext);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 bottom-0 w-80 z-40
      bg-dark-900/95 backdrop-blur-xl border-l border-white/10 shadow-2xl
      flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/10">
        <h3 className="text-sm font-semibold text-white">AI Assistant</h3>
        <div className="flex gap-1">
          <button onClick={clearChat} className="p-1 rounded hover:bg-white/10 text-white/40 text-xs">Clear</button>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/10 text-white/50">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* LLM Selector */}
      <div className="flex gap-1 p-2 border-b border-white/5">
        {LLM_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setLLMProvider(opt.id)}
            className={`flex-1 px-2 py-1 text-xs rounded-lg transition-colors ${
              llmProvider === opt.id
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                : "bg-white/5 text-white/50 border border-transparent hover:bg-white/10"
            }`}
          >
            {opt.label} <span className="text-[10px] opacity-60">{opt.cost}</span>
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-white/30 text-center mt-8">
            画像について質問してみよう！
          </p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${
              msg.role === "user"
                ? "bg-purple-500/20 text-white/90"
                : "bg-white/5 text-white/80"
            }`}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.actions && msg.actions.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-white/10">
                  {msg.actions.map((action, i) => (
                    <button
                      key={i}
                      onClick={() => onAction?.(action)}
                      className="px-2 py-1 text-xs rounded-lg
                        bg-purple-500/20 hover:bg-purple-500/30
                        text-purple-300 transition-colors"
                    >
                      {action.label}
                      {action.credits > 0 && <span className="ml-1 text-amber-400">{action.credits}cr</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {streaming && (
          <div className="flex justify-start">
            <div className="px-3 py-2 rounded-xl bg-white/5">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/10">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="メッセージを入力..."
            rows={1}
            className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10
              text-white text-sm placeholder-white/30 resize-none
              focus:outline-none focus:border-purple-500/50"
          />
          {streaming ? (
            <button onClick={stopStreaming} className="px-3 py-2 rounded-xl bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30">
              Stop
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="px-3 py-2 rounded-xl bg-purple-500/20 text-purple-300 text-sm
                hover:bg-purple-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Send
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
