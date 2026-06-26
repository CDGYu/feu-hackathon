import { describe, it, expect, vi } from "vitest";

const { runStudy } = vi.hoisted(() => ({ runStudy: vi.fn() }));
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

const validSources = [
  { id: "s1", name: "S", kind: "text", pages: [{ page: 1, text: "x" }], addedAt: 0 },
];

// Note: reset the mock inline at the start of each test, NOT in a beforeEach
// hook — vitest 4 surfaces a caught error from a mock as a test failure when
// the mock is reset via beforeEach. Inline reset avoids that quirk.

describe("POST /api/study", () => {
  it("400s on validation failure without calling runStudy", async () => {
    runStudy.mockReset();
    const res = await post({ kind: "quiz", sources: [] });
    expect(res.status).toBe(400);
    expect(runStudy).not.toHaveBeenCalled();
  });

  it("200s and returns the study result on success", async () => {
    runStudy.mockReset();
    runStudy.mockResolvedValue({ kind: "summary", tldr: "t", keyPoints: [] });
    const res = await post({ kind: "summary", sources: validSources });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ kind: "summary", tldr: "t", keyPoints: [] });
  });

  it("500s when runStudy throws", async () => {
    runStudy.mockReset();
    runStudy.mockImplementation(() => {
      throw new Error("boom");
    });
    const res = await post({ kind: "quiz", sources: validSources });
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("boom");
  });
});
