# Study Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four source-grounded study tools to erid — quiz, flashcards, summary, explain — served by one `/api/study` route and surfaced via two new workspace tabs alongside the existing chat.

**Architecture:** A single `POST /api/study` route delegates to `lib/study-server.ts` (`runStudy`), which calls Gemini 2.5 Flash with per-`kind` structured-output schemas and resolves model citations to the existing `CitationRef` shape. All pure logic (schemas, source rendering, prompt building, request validation, citation resolution) lives in `lib/study.ts` so it is unit-testable without a live model. The workspace panel becomes a three-tab shell (`ask` / `review` / `read`) reusing the tablist idiom already in `sources-panel.tsx`.

**Tech Stack:** Next.js 16 (App Router, route handlers), TypeScript, `@google/genai` v2.10 (structured output via `responseSchema`), Tailwind 4, vitest (new — unit tests for pure logic).

## Global Constraints

- **Grounding:** every tool answers ONLY from the loaded sources; never use outside knowledge. (verbatim spec rule)
- **Language:** generated content matches the source language — Tagalog / English / Taglish. (verbatim spec rule)
- **Citations:** every produced item carries citations resolved to real source pages via the existing `CitationRef` type and rendered with the existing `CitationPill`.
- **Model:** `gemini-2.5-flash` (same as `lib/gemini-server.ts`).
- **Route convention:** `export async function POST(req: Request)`, `NextResponse.json(...)`, `export const runtime = "nodejs"`, `export const dynamic = "force-dynamic"` — matches `app/api/chat/route.ts`.
- **No new persistence:** study results live in component state only; `localStorage` continues to persist `sources` unchanged.
- **UI style:** lowercase labels; existing Tailwind tokens only (`bg-panel`, `border-line-soft`, `border-line-graphite`, `iris-mist`, `apricot-wash`, `canvas-white`, `void`, `micro`, `hover-graphite`); Filipino-first copy.
- **Branch:** `feat/study-features`.

---

## File Structure

**New**
- `lib/study.ts` — pure: study types' runtime helpers — `RawCitation`, `resolveCitations`, `renderSourcesForStudy`, `validateStudyRequest`, `scopeSourcesFor`, `STUDY_SCHEMAS`, `buildStudyPrompt`. No `server-only`.
- `lib/study-server.ts` — `server-only`: `runStudy(req)` — calls Gemini, maps to `StudyResult`.
- `app/api/study/route.ts` — thin POST handler: parse → validate → `runStudy` → JSON.
- `components/workspace-tabs.tsx` — three-tab shell.
- `components/study-tools.tsx` — quiz / flashcards / summary / explain UIs + shared fetch.
- `vitest.config.ts` — minimal config with `@` alias.
- `lib/study.test.ts`, `lib/study-server.test.ts`, `app/api/study/route.test.ts` — tests.

**Modified**
- `lib/types.ts` — add study types.
- `app/page.tsx` — render `<WorkspaceTabs />` instead of `<ConversationPanel />` directly.
- `package.json` — add `vitest` devDep + `test` script.

**Untouched:** `chat`/`kb`/`signed-url` routes, `gemini-server.ts`, `elevenlabs-server.ts`, `citations.ts`, voice path, persistence.

---

## Task 1: Test infrastructure, study types, and `resolveCitations`

**Files:**
- Modify: `package.json` (scripts + devDependencies)
- Create: `vitest.config.ts`
- Modify: `lib/types.ts` (append study types)
- Create: `lib/study.ts`
- Test: `lib/study.test.ts`

**Interfaces:**
- Produces: study types in `lib/types.ts` (`StudyKind`, `QuizQuestion`, `Flashcard`, `KeyPoint`, `StudyResult`, `StudyOptions`, `StudyRequest`); `RawCitation = { sourceName: string; page: number }` and `resolveCitations(raw: RawCitation[] | undefined, sources: Source[]): CitationRef[]` in `lib/study.ts`.

- [ ] **Step 1: Install vitest and add the test script**

