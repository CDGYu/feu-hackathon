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
