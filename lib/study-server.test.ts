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