Run:
```bash
npm install -D vitest
```
Then edit `package.json` — add a `test` script to the existing `scripts` block:
```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run"
  },
```
Expected: `vitest` appears under `devDependencies`; `npm test` is runnable.

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
```

- [ ] **Step 3: Append study types to `lib/types.ts`**

Add at the end of `lib/types.ts` (after the existing `ConversationMode` type):
```ts
export type StudyKind = "quiz" | "flashcards" | "summary" | "explain";

export type QuizQuestion = {
  q: string;
  choices: string[];
  answerIndex: number;
  explanation: string;
  citations: CitationRef[];
};

export type Flashcard = {
  front: string;
  back: string;
  citations: CitationRef[];
};

export type KeyPoint = {
  text: string;
  citations: CitationRef[];
};

export type StudyResult =
  | { kind: "quiz"; questions: QuizQuestion[] }
  | { kind: "flashcards"; cards: Flashcard[] }
  | { kind: "summary"; tldr: string; keyPoints: KeyPoint[] }
  | {
      kind: "explain";
      sourceId: string;
      page: number;
      explanation: string;
      citations: CitationRef[];
    };

export type StudyOptions = {
  count?: number;
  sourceId?: string;
  page?: number;
};

export type StudyRequest = {
  kind: StudyKind;
  sources: Source[];
  options?: StudyOptions;
};
```

- [ ] **Step 4: Write the failing test for `resolveCitations`**

Create `lib/study.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { resolveCitations } from "@/lib/study";
import type { Source } from "@/lib/types";

const sources: Source[] = [
  { id: "s1", name: "Sibika", kind: "text", pages: [{ page: 1, text: "x" }], addedAt: 0 },
  { id: "s2", name: "Algebra Notes", kind: "pdf", pages: [{ page: 4, text: "y" }], addedAt: 0 },
];

describe("resolveCitations", () => {
  it("maps source name (case-insensitive) to its id", () => {
    const out = resolveCitations(
      [{ sourceName: "algebra notes", page: 4 }],
      sources
    );
    expect(out).toEqual([{ sourceId: "s2", sourceName: "algebra notes", page: 4 }]);
  });

  it("uses 'unknown' for an unmatched source name", () => {
    const out = resolveCitations([{ sourceName: "Ghost", page: 2 }], sources);
    expect(out).toEqual([{ sourceId: "unknown", sourceName: "Ghost", page: 2 }]);
  });

  it("dedupes by name+page and tolerates undefined", () => {
    const out = resolveCitations(
      [
        { sourceName: "Sibika", page: 1 },
        { sourceName: "Sibika", page: 1 },
      ],
      sources
    );
    expect(out).toHaveLength(1);
    expect(resolveCitations(undefined, sources)).toEqual([]);
  });
});
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `npm test -- lib/study.test.ts`
Expected: FAIL — `resolveCitations` is not exported from `@/lib/study` (module not found / not a function).

- [ ] **Step 6: Create `lib/study.ts` with `resolveCitations`**

```ts
import type { CitationRef, Source } from "@/lib/types";

export type RawCitation = { sourceName: string; page: number };

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
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npm test -- lib/study.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vitest.config.ts lib/types.ts lib/study.ts lib/study.test.ts
git commit -m "feat: add vitest, study types, and citation resolution"
```

---

## Task 2: `renderSourcesForStudy` and `validateStudyRequest`

**Files:**
- Modify: `lib/study.ts` (add two functions)
- Test: `lib/study.test.ts` (add cases)

**Interfaces:**
- Consumes: `RawCitation` (Task 1).
- Produces: `renderSourcesForStudy(sources: Source[]): string`; `ValidationResult = { ok: true } | { ok: false; error: string }`; `validateStudyRequest(body: unknown): ValidationResult`.

- [ ] **Step 1: Write the failing tests**

