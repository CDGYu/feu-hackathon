import "server-only";
import { GoogleGenAI } from "@google/genai";
import type { Source } from "@/lib/types";

let cached: GoogleGenAI | null = null;

export function getGemini(): GoogleGenAI {
  if (cached) return cached;
  const apiKey = process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GOOGLE_GENAI_API_KEY is not set. Add it to .env.local — see README."
    );
  }
  cached = new GoogleGenAI({ apiKey });
  return cached;
}

const CITATION_RULE = `Citations are mandatory.
- After every factual claim, append the citation as: [<source-name> · p. <page>]
- Use ONLY the page numbers shown in the SOURCES below. Never invent page numbers.
- If multiple pages support a claim, list them all: [Algebra Notes · p. 4, 7]
- If the answer is not in the sources, say "Wala akong mahanap tungkol diyan sa iyong mga sources." (or the English equivalent if the user wrote in English) and stop.`;

const PERSONA = `You are erid, a patient Filipino study companion. You answer ONLY from the SOURCES provided below.

Language rule: match the user's language. Tagalog in -> Tagalog out. English in -> English out. Taglish in -> Taglish out. Use simple, warm, encouraging tone like a kuya/ate tutor.

${CITATION_RULE}

Be concise. Lead with the answer, then a brief why. Skip throat-clearing.`;

function renderSources(sources: Source[]): string {
  if (sources.length === 0) return "<no sources yet>";
  return sources
    .map((s) => {
      const pages = s.pages
        .map((p) => `--- ${s.name} · p. ${p.page} ---\n${p.text}`)
        .join("\n\n");
      return pages;
    })
    .join("\n\n");
}

export async function answerWithSources(params: {
  question: string;
  sources: Source[];
}): Promise<string> {
  const ai = getGemini();
  const sources = renderSources(params.sources);

  const prompt = `${PERSONA}

SOURCES:
${sources}

STUDENT QUESTION:
${params.question}

ANSWER:`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      temperature: 0.4,
      maxOutputTokens: 800,
    },
  });

  return response.text ?? "";
}
