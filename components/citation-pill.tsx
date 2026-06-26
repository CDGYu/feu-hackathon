"use client";

import type { CitationRef } from "@/lib/types";

export function CitationPill({ citation }: { citation: CitationRef }) {
  return (
    <span
      className="inline-flex items-baseline gap-1 border border-iris-mist/40 bg-transparent px-2 py-0.5 text-[12px] uppercase leading-normal tracking-[-0.36px] text-canvas-white/85"
      title={`${citation.sourceName} · page ${citation.page}`}
    >
      <span className="truncate max-w-[12ch]">{citation.sourceName}</span>
      <span aria-hidden>·</span>
      <span>p.{citation.page}</span>
    </span>
  );
}