Append to `lib/study.test.ts`:
```ts
import { renderSourcesForStudy, validateStudyRequest } from "@/lib/study";

describe("renderSourcesForStudy", () => {
  it("renders page markers per page and source", () => {
    const out = renderSourcesForStudy(sources);
    expect(out).toContain("--- Sibika · p. 1 ---");
    expect(out).toContain("--- Algebra Notes · p. 4 ---");
  });

  it("returns a placeholder when there are no sources", () => {
    expect(renderSourcesForStudy([])).toBe("<no sources>");
  });
});

describe("validateStudyRequest", () => {
  const base = { sources };
  it("accepts a valid quiz request", () => {
    expect(validateStudyRequest({ kind: "quiz", ...base })).toEqual({ ok: true });
  });
  it("rejects an unknown kind", () => {
    const r = validateStudyRequest({ kind: "essay", ...base });
    expect(r.ok).toBe(false);
  });
  it("rejects empty sources", () => {
    const r = validateStudyRequest({ kind: "quiz", sources: [] });
    expect(r.ok).toBe(false);
  });
  it("requires sourceId and page for explain", () => {
    expect(validateStudyRequest({ kind: "explain", ...base }).ok).toBe(false);
    expect(
      validateStudyRequest({ kind: "explain", sources, options: { sourceId: "s1", page: 1 } }).ok
    ).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- lib/study.test.ts`
Expected: FAIL — `renderSourcesForStudy` / `validateStudyRequest` not exported.

- [ ] **Step 3: Implement both functions in `lib/study.ts`**

Add these imports at the top of `lib/study.ts` (extend the existing type import):
```ts
import type { CitationRef, Source, StudyKind } from "@/lib/types";
```
Then append:
```ts
const STUDY_KINDS: StudyKind[] = ["quiz", "flashcards", "summary", "explain"];

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
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- lib/study.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add lib/study.ts lib/study.test.ts
git commit -m "feat: add source rendering and request validation for study"
```

---

## Task 3: Response schemas, source scoping, and prompt builder

**Files:**
- Modify: `lib/study.ts` (add schemas + two functions)
- Test: `lib/study.test.ts` (add cases)

**Interfaces:**
- Consumes: `renderSourcesForStudy` (Task 2).
- Produces: `STUDY_SCHEMAS: Record<StudyKind, Schema>`; `scopeSourcesFor(kind: StudyKind, sources: Source[], options: StudyOptions): Source[]`; `buildStudyPrompt(kind: StudyKind, sources: Source[], options: StudyOptions): string`.

- [ ] **Step 1: Write the failing tests**

Append to `lib/study.test.ts`:
```ts
import { STUDY_SCHEMAS, scopeSourcesFor, buildStudyPrompt } from "@/lib/study";

describe("scopeSourcesFor", () => {
  it("keeps all sources for quiz", () => {
    expect(scopeSourcesFor("quiz", sources, {})).toHaveLength(2);
  });
  it("narrows explain to one source and one page", () => {
    const scoped = scopeSourcesFor("explain", sources, { sourceId: "s2", page: 4 });
    expect(scoped).toHaveLength(1);
    expect(scoped[0].pages).toEqual([{ page: 4, text: "y" }]);
  });
  it("narrows summary to a chosen source when given", () => {
    expect(scopeSourcesFor("summary", sources, { sourceId: "s1" })[0].id).toBe("s1");
  });
});

describe("STUDY_SCHEMAS", () => {
  it("defines a schema per kind", () => {
    expect(Object.keys(STUDY_SCHEMAS).sort()).toEqual(
      ["explain", "flashcards", "quiz", "summary"]
    );
  });
});

describe("buildStudyPrompt", () => {
  it("embeds the rendered sources and the requested count", () => {
    const p = buildStudyPrompt("quiz", sources, { count: 7 });
    expect(p).toContain("--- Sibika · p. 1 ---");
    expect(p).toContain("7");
    expect(p.toLowerCase()).toContain("only");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- lib/study.test.ts`
Expected: FAIL — `STUDY_SCHEMAS` / `scopeSourcesFor` / `buildStudyPrompt` not exported.

