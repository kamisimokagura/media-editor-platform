"use client";

import { useState } from "react";
import { Header } from "@/components/layout";
import { Card, Button, Input, Textarea } from "@/components/ui";
import { Envelope, Clock, ChatCircle } from "@phosphor-icons/react";
import { toast } from "@/stores/toastStore";

const CONTACT_EMAIL = "kamigaminosinri@gmail.com";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSending(true);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          message,
        }),
      });

      if (!response.ok) {
        let errorMessage = "送信に失敗しました。時間を置いて再度お試しください。";
        try {
          const data = (await response.json()) as { error?: string };
          if (typeof data.error === "string" && data.error.length > 0) {
            errorMessage = data.error;
          }
        } catch {
          // Keep fallback message when response body is not JSON.
        }
        throw new Error(errorMessage);
      }

      toast.success("お問い合わせを送信しました。");
      setName("");
      setEmail("");
      setMessage("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "送信に失敗しました。");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Header />

      <main className="w-full flex justify-center">
        <div className="w-full max-w-4xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <h1 className="text-3xl font-bold text-[var(--color-text)] mb-3">お問い合わせ</h1>
          <p className="text-sm text-[var(--color-text-muted)] mb-8">
            バグ報告、機能要望、契約・請求に関する相談を受け付けています。
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
            <Card padding="md">
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="お名前"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />

                <Input
                  label="メールアドレス"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />

                <Textarea
                  label="お問い合わせ内容"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={6}
                />

                <Button
                  type="submit"
                  isLoading={sending}
                  className="w-full sm:w-auto"
                >
                  {sending ? "送信中..." : "送信する"}
                </Button>
              </form>
            </Card>

            <Card padding="md">
              <h2 className="text-lg font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2">
                <ChatCircle size={20} weight="duotone" />
                連絡先
              </h2>
              <p className="text-sm text-[var(--color-text-muted)] mb-4">
                緊急時や長文の相談はメールでご連絡ください。
              </p>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] bg-[var(--color-accent-soft)] text-sm text-[var(--color-accent-text)] hover:bg-[var(--color-accent)] hover:text-[var(--color-text-inverse)] transition-colors duration-150"
              >
                <Envelope size={16} weight="duotone" />
                {CONTACT_EMAIL}
              </a>

              <div className="mt-6 text-xs text-[var(--color-text-muted)] space-y-2">
                <p className="flex items-center gap-1.5">
                  <Clock size={14} weight="duotone" />
                  受付時間: 平日 10:00-18:00 (JST)
                </p>
                <p className="flex items-center gap-1.5">
                  <Clock size={14} weight="duotone" />
                  通常返信: 1-2営業日
                </p>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
