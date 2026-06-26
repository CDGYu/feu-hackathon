"use client";

import { useState } from "react";
import { useNotebook } from "@/components/notebook-context";
import { CitationPill } from "@/components/citation-pill";
import { cn } from "@/lib/utils";
import type {
  StudyKind,
  StudyOptions,
  StudyResult,
  QuizQuestion,
  Flashcard,
  KeyPoint,
  CitationRef,
  Source,
} from "@/lib/types";

type Group = "review" | "read";

const TOOLS: Record<Group, { kind: StudyKind; label: string }[]> = {
  review: [
    { kind: "quiz", label: "quiz" },
    { kind: "flashcards", label: "flashcards" },
  ],
  read: [
    { kind: "summary", label: "summary" },
    { kind: "explain", label: "explain" },
  ],
};

async function fetchStudy(
  kind: StudyKind,
  sources: Source[],
  options: StudyOptions
): Promise<StudyResult> {
  const res = await fetch("/api/study", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ kind, sources, options }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Study generation failed");
  return data as StudyResult;
}

export function StudyTools({ group }: { group: Group }) {
  const { sources } = useNotebook();
  const tools = TOOLS[group];
  const [kind, setKind] = useState<StudyKind>(tools[0].kind);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StudyResult | null>(null);
  const [sourceId, setSourceId] = useState("");
  const [page, setPage] = useState(1);

  const disabled = sources.length === 0;

  function pick(k: StudyKind) {
    setKind(k);
    setResult(null);
    setError(null);
  }

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const options: StudyOptions =
        kind === "explain"
          ? { sourceId: sourceId || sources[0]?.id, page }
          : kind === "summary"
          ? {}
          : { count: kind === "quiz" ? 5 : 8 };
      setResult(await fetchStudy(kind, sources, options));
    } catch (e) {
      setError(e instanceof Error ? e.message : "May error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div role="tablist" className="mb-4 inline-flex self-start border border-line-graphite">
        {tools.map((t) => (
          <button
            key={t.kind}
            role="tab"
            aria-selected={kind === t.kind}
            onClick={() => pick(t.kind)}
            className={cn(
              "px-4 py-1.5 text-[12px] uppercase tracking-[-0.36px] transition-colors",
              kind === t.kind
                ? "bg-canvas-white text-void"
                : "text-canvas-white/70 hover:bg-hover-graphite"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {kind === "explain" && !disabled && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <select
            value={sourceId || sources[0]?.id}
            onChange={(e) => setSourceId(e.target.value)}
            className="border border-line-soft bg-transparent px-3 py-2 text-[16px] text-canvas-white focus:border-iris-mist focus:outline-none"
          >
            {sources.map((s) => (
              <option key={s.id} value={s.id} className="bg-panel">
                {s.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            value={page}
            onChange={(e) => setPage(Math.max(1, Number(e.target.value) || 1))}
            aria-label="Page"
            className="w-24 border border-line-soft bg-transparent px-3 py-2 text-[16px] text-canvas-white focus:border-iris-mist focus:outline-none"
          />
        </div>
      )}

      <button
        type="button"
        onClick={generate}
        disabled={disabled || busy}
        className="mb-4 inline-flex w-fit items-center gap-2 border border-line-graphite bg-transparent px-5 py-2.5 text-xs uppercase tracking-[-0.36px] text-canvas-white transition-colors hover:bg-hover-graphite disabled:opacity-40 disabled:hover:bg-transparent"
      >
        {busy ? "Ginagawa..." : disabled ? "Magdagdag muna ng source" : `Gumawa ng ${kind}`}
      </button>

      {error && (
        <p role="status" className="micro mb-3 text-apricot-wash">
          {error}
        </p>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {result && <StudyResultView result={result} />}
      </div>
    </div>
  );
}

function Citations({ items }: { items: CitationRef[] }) {
  if (!items?.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {items.map((c, i) => (
        <CitationPill key={`${c.sourceId}-${c.page}-${i}`} citation={c} />
      ))}
    </div>
  );
}

function Empty() {
  return (
    <p className="text-[16px] text-canvas-white/55">
      Wala akong nahanap sa iyong mga sources.
    </p>
  );
}

function StudyResultView({ result }: { result: StudyResult }) {
  switch (result.kind) {
    case "quiz":
      return <QuizView questions={result.questions} />;
    case "flashcards":
      return <FlashcardsView cards={result.cards} />;
    case "summary":
      return <SummaryView tldr={result.tldr} keyPoints={result.keyPoints} />;
    case "explain":
      return <ExplainView explanation={result.explanation} citations={result.citations} />;
  }
}

function QuizView({ questions }: { questions: QuizQuestion[] }) {
  if (!questions.length) return <Empty />;
  return (
    <ol className="flex flex-col gap-5">
      {questions.map((q, i) => (
        <QuizItem key={i} index={i} q={q} />
      ))}
    </ol>
  );
}

function QuizItem({ index, q }: { index: number; q: QuizQuestion }) {
  const [revealed, setRevealed] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <li className="border-t border-line-soft pt-4">
      <p className="text-[24px] leading-normal tracking-[-0.24px] text-canvas-white">
        {index + 1}. {q.q}
      </p>
      <div className="mt-3 flex flex-col gap-1.5">
        {q.choices.map((c, ci) => {
          const state = !revealed
            ? "idle"
            : ci === q.answerIndex
            ? "correct"
            : picked === ci
            ? "wrong"
            : "idle";
          return (
            <button
              key={ci}
              type="button"
              disabled={revealed}
              onClick={() => {
                setPicked(ci);
                setRevealed(true);
              }}
              className={cn(
                "border px-3 py-2 text-left text-[16px] text-canvas-white transition-colors",
                state === "correct" && "border-iris-mist bg-iris-mist/10",
                state === "wrong" && "border-apricot-wash bg-apricot-wash/10",
                state === "idle" && "border-line-soft hover:bg-hover-graphite"
              )}
            >
              {c}
            </button>
          );
        })}
      </div>
      {revealed && (
        <div className="mt-3">
          <p className="text-[16px] text-canvas-white/80">{q.explanation}</p>
          <Citations items={q.citations} />
        </div>
      )}
    </li>
  );
}

function FlashcardsView({ cards }: { cards: Flashcard[] }) {
  if (!cards.length) return <Empty />;
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {cards.map((c, i) => (
        <FlashcardView key={i} card={c} />
      ))}
    </div>
  );
}

function FlashcardView({ card }: { card: Flashcard }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setFlipped((f) => !f)}
      className="flex min-h-[120px] flex-col justify-between border border-line-soft bg-panel p-4 text-left transition-colors hover:border-iris-mist"
    >
      <p className="text-[20px] leading-normal tracking-[-0.24px] text-canvas-white">
        {flipped ? card.back : card.front}
      </p>
      <span className="micro mt-3 text-canvas-white/45">
        {flipped ? "back" : "front"} · tap
      </span>
      {flipped && <Citations items={card.citations} />}
    </button>
  );
}

function SummaryView({ tldr, keyPoints }: { tldr: string; keyPoints: KeyPoint[] }) {
  return (
    <div className="flex flex-col gap-5">
      <p className="text-[24px] leading-normal tracking-[-0.24px] text-canvas-white">{tldr}</p>
      <ul className="flex flex-col gap-3">
        {keyPoints.map((k, i) => (
          <li key={i} className="border-t border-line-soft pt-3">
            <p className="text-[16px] text-canvas-white/85">{k.text}</p>
            <Citations items={k.citations} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ExplainView({
  explanation,
  citations,
}: {
  explanation: string;
  citations: CitationRef[];
}) {
  return (
    <div>
      <p className="whitespace-pre-wrap text-[20px] leading-normal tracking-[-0.24px] text-canvas-white/90">
        {explanation}
      </p>
      <Citations items={citations} />
    </div>
  );
}