- [ ] **Step 3: Implement in `lib/study.ts`**

Add the genai import at the top of `lib/study.ts`:
```ts
import { Type, type Schema } from "@google/genai";
```
Extend the type import to include `StudyOptions`:
```ts
import type { CitationRef, Source, StudyKind, StudyOptions } from "@/lib/types";
```
Then append:
```ts
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
            answerIndex: { type: Type.INTEGER, description: "0-based index of the correct choice" },
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- lib/study.test.ts`
Expected: PASS (all cases across Tasks 1–3).

- [ ] **Step 5: Commit**

```bash
git add lib/study.ts lib/study.test.ts
git commit -m "feat: add study response schemas, source scoping, and prompt builder"
```

---

## Task 4: `runStudy` (server) with mocked Gemini

**Files:**
- Create: `lib/study-server.ts`
- Test: `lib/study-server.test.ts`

**Interfaces:**
- Consumes: `getGemini` from `@/lib/gemini-server` (existing — `getGemini(): GoogleGenAI`); `buildStudyPrompt`, `STUDY_SCHEMAS`, `scopeSourcesFor`, `resolveCitations`, `RawCitation` (Tasks 1–3).
- Produces: `runStudy(req: StudyRequest): Promise<StudyResult>`.

- [ ] **Step 1: Write the failing test (Gemini mocked)**

Create `lib/study-server.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Source } from "@/lib/types";

const generateContent = vi.fn();
vi.mock("@/lib/gemini-server", () => ({
  getGemini: () => ({ models: { generateContent } }),
}));

import { runStudy } from "@/lib/study-server";

const sources: Source[] = [
  { id: "s1", name: "Sibika", kind: "text", pages: [{ page: 1, text: "Ang demokrasya..." }], addedAt: 0 },
];

beforeEach(() => generateContent.mockReset());

describe("runStudy", () => {
  it("returns a quiz with citations resolved to source ids", async () => {
    generateContent.mockResolvedValue({
      text: JSON.stringify({
        questions: [
          {
            q: "Ano ang demokrasya?",
            choices: ["a", "b", "c", "d"],
            answerIndex: 0,
            explanation: "kasi...",
            citations: [{ sourceName: "Sibika", page: 1 }],
          },
        ],
      }),
    });

    const result = await runStudy({ kind: "quiz", sources, options: { count: 1 } });

    expect(result.kind).toBe("quiz");
    if (result.kind !== "quiz") throw new Error("wrong kind");
    expect(result.questions[0].citations[0]).toEqual({
      sourceId: "s1",
      sourceName: "Sibika",
      page: 1,
    });
    // assert the quiz schema was passed through to Gemini
    const callConfig = generateContent.mock.calls[0][0].config;
    expect(callConfig.responseMimeType).toBe("application/json");
    expect(callConfig.responseSchema).toBeDefined();
  });

  it("echoes sourceId/page for explain", async () => {
    generateContent.mockResolvedValue({
      text: JSON.stringify({ explanation: "simple words", citations: [] }),
    });
    const result = await runStudy({
      kind: "explain",
      sources,
      options: { sourceId: "s1", page: 1 },
    });
    expect(result).toMatchObject({ kind: "explain", sourceId: "s1", page: 1, explanation: "simple words" });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- lib/study-server.test.ts`
Expected: FAIL — `runStudy` not exported from `@/lib/study-server`.

- [ ] **Step 3: Implement `lib/study-server.ts`**

