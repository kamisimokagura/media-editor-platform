import { NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface ChatRequest {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  llm_provider: "gemini" | "claude" | "grok";
  image_context?: string;
}

const SYSTEM_PROMPT = `You are an AI assistant for a media editor platform. Help users edit images and videos.
When suggesting actions, include them as JSON at the end of your response in this format:
[ACTIONS]
[{"label":"Action Name","type":"adjust|filter|ai_tool","params":{"key":"value"},"credits":0}]
[/ACTIONS]
Only include actions when the user asks to modify their image. For general questions, just respond normally.
Respond in the user's language.`;

async function streamGemini(messages: ChatRequest["messages"], imageContext?: string): Promise<ReadableStream> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY not configured");

  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  if (imageContext) {
    contents.unshift({ role: "user", parts: [{ text: `Current image context: ${imageContext}` }] });
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?key=${apiKey}&alt=sse`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      }),
    }
  );

  if (!res.ok) throw new Error(`Gemini error: ${await res.text()}`);
  return res.body!;
}

async function streamClaude(messages: ChatRequest["messages"], imageContext?: string): Promise<ReadableStream> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const anthropicMessages = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  if (imageContext) {
    anthropicMessages.unshift({ role: "user", content: `Current image context: ${imageContext}` });
    anthropicMessages.unshift({ role: "assistant", content: "I understand the current image context. How can I help?" });
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: anthropicMessages,
      stream: true,
    }),
  });

  if (!res.ok) throw new Error(`Claude error: ${await res.text()}`);
  return res.body!;
}

async function streamGrok(messages: ChatRequest["messages"], imageContext?: string): Promise<ReadableStream> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("XAI_API_KEY not configured");

  const grokMessages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    ...(imageContext ? [{ role: "user" as const, content: `Current image context: ${imageContext}` }] : []),
    ...messages,
  ];

  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "grok-3-mini",
      messages: grokMessages,
      stream: true,
    }),
  });

  if (!res.ok) throw new Error(`Grok error: ${await res.text()}`);
  return res.body!;
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "認証が必要です" }), { status: 401 });
  }

  const body = await request.json() as ChatRequest;
  if (!body.messages || !body.llm_provider) {
    return new Response(JSON.stringify({ error: "messages と llm_provider が必要です" }), { status: 400 });
  }

  try {
    let stream: ReadableStream;

    switch (body.llm_provider) {
      case "gemini":
        stream = await streamGemini(body.messages, body.image_context);
        break;
      case "claude":
        stream = await streamClaude(body.messages, body.image_context);
        break;
      case "grok":
        stream = await streamGrok(body.messages, body.image_context);
        break;
      default:
        return new Response(JSON.stringify({ error: "不明なプロバイダー" }), { status: 400 });
    }

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "チャットに失敗しました" }),
      { status: 500 }
    );
  }
}
