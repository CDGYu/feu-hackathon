"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ArrowUp, Mic } from "lucide-react";
import { useConversationStatus } from "@elevenlabs/react";
import { useNotebook } from "@/components/notebook-context";
import { CitationPill } from "@/components/citation-pill";
import { shortId, cn } from "@/lib/utils";
import type { ChatMessage, CitationRef } from "@/lib/types";

const CITATION_TOKEN_RE = /\[([^\]·]+?)\s*·\s*p\.?\s*([\d,\s]+)\]/gi;

function renderWithCitationsStripped(text: string): string {
  // Strip inline citation tokens so the prose reads cleanly. We render the
  // pills separately as part of the message.
  return text.replace(CITATION_TOKEN_RE, "").replace(/\s{2,}/g, " ").trim();
}

export function ConversationPanel() {
  const { sources, messages, addMessage, updateMessage } = useNotebook();
  const { status } = useConversationStatus();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const send = useCallback(
    async (question: string) => {
      if (sending || !question.trim()) return;
      const userMsg: ChatMessage = {
        id: shortId(),
        role: "user",
        text: question.trim(),
      };
      const placeholder: ChatMessage = {
        id: shortId(),
        role: "assistant",
        text: "",
        pending: true,
      };
      addMessage(userMsg);
      addMessage(placeholder);
      setDraft("");
      setSending(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ question: question.trim(), sources }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Chat failed");
        updateMessage(placeholder.id, {
          text: data.text,
          citations: data.citations ?? [],
          pending: false,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "May error.";
        updateMessage(placeholder.id, {
          text: `(Pasensya na — ${message})`,
          pending: false,
        });
      } finally {
        setSending(false);
      }
    },
    [sending, sources, addMessage, updateMessage]
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(draft);
  };

  const empty = messages.length === 0;
  const voiceConnected = status === "connected";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto pb-6"
      >
        {empty ? (
          <EmptyState sourceCount={sources.length} />
        ) : (
          <ul className="flex flex-col gap-6 pt-2">
            {messages.map((m) => (
              <Bubble key={m.id} message={m} />
            ))}
          </ul>
        )}
      </div>

      <form
        onSubmit={onSubmit}
        className="relative mt-2 flex items-end gap-[5px] border-t border-line-soft pt-3"
        aria-label="Ask erid a question"
      >
        <div className="relative flex-1">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(draft);
              }
            }}
            disabled={sending || sources.length === 0}
            rows={1}
            placeholder={
              sources.length === 0
                ? "Magdagdag muna ng source..."
                : voiceConnected
                ? "O i-type lang ang tanong mo..."
                : "Itanong sa text..."
            }
            className={cn(
              "w-full resize-none border border-line-soft bg-transparent px-3 py-3",
              "text-body text-canvas-white placeholder:text-canvas-white/40",
              "focus:border-iris-mist focus:outline-none",
              "disabled:opacity-50",
              "min-h-[52px] max-h-40 transition-colors",
              "field-sizing-content"
            )}
          />
        </div>
        <button
          type="submit"
          disabled={sending || !draft.trim() || sources.length === 0}
          aria-label="Send"
          className={cn(
            "grid size-[54px] shrink-0 place-items-center border border-line-graphite",
            "bg-transparent text-canvas-white transition-all",
            "hover:bg-hover-graphite",
            "active:bg-iris-mist active:text-void",
            "disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:scale-100"
          )}
        >
          <ArrowUp size={18} strokeWidth={2.5} />
        </button>
      </form>
    </div>
  );
}

function Bubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <li
        className="flex justify-end"
        style={{ animation: "float-up 0.3s ease-out" }}
      >
        <div className="max-w-[88%] border border-iris-mist/50 bg-panel p-3 text-body text-canvas-white">
          {message.text}
        </div>
      </li>
    );
  }

  const clean = renderWithCitationsStripped(message.text);
  const citations = message.citations ?? [];

  return (
    <li
      className="flex flex-col gap-2 border-t border-line-soft pt-5"
      style={{ animation: "float-up 0.4s ease-out" }}
    >
      <div className="flex items-center gap-2">
        <span className="micro text-iris-mist">
          erid
        </span>
      </div>
      <div
        className={cn(
          "max-w-[92%] text-body text-canvas-white",
          message.pending && "opacity-60"
        )}
      >
        {message.pending && !clean ? (
          <ThinkingDots />
        ) : (
          <p className="whitespace-pre-wrap">{clean}</p>
        )}
      </div>
      {citations.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {dedupe(citations).map((c, i) => (
            <CitationPill key={`${c.sourceId}-${c.page}-${i}`} citation={c} />
          ))}
        </div>
      )}
    </li>
  );
}

function dedupe(cs: CitationRef[]): CitationRef[] {
  const seen = new Set<string>();
  return cs.filter((c) => {
    const key = `${c.sourceName}|${c.page}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function EmptyState({ sourceCount }: { sourceCount: number }) {
  return (
    <div className="flex h-full min-h-[260px] flex-col items-start justify-center gap-6 text-left">
      <p className="font-editorial text-canvas-white">
        {sourceCount === 0
          ? "Magdagdag ng kahit isang source"
          : "Anong gusto mong matutunan?"}
      </p>
      <p className="max-w-md text-body text-canvas-white/70">
        {sourceCount === 0
          ? "erid will only answer from what you've loaded in. It's not a search engine — it's your notebook."
          : "Tap the orb to talk, or type below. Both are grounded in your sources."}
      </p>
      {sourceCount > 0 && (
        <span className="micro mt-2 inline-flex items-center gap-1.5 text-iris-mist">
          <Mic size={12} /> voice <span aria-hidden>·</span> text
        </span>
      )}
    </div>
  );
}

function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-1 align-middle">
      <span className="size-1.5 animate-pulse rounded-full bg-iris-mist [animation-delay:0ms]" />
      <span className="size-1.5 animate-pulse rounded-full bg-iris-mist [animation-delay:200ms]" />
      <span className="size-1.5 animate-pulse rounded-full bg-iris-mist [animation-delay:400ms]" />
    </span>
  );
}