```ts
import "server-only";
import { getGemini } from "@/lib/gemini-server";
import {
  buildStudyPrompt,
  resolveCitations,
  scopeSourcesFor,
  STUDY_SCHEMAS,
  type RawCitation,
} from "@/lib/study";
import type { StudyRequest, StudyResult } from "@/lib/types";

type RawQuiz = {
  questions?: {
    q: string;
    choices: string[];
    answerIndex: number;
    explanation: string;
    citations?: RawCitation[];
  }[];
};
type RawFlashcards = { cards?: { front: string; back: string; citations?: RawCitation[] }[] };
type RawSummary = { tldr?: string; keyPoints?: { text: string; citations?: RawCitation[] }[] };
type RawExplain = { explanation?: string; citations?: RawCitation[] };

export async function runStudy(req: StudyRequest): Promise<StudyResult> {
  const { kind, sources } = req;
  const options = req.options ?? {};
  const scoped = scopeSourcesFor(kind, sources, options);

  const ai = getGemini();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: buildStudyPrompt(kind, scoped, options),
    config: {
      temperature: 0.4,
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
      responseSchema: STUDY_SCHEMAS[kind],
    },
  });

  const raw = JSON.parse(response.text ?? "{}");

  switch (kind) {
    case "quiz": {
      const r = raw as RawQuiz;
      return {
        kind,
        questions: (r.questions ?? []).map((q) => ({
          q: q.q,
          choices: q.choices ?? [],
          answerIndex: q.answerIndex ?? 0,
          explanation: q.explanation ?? "",
          citations: resolveCitations(q.citations, sources),
        })),
      };
    }
    case "flashcards": {
      const r = raw as RawFlashcards;
      return {
        kind,
        cards: (r.cards ?? []).map((c) => ({
          front: c.front,
          back: c.back,
          citations: resolveCitations(c.citations, sources),
        })),
      };
    }
    case "summary": {
      const r = raw as RawSummary;
      return {
        kind,
        tldr: r.tldr ?? "",
        keyPoints: (r.keyPoints ?? []).map((k) => ({
          text: k.text,
          citations: resolveCitations(k.citations, sources),
        })),
      };
    }
    case "explain": {
      const r = raw as RawExplain;
      return {
        kind,
        sourceId: options.sourceId ?? "",
        page: options.page ?? 0,
        explanation: r.explanation ?? "",
        citations: resolveCitations(r.citations, sources),
      };
    }
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- lib/study-server.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/study-server.ts lib/study-server.test.ts
git commit -m "feat: add runStudy server generation with structured output"
```

---

## Task 5: `POST /api/study` route

**Files:**
- Create: `app/api/study/route.ts`
- Test: `app/api/study/route.test.ts`

**Interfaces:**
- Consumes: `validateStudyRequest` (Task 2), `runStudy` (Task 4).
- Produces: `POST(req: Request): Promise<Response>` at `/api/study`.

- [ ] **Step 1: Write the failing test (runStudy mocked)**

Create `app/api/study/route.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const runStudy = vi.fn();
vi.mock("@/lib/study-server", () => ({ runStudy }));

import { POST } from "@/app/api/study/route";

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/study", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}

beforeEach(() => runStudy.mockReset());

describe("POST /api/study", () => {
  it("400s on validation failure without calling runStudy", async () => {
    const res = await post({ kind: "quiz", sources: [] });
    expect(res.status).toBe(400);
    expect(runStudy).not.toHaveBeenCalled();
  });

  it("200s and returns the study result on success", async () => {
    runStudy.mockResolvedValue({ kind: "summary", tldr: "t", keyPoints: [] });
    const res = await post({
      kind: "summary",
      sources: [{ id: "s1", name: "S", kind: "text", pages: [{ page: 1, text: "x" }], addedAt: 0 }],
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ kind: "summary", tldr: "t", keyPoints: [] });
  });

  it("500s when runStudy throws", async () => {
    runStudy.mockRejectedValue(new Error("boom"));
    const res = await post({
      kind: "quiz",
      sources: [{ id: "s1", name: "S", kind: "text", pages: [{ page: 1, text: "x" }], addedAt: 0 }],
    });
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("boom");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- app/api/study/route.test.ts`
Expected: FAIL — `@/app/api/study/route` does not exist.

- [ ] **Step 3: Implement `app/api/study/route.ts`**

