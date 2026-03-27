"use client";

import React, { useState, useRef, useEffect } from "react";
import { X, PaperPlaneRight, Stop, Trash } from "@phosphor-icons/react";
import { useAIChat } from "@/hooks/useAIChat";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { AIChatAction, LLMProvider } from "@/types/ai";

const LLM_OPTIONS: Array<{ value: LLMProvider; label: string; disabled?: boolean }> = [
  { value: "grok", label: "Grok（1クレジット）" },
  { value: "gemini", label: "Gemini（1クレジット）" },
  { value: "claude", label: "Claude（準備中）", disabled: true },
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
    <div className="fixed right-0 top-0 bottom-0 w-[360px] z-40
      bg-[var(--color-surface)] backdrop-blur-xl border-l border-[var(--color-border)] shadow-[var(--shadow-lg)]
      flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-[var(--color-border)]">
        <h3 className="text-sm font-semibold text-[var(--color-text)]">AI アシスタント</h3>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={clearChat} icon={<Trash size={14} />}>クリア</Button>
          <button onClick={onClose} className="p-1 rounded-[var(--radius-sm)] hover:bg-[var(--color-accent-soft)] text-[var(--color-text-muted)] transition-colors duration-[var(--transition-fast)]">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* LLM Selector */}
      <div className="p-2 border-b border-[var(--color-border)]">
        <SegmentedControl
          options={LLM_OPTIONS}
          value={llmProvider}
          onChange={setLLMProvider}
          className="w-full"
        />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-[var(--color-text-muted)] text-center mt-8">
            画像について質問してみよう！
          </p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] px-3 py-2 rounded-[var(--radius-lg)] text-sm ${
              msg.role === "user"
                ? "bg-[var(--color-accent-soft)] text-[var(--color-text)]"
                : "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)]"
            }`}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.actions && msg.actions.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-[var(--color-border)]">
                  {msg.actions.map((action, i) => (
                    <button
                      key={i}
                      onClick={() => onAction?.(action)}
                      className="px-2 py-1 text-xs rounded-[var(--radius-sm)]
                        bg-[var(--color-accent-soft)] hover:bg-[var(--color-accent-hover)]
                        text-[var(--color-accent)] transition-colors duration-[var(--transition-fast)]"
                    >
                      {action.label}
                      {action.credits > 0 && <span className="ml-1 text-[var(--color-warning)]">{action.credits}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {streaming && (
          <div className="flex justify-start">
            <div className="px-3 py-2 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)]">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-[var(--color-accent)] rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-[var(--color-accent)] rounded-full animate-bounce [animation-delay:0.1s]" />
                <div className="w-2 h-2 bg-[var(--color-accent)] rounded-full animate-bounce [animation-delay:0.2s]" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-[var(--color-border)]">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="メッセージを入力..."
            rows={1}
            className="flex-1 px-3 py-2 rounded-[var(--radius-lg)] bg-[var(--color-bg)] border border-[var(--color-border)]
              text-[var(--color-text)] text-sm placeholder-[var(--color-text-muted)] resize-none
              focus:outline-none focus:border-[var(--color-accent)] transition-colors duration-[var(--transition-fast)]"
          />
          {streaming ? (
            <Button variant="danger" size="md" onClick={stopStreaming} icon={<Stop size={16} />}>
              停止
            </Button>
          ) : (
            <Button
              variant="primary"
              size="md"
              onClick={handleSend}
              disabled={!input.trim()}
              icon={<PaperPlaneRight size={16} />}
            >
              送信
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
