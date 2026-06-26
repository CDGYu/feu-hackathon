# erid Study Features — Design Spec

**Date:** 2026-06-26
**Status:** Approved design, pending spec review
**Topic:** Source-grounded study tools (quiz, flashcards, summary, explain) + tabbed workspace UI

## 1. Goal

Add four AI study tools to erid, each grounded **only** in the sources the student has loaded:

- **Quiz** — multiple-choice questions with answers, explanations, and citations.
- **Flashcards** — term/definition pairs drawn from the material.
- **Summary** — a TL;DR plus cited key points for a source.
- **Explain** — a plain-language breakdown of one chosen page.

These are surfaced through two new tabs in the workspace panel, alongside the existing chat. The backend is the substance; the UI is a thin consumer that exercises the new endpoint.

## 2. Scope

**In scope**

- One new API route (`POST /api/study`) handling all four tools.
- One new server lib (`lib/study-server.ts`) with the grounding + generation logic.
- New shared types in `lib/types.ts`.
- A tabbed workspace shell and the study-tool UI components.
- Unit tests (vitest) for the pure, model-independent logic.

**Out of scope (non-goals)**

- Persisting generated study content (it is ephemeral; regenerate on demand). Only `sources` continue to persist via `localStorage`, unchanged.
- Voice-path involvement. Study tools are text/structured only.
- User accounts, databases, multi-notebook.
- An explicit per-request language override (generated content matches the source language, consistent with the persona). A future enhancement, not now.

## 3. Architecture

### 3.1 Decision: one route, not four

The four tools are the *same concern* — source-grounded Gemini generation — differing only in output shape. A single route with a discriminated `kind` keeps source rendering, the grounding prompt, citation resolution, and error handling in one place, and mirrors the existing thin-route → lib pattern (`app/api/chat/route.ts` delegates to `lib/gemini-server.ts`).

Rejected alternatives:
- **Four routes** (`/api/quiz`, …): ~4× boilerplate that factors back into one lib anyway.
- **Overloading `/api/chat`**: chat returns prose + parsed citations; study returns structured objects. Different response contracts — do not conflate.

### 3.2 Structured output

Generation uses Gemini 2.5 Flash structured output via `@google/genai` (`config.responseMimeType = "application/json"` + `config.responseSchema`), confirmed supported in the installed v2.10. Each tool defines a response schema, so the model returns validated JSON instead of prose we regex-parse. This is the core reliability win over the existing citation-token approach.

### 3.3 Grounding & citations

- Sources are rendered with the same page markers already used by `lib/gemini-server.ts` and `app/api/kb/route.ts` (`--- <name> · p. <page> ---`), so the model can attach correct page numbers.
- The persona enforces the existing hard rule: answer only from the SOURCES; if it is not there, say so; match the source language (Tagalog / English / Taglish).
- The model emits citations as `{ sourceName, page }`. The lib resolves `sourceName → sourceId` against the request's `sources` (same resolution `lib/citations.ts` does), producing the existing `CitationRef` shape so the UI can reuse `CitationPill`.

### 3.4 Module layout

`lib/study-server.ts`, structured so the pure parts are testable without a live model:

- **Pure helpers (unit-tested):** `renderSourcesForStudy(sources)`, `buildStudyPrompt(kind, sources, options)`, `resolveCitations(rawCitations, sources)`, `validateStudyRequest(body)`, and the per-`kind` response schemas.
- **Model call:** `runStudy(kind, sources, options)` calls Gemini with the right schema and maps the result through `resolveCitations`. The Gemini client is obtained the same way `gemini-server.ts` does (`getGemini()`), and is mocked in tests.

## 4. API contract

`POST /api/study` — `runtime = "nodejs"`, `dynamic = "force-dynamic"` (matches existing routes).

**Request** (discriminated union on `kind`):

```ts
type StudyRequest =
  | { kind: "quiz";       sources: Source[]; options?: { count?: number } }      // default count 5
  | { kind: "flashcards"; sources: Source[]; options?: { count?: number } }      // default count 8
  | { kind: "summary";    sources: Source[]; options?: { sourceId?: string } }   // default: all sources
  | { kind: "explain";    sources: Source[]; options:  { sourceId: string; page: number } };
```

**Responses** (HTTP 200):

```ts
// quiz — exactly 4 choices per question; answerIndex is 0–3 into choices
{ kind: "quiz"; questions: { q: string; choices: string[]; answerIndex: number;
                             explanation: string; citations: CitationRef[] }[] }
// flashcards
{ kind: "flashcards"; cards: { front: string; back: string; citations: CitationRef[] }[] }
// summary
{ kind: "summary"; tldr: string; keyPoints: { text: string; citations: CitationRef[] }[] }
// explain
{ kind: "explain"; sourceId: string; page: number; explanation: string; citations: CitationRef[] }
```

**Errors:** mirror existing routes —
- `400` invalid JSON body / unknown `kind` / empty `sources` / (for `explain`) missing `sourceId`+`page`.
- `500` `{ error: message }` on model or server failure.

## 5. Types (`lib/types.ts` additions)

```ts
export type StudyKind = "quiz" | "flashcards" | "summary" | "explain";

export type QuizQuestion = {
  q: string; choices: string[]; answerIndex: number;
  explanation: string; citations: CitationRef[];
};
export type Flashcard   = { front: string; back: string; citations: CitationRef[] };
export type KeyPoint    = { text: string; citations: CitationRef[] };

export type StudyResult =
  | { kind: "quiz";       questions: QuizQuestion[] }
  | { kind: "flashcards"; cards: Flashcard[] }
  | { kind: "summary";    tldr: string; keyPoints: KeyPoint[] }
  | { kind: "explain";    sourceId: string; page: number; explanation: string; citations: CitationRef[] };
```

