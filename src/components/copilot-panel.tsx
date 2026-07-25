"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, Send, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

type CopilotMessage = {
  id: string;
  role: string;
  content: string;
  createdAt: string;
};

const QUICK_PROMPTS = [
  "What's blocking setup?",
  "What should I do next?",
  "Summarize this implementation",
  "Draft customer clarification email",
  "Explain low-confidence mappings",
  "Have we seen this partner before?",
  "What transaction packs apply?",
];

function renderMarkdownLite(text: string) {
  return text.split("\n").map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <p key={i} className={line.startsWith("•") ? "ml-1" : undefined}>
        {parts.map((part, j) =>
          part.startsWith("**") && part.endsWith("**") ? (
            <strong key={j}>{part.slice(2, -2)}</strong>
          ) : (
            <span key={j}>{part}</span>
          )
        )}
      </p>
    );
  });
}

export function CopilotPanel({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const [open, setOpen] = useState(true);
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [readiness, setReadiness] = useState<{ score: number; label: string } | null>(null);
  const [nextActions, setNextActions] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const temporaryMessageId = useRef(0);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/copilot`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setMessages(data);
        } else {
          setMessages([
            {
              id: "welcome",
              role: "assistant",
              content: [
                `I'm your **Implementation Copilot** for **${projectName}**.`,
                "",
                "I track this implementation — documents, mappings, gaps, approvals, and readiness — from specification through production.",
                "",
                "Ask what's blocking build, what to do next, or request a customer clarification draft.",
              ].join("\n"),
              createdAt: new Date().toISOString(),
            },
          ]);
        }
      })
      .catch(() => undefined);
  }, [projectId, projectName]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setInput("");
    setLoading(true);
    temporaryMessageId.current += 1;

    const optimisticUser: CopilotMessage = {
      id: `temp-${temporaryMessageId.current}`,
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUser]);

    try {
      const res = await fetch(`/api/projects/${projectId}/copilot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Copilot request failed");

      setMessages((prev) => [...prev.filter((m) => m.id !== optimisticUser.id), optimisticUser, data.message]);
      setReadiness({ score: data.readinessScore, label: data.readinessLabel });
      setNextActions(data.nextActions ?? []);
    } catch {
      temporaryMessageId.current += 1;
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${temporaryMessageId.current}`,
          role: "assistant",
          content: "Sorry, I couldn't process that request. Please try again.",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-3 text-sm font-medium text-white shadow-lg hover:bg-indigo-500"
      >
        <Bot className="h-5 w-5" />
        Copilot
      </button>
    );
  }

  return (
    <aside className="fixed bottom-6 right-6 z-40 flex h-[min(720px,calc(100vh-3rem))] w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
      <div className="border-b border-slate-200 bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-4 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <p className="text-sm font-semibold">Implementation Copilot</p>
            </div>
            <p className="mt-1 text-xs text-indigo-100">Workflow intelligence for {projectName}</p>
          </div>
          <button onClick={() => setOpen(false)} className="rounded p-1 hover:bg-white/10">
            <X className="h-4 w-4" />
          </button>
        </div>

        {readiness && (
          <div className="mt-3 rounded-lg bg-white/10 px-3 py-2 text-xs">
            <p className="font-medium">Readiness {readiness.score}/100</p>
            <p className="text-indigo-100">{readiness.label}</p>
          </div>
        )}
      </div>

      {nextActions.length > 0 && (
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Next best actions</p>
          <ul className="mt-2 space-y-1">
            {nextActions.slice(0, 3).map((action) => (
              <li key={action} className="text-xs text-slate-700">
                • {action}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "rounded-xl px-3 py-2 text-sm leading-relaxed",
              message.role === "user"
                ? "ml-8 bg-indigo-600 text-white"
                : "mr-4 bg-slate-100 text-slate-800"
            )}
          >
            {message.role === "assistant" ? renderMarkdownLite(message.content) : message.content}
          </div>
        ))}
        {loading && (
          <div className="mr-4 flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Thinking...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-slate-200 p-3">
        <div className="mb-3 flex flex-wrap gap-2">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => sendMessage(prompt)}
              disabled={loading}
              className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600 hover:bg-slate-100 disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="flex items-center gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about blockers, next steps, mappings..."
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-lg bg-indigo-600 p-2 text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </aside>
  );
}