```ts
import { NextResponse } from "next/server";
import { validateStudyRequest } from "@/lib/study";
import { runStudy } from "@/lib/study-server";
import type { StudyRequest } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const valid = validateStudyRequest(body);
  if (!valid.ok) {
    return NextResponse.json({ error: valid.error }, { status: 400 });
  }

  try {
    const result = await runStudy(body as StudyRequest);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- app/api/study/route.test.ts`
Expected: PASS (3 tests).

> If importing `next/server` fails under vitest in this environment, the only change needed is to replace `NextResponse.json(x, { status })` with `Response.json(x, { status })` in the route — the tests and behavior are identical. Try the `NextResponse` version first.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS (all files: `lib/study.test.ts`, `lib/study-server.test.ts`, `app/api/study/route.test.ts`).

- [ ] **Step 6: Commit**

```bash
git add app/api/study/route.ts app/api/study/route.test.ts
git commit -m "feat: add POST /api/study route"
```

---

## Task 6: Study tools UI (`components/study-tools.tsx`)

**Files:**
- Create: `components/study-tools.tsx`

**Interfaces:**
- Consumes: `useNotebook` (existing), `CitationPill` (existing), `cn` (existing), study types (Task 1), `POST /api/study` (Task 5).
- Produces: `StudyTools({ group }: { group: "review" | "read" })` — a client component rendering the tools for a group.

This task has no unit test (no jsdom/RTL in scope — per spec, tests cover pure logic only). It is verified by type-check, lint, and manual smoke.

- [ ] **Step 1: Create `components/study-tools.tsx`**

```tsx
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
```

- [ ] **Step 2: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors. (`tsc` validates the new component even though it is not yet mounted.)

- [ ] **Step 3: Commit**

```bash
git add components/study-tools.tsx
git commit -m "feat: add study tools UI (quiz, flashcards, summary, explain)"
```

---

## Task 7: Workspace tabs shell + mount in page

**Files:**
- Create: `components/workspace-tabs.tsx`
- Modify: `app/page.tsx` (swap `<ConversationPanel />` for `<WorkspaceTabs />`; drop the now-unused import)

**Interfaces:**
- Consumes: `ConversationPanel` (existing), `StudyTools` (Task 6), `cn` (existing).
- Produces: `WorkspaceTabs()` — client component rendering tabs `ask` / `review` / `read`.

- [ ] **Step 1: Create `components/workspace-tabs.tsx`**

```tsx
"use client";

import { useState } from "react";
import { ConversationPanel } from "@/components/conversation-panel";
import { StudyTools } from "@/components/study-tools";
import { cn } from "@/lib/utils";

type Tab = "ask" | "review" | "read";

const TABS: Tab[] = ["ask", "review", "read"];

export function WorkspaceTabs() {
  const [tab, setTab] = useState<Tab>("ask");
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        role="tablist"
        aria-label="Workspace"
        className="mb-4 inline-flex self-start border border-line-graphite"
      >
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-1.5 text-[12px] uppercase tracking-[-0.36px] transition-colors",
              tab === t
                ? "bg-canvas-white text-void"
                : "text-canvas-white/70 hover:bg-hover-graphite"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1">
        {tab === "ask" ? (
          <ConversationPanel />
        ) : (
          <StudyTools group={tab} />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Mount it in `app/page.tsx`**

Replace the import on line 6 (`import { ConversationPanel } from "@/components/conversation-panel";`) with:
```tsx
import { WorkspaceTabs } from "@/components/workspace-tabs";
```
Then in the workspace `<section>` (currently around `app/page.tsx:140-142`), replace:
```tsx
              <section className="min-h-[620px] border border-line-soft bg-panel p-3">
                <ConversationPanel />
              </section>
```
with:
```tsx
              <section className="min-h-[620px] border border-line-soft bg-panel p-3">
                <WorkspaceTabs />
              </section>