`CitationRef` and `Source` are reused unchanged.

## 6. Frontend — tabbed workspace

The workspace panel (`app/page.tsx:140`, currently rendering `<ConversationPanel />` directly) becomes a three-tab container using the **existing tablist idiom** from `components/sources-panel.tsx:150` (bordered inline group, uppercase `micro` labels, active = `bg-canvas-white text-void`):

| Tab | Content | `kind` |
|---|---|---|
| `ask` | existing `ConversationPanel` (unchanged) | — |
| `review` | Quiz + Flashcards, switched by a segmented control | `quiz`, `flashcards` |
| `read` | Summary + Explain, switched by a segmented control | `summary`, `explain` |

**Components**

- `components/workspace-tabs.tsx` — owns the active-tab state; renders the tab bar and the three panels. `app/page.tsx` swaps its direct `<ConversationPanel />` for `<WorkspaceTabs />`.
- `components/study-tools.tsx` — the `review` and `read` tool UIs (quiz, flashcards, summary, explain) as focused sub-components in one file. Each: a generate control, loading state (reuse the `ThinkingDots` pattern), error state, and results rendered with `CitationPill`.

**Tool UX**

- **Quiz:** `count` selector + Generate; each question shows choices, reveals the correct answer + explanation on click, with citation pills.
- **Flashcards:** `count` selector + Generate; click a card to flip front→back; citation pills on the back.
- **Summary:** source picker (default: all) + Generate; renders `tldr` then cited key points.
- **Explain:** source + page picker (from loaded `sources`) + Generate; renders the explanation with citation pills.

All tools are disabled until ≥1 source is loaded (same gate the chat input uses). Generated results live in component state only — not persisted.

## 7. Data flow

1. User picks a tool in `review`/`read`, sets options, clicks Generate.
2. Client `POST`s `{ kind, sources, options }` to `/api/study` (same in-memory `sources` the chat panel posts).
3. Route validates → `lib/study-server.ts` renders sources with page markers, builds the grounded prompt, calls Gemini with the per-`kind` `responseSchema`.
4. Lib resolves `{ sourceName, page }` citations to `CitationRef[]`, returns typed JSON.
5. Client renders cards/questions; citations via `CitationPill`.

## 8. Error handling

- Route: try/catch around JSON parse and generation, returning the 400/500 shapes above — identical convention to `chat`, `kb`, `signed-url`.
- Client: per-tool error line (reusing the sources-panel `role="status"` styling); failed generation leaves prior results intact.
- Empty/invalid model output: structured output makes this rare; if `questions`/`cards`/`keyPoints` come back empty, the tool shows an "wala akong nahanap / nothing found in your sources" empty state rather than erroring.

## 9. Testing

TDD per `workload.md`. The project has no test runner yet, so add **vitest** (ESM/TS-native, minimal config) with a `test` script. Scope tests to the pure logic, mocking `@google/genai`:

- `renderSourcesForStudy` — page markers, multi-source ordering, empty sources.
- `validateStudyRequest` — rejects unknown `kind`, empty sources, missing `explain` options.
- `resolveCitations` — maps `{ sourceName, page }` to `CitationRef` (case-insensitive name match, unknown name → `sourceId: "unknown"`), mirroring `citations.ts` behavior.
- `runStudy` with a mocked Gemini client — asserts the correct schema is passed per `kind` and that citations are resolved.

The live model call is verified manually in the demo (not in CI).

## 10. File-level change list

**New**
- `app/api/study/route.ts` — thin POST handler + validation/dispatch.
- `lib/study-server.ts` — schemas, grounding prompt, generation, citation resolution.
- `components/workspace-tabs.tsx` — three-tab shell.
- `components/study-tools.tsx` — quiz / flashcards / summary / explain UIs.
- `lib/study-server.test.ts` — vitest unit tests.
- `vitest.config.ts` — minimal config.

**Edited**
- `lib/types.ts` — add study types (§5).
- `app/page.tsx` — render `<WorkspaceTabs />` in the workspace panel instead of `<ConversationPanel />` directly.
- `package.json` — add `vitest` (devDep) + `test` script.

**Untouched:** `chat`, `kb`, `signed-url` routes; `gemini-server.ts`; `elevenlabs-server.ts`; voice path; persistence.

## 11. Implementation notes

- Per `AGENTS.md`, consult the Next.js route-handler guide under `node_modules/next/dist/docs/` before writing the route; otherwise follow the working convention the three existing routes already establish (`export async function POST`, `NextResponse.json`, `runtime`/`dynamic` exports).
- Follow existing style: lowercase UI labels, the established Tailwind tokens (`bg-panel`, `border-line-soft`, `iris-mist`, `micro`), and Filipino-first copy.
- Keep components small and single-purpose; if `study-tools.tsx` grows large, split per tool.

## 12. Success criteria

- `POST /api/study` returns valid, schema-conformant JSON for all four `kind`s against a loaded source, with citations resolving to real source pages.
- The three workspace tabs render; each tool generates and displays grounded results with working citation pills; tools are gated on having a source.
- Generated content stays within the loaded sources (no open-web facts).
- `npm test` runs the vitest suite green; `npm run build` and `npm run lint` pass.
