import { NextResponse } from "next/server";
import { answerWithSources } from "@/lib/gemini-server";
import { parseCitations } from "@/lib/citations";
import type { Source } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatBody = {
  question: string;
  sources: Source[];
};

export async function POST(req: Request) {
  let body: ChatBody;
  try {
    body = (await req.json()) as ChatBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body?.question?.trim()) {
    return NextResponse.json({ error: "Empty question" }, { status: 400 });
  }

  try {
    const text = await answerWithSources({
      question: body.question.trim(),
      sources: body.sources ?? [],
    });
    const citations = parseCitations(text, body.sources ?? []);
    return NextResponse.json({ text, citations });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