```

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors, and no "unused import" warning for `ConversationPanel` in `page.tsx` (it was removed).

- [ ] **Step 4: Manual smoke test**

Run: `npm run dev`, open http://localhost:3000.
Verify: three tabs `ask` / `review` / `read` render; `ask` shows the existing chat; `review` and `read` show the tool switch + a disabled "Magdagdag muna ng source" button when no sources are loaded.

- [ ] **Step 5: Commit**

```bash
git add components/workspace-tabs.tsx app/page.tsx
git commit -m "feat: add tabbed workspace (ask / review / read)"
```

---

## Task 8: End-to-end verification

**Files:** none (verification + memory note only).

- [ ] **Step 1: Full automated checks**

Run: `npm test && npx tsc --noEmit && npm run lint && npm run build`
Expected: tests pass, no type errors, no lint errors, production build succeeds.

- [ ] **Step 2: Manual end-to-end against a real source**

With `.env` populated (`GOOGLE_GENAI_API_KEY`), `npm run dev`, then:
1. Add a source (paste text or a PDF) via the sources panel.
2. `review` tab → `quiz` → Gumawa ng quiz → questions render; clicking a choice reveals the correct answer + explanation + citation pills.
3. `review` tab → `flashcards` → cards render and flip; citations on the back.
4. `read` tab → `summary` → tldr + cited key points render.
5. `read` tab → `explain` → pick a source + page → plain-language explanation + citation.
6. Confirm citation pills show real source names/pages from the loaded material.

- [ ] **Step 3: Update session memory**

Per `workload.md`, add a project memory note (in the `memory/` directory referenced by CLAUDE.md) recording: study features shipped on `feat/study-features`, `/api/study` + `lib/study*.ts`, structured output via Gemini `responseSchema`, three-tab workspace. Delete any obsolete status notes.

- [ ] **Step 4: Final commit (if memory/docs changed)**

```bash
git add -A
git commit -m "docs: record study-features session in memory"
```

---

## Self-Review

**1. Spec coverage**

| Spec section | Task |
|---|---|
| §3.1 one `/api/study` route | Task 5 |
| §3.2 structured output (`responseSchema`/`responseMimeType`) | Task 3 (schemas) + Task 4 (call) |
| §3.3 grounding + citation resolution (`sourceName`→`sourceId`) | Task 1 (`resolveCitations`) + Task 3 (`GROUNDING`) |
| §3.4 pure helpers vs model call split | `lib/study.ts` (Tasks 1–3) vs `lib/study-server.ts` (Task 4) |
| §4 contract (quiz/flashcards/summary/explain shapes, 400/500) | Task 4 (shapes) + Task 5 (status codes) |
| §5 types | Task 1 |
| §6 three-tab workspace, tools, disabled-until-source, ephemeral results | Tasks 6–7 |
| §7 data flow | Tasks 5–7 end to end |
| §8 error handling | Task 5 (route) + Task 6 (per-tool error line + `Empty`) |
| §9 vitest on pure logic + mocked `runStudy`/Gemini | Tasks 1–5 |
| §10 file list | matches File Structure above |

No gaps.

**2. Placeholder scan:** No "TBD"/"TODO"/"handle edge cases"/"similar to Task N". Every code step shows complete code; every run step shows the command and expected result. The one conditional note (Task 5 `NextResponse` → `Response` fallback) gives the exact change, not a vague instruction.

**3. Type consistency:** `resolveCitations(raw, sources)`, `renderSourcesForStudy(sources)`, `validateStudyRequest(body)`, `scopeSourcesFor(kind, sources, options)`, `buildStudyPrompt(kind, sources, options)`, `STUDY_SCHEMAS`, `runStudy(req)` are named identically wherever consumed. `StudyResult` discriminated-union members (`questions` / `cards` / `tldr`+`keyPoints` / `explanation`+`sourceId`+`page`) match between Task 1 (types), Task 4 (producer), and Task 6 (consumer). `RawCitation` shape (`sourceName`,`page`) is consistent across schema, `runStudy` raw types, and `resolveCitations`.

---

## Execution Handoff

(Provided in chat after saving.)
