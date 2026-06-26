import { Type, type Schema } from "@google/genai";
import type { CitationRef, Source, StudyKind, StudyOptions } from "@/lib/types";

export type RawCitation = { sourceName: string; page: number };

const STUDY_KINDS: StudyKind[] = ["quiz", "flashcards", "summary", "explain"];

export function resolveCitations(
  raw: RawCitation[] | undefined,
  sources: Source[]
): CitationRef[] {
  if (!raw?.length) return [];
  const byName = new Map<string, Source>();
  sources.forEach((s) => byName.set(s.name.toLowerCase().trim(), s));

  const out: CitationRef[] = [];
  const seen = new Set<string>();
  for (const c of raw) {
    if (!c || typeof c.sourceName !== "string" || !Number.isFinite(c.page)) continue;
    const key = `${c.sourceName.toLowerCase().trim()}|${c.page}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const source = byName.get(c.sourceName.toLowerCase().trim());
    out.push({
      sourceId: source?.id ?? "unknown",
      sourceName: c.sourceName,
      page: c.page,
    });
  }
  return out;
}

export function renderSourcesForStudy(sources: Source[]): string {
  if (sources.length === 0) return "<no sources>";
  return sources
    .map((s) =>
      s.pages
        .map((p) => `--- ${s.name} · p. ${p.page} ---\n${p.text}`)
        .join("\n\n")
    )
    .join("\n\n");
}

export type ValidationResult = { ok: true } | { ok: false; error: string };

export function validateStudyRequest(body: unknown): ValidationResult {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid body" };
  }
  const b = body as { kind?: unknown; sources?: unknown; options?: unknown };
  if (typeof b.kind !== "string" || !STUDY_KINDS.includes(b.kind as StudyKind)) {
    return { ok: false, error: "Unknown or missing study kind" };
  }
  if (!Array.isArray(b.sources) || b.sources.length === 0) {
    return { ok: false, error: "Add at least one source first" };
  }
  if (b.kind === "explain") {
    const o = (b.options ?? {}) as { sourceId?: unknown; page?: unknown };
    if (typeof o.sourceId !== "string" || !o.sourceId.trim()) {
      return { ok: false, error: "explain requires options.sourceId" };
    }
    if (typeof o.page !== "number" || !Number.isFinite(o.page)) {
      return { ok: false, error: "explain requires options.page" };
    }
  }
  return { ok: true };
}

const citationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    sourceName: {
      type: Type.STRING,
      description: "Exact source name shown in the page markers",
    },
    page: {
      type: Type.INTEGER,
      description: "Page number shown in the page markers",
    },
  },
  required: ["sourceName", "page"],
};

const citationsArray: Schema = { type: Type.ARRAY, items: citationSchema };

export const STUDY_SCHEMAS: Record<StudyKind, Schema> = {
  quiz: {
    type: Type.OBJECT,
    properties: {
      questions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            q: { type: Type.STRING },
            choices: { type: Type.ARRAY, items: { type: Type.STRING } },
            answerIndex: {
              type: Type.INTEGER,
              description: "0-based index of the correct choice",
            },
            explanation: { type: Type.STRING },
            citations: citationsArray,
          },
          required: ["q", "choices", "answerIndex", "explanation", "citations"],
        },
      },
    },
    required: ["questions"],
  },
  flashcards: {
    type: Type.OBJECT,
    properties: {
      cards: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            front: { type: Type.STRING },
            back: { type: Type.STRING },
            citations: citationsArray,
          },
          required: ["front", "back", "citations"],
        },
      },
    },
    required: ["cards"],
  },
  summary: {
    type: Type.OBJECT,
    properties: {
      tldr: { type: Type.STRING },
      keyPoints: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            citations: citationsArray,
          },
          required: ["text", "citations"],
        },
      },
    },
    required: ["tldr", "keyPoints"],
  },
  explain: {
    type: Type.OBJECT,
    properties: {
      explanation: { type: Type.STRING },
      citations: citationsArray,
    },
    required: ["explanation", "citations"],
  },
};

export function scopeSourcesFor(
  kind: StudyKind,
  sources: Source[],
  options: StudyOptions
): Source[] {
  if (kind === "explain") {
    const source = sources.find((s) => s.id === options.sourceId);
    if (!source) return [];
    const page = source.pages.find((p) => p.page === options.page);
    return page ? [{ ...source, pages: [page] }] : [];
  }
  if (kind === "summary" && options.sourceId) {
    const source = sources.find((s) => s.id === options.sourceId);
    return source ? [source] : sources;
  }
  return sources;
}

const GROUNDING = `You are erid, a patient Filipino study companion. Use ONLY the SOURCES below.
Match the language of the sources (Tagalog, English, or Taglish) with a warm kuya/ate tone.
Every item MUST include citations using the EXACT source name and page number from the page markers.
If the sources do not support an item, do not invent it. Never use outside knowledge.`;

function taskInstruction(kind: StudyKind, options: StudyOptions): string {
  const count = options.count ?? (kind === "quiz" ? 5 : 8);
  switch (kind) {
    case "quiz":
      return `Create ${count} multiple-choice questions testing understanding of the SOURCES. Each question has EXACTLY 4 plausible choices, exactly one correct, the 0-based index of the correct choice, and a one-sentence explanation grounded in the sources.`;
    case "flashcards":
      return `Create ${count} flashcards. Each has a short front (a term, concept, or question) and a back (the concise answer/definition) drawn from the SOURCES.`;
    case "summary":
      return `Write a 1-2 sentence tldr of the SOURCES, then 3 to 6 key points. Each key point is one sentence with its citation.`;
    case "explain":
      return `Explain the SOURCE content below in simple, plain language, as if tutoring a student who is seeing it for the first time. Stay grounded and cite the page.`;
  }
}

export function buildStudyPrompt(
  kind: StudyKind,
  sources: Source[],
  options: StudyOptions
): string {
  return `${GROUNDING}

SOURCES:
${renderSourcesForStudy(sources)}

TASK:
${taskInstruction(kind, options)}`;
}
