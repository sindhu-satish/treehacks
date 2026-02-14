"use client";

import { useState, useRef, useEffect } from "react";

type ToolCall = { name: string; input?: unknown };
type Message = { role: "user" | "assistant"; content: string; toolCalls?: ToolCall[] };

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [toolBadge, setToolBadge] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, toolBadge]);

  async function loadDemo() {
    try {
      const res = await fetch("/api/demo");
      const data = await res.json();
      if (Array.isArray(data.messages)) setMessages(data.messages);
    } catch {
      setMessages([
        { role: "user", content: "I want to eat healthier but I don't know where to start." },
        { role: "assistant", content: "I'd love to help! To give you ideas that fit your life, tell me: any dietary restrictions? Budget per week? Cooking skill? And anything you've been feeling (e.g. tired) — it can shape what we focus on." },
      ]);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const userMessage: Message = { role: "user", content: text };
    setMessages((m) => [...m, userMessage]);
    setInput("");
    setLoading(true);
    setToolBadge(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await res.json();

      if (data.toolCalls?.length) {
        setToolBadge(
          `Used: ${data.toolCalls.map((t: { name: string }) => t.name).join(", ")}`
        );
      }

      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: data.text || data.error || "No response.",
          toolCalls: data.toolCalls?.length ? data.toolCalls : undefined,
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Network error. Please try again." },
      ]);
    } finally {
      setLoading(false);
      setToolBadge(null);
    }
  }

  return (
    <main className="min-h-screen flex flex-col max-w-2xl mx-auto px-4 py-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-amber-900">Mahm</h1>
          <p className="text-sm text-amber-800/80">
            Make At Home Mmmm — your AI nutritionist & personal shopper
          </p>
        </div>
        <button
          type="button"
          onClick={loadDemo}
          className="shrink-0 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100"
        >
          Load demo backup
        </button>
      </header>

      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.length === 0 && (
          <p className="text-gray-500 text-sm">
            Example: &quot;I&apos;m vegetarian, $80/week, trying to lose weight. What should I eat?&quot;
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] bg-amber-700 text-white rounded-2xl rounded-tr-sm px-4 py-2"
                : "mr-auto max-w-[85%] bg-white border border-amber-200 rounded-2xl rounded-tl-sm px-4 py-2 shadow-sm"
            }
          >
            <p className="whitespace-pre-wrap text-sm">{m.content}</p>
            {m.role === "assistant" && m.toolCalls?.length ? (
              <p className="mt-2 text-xs text-amber-700/80">
                Tools used: {m.toolCalls.map((t) => t.name).join(", ")}
              </p>
            ) : null}
          </div>
        ))}
        {loading && (
          <div className="mr-auto max-w-[85%] bg-white border border-amber-200 rounded-2xl rounded-tl-sm px-4 py-2 shadow-sm">
            {toolBadge ? (
              <p className="text-xs text-amber-700">{toolBadge}</p>
            ) : (
              <p className="text-sm text-gray-500">Mahm is thinking…</p>
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Mahm anything…"
          className="flex-1 rounded-xl border border-amber-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </main>
  );
}
