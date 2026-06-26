import { NextResponse } from "next/server";
import {
  getElevenLabsClient,
  ensureAgentHasDocument,
} from "@/lib/elevenlabs-server";
import type { SourcePage } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type KbUploadBody = {
  name: string;
  pages: SourcePage[];
};

function renderForKb(name: string, pages: SourcePage[]): string {
  // Page markers help the agent cite the same page numbers we use in the UI.
  return pages
    .map((p) => `=== ${name} · page ${p.page} ===\n${p.text}`)
    .join("\n\n");
}

export async function POST(req: Request) {
  let body: KbUploadBody;
  try {
    body = (await req.json()) as KbUploadBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body?.name || !Array.isArray(body.pages) || body.pages.length === 0) {
    return NextResponse.json(
      { error: "Missing name or pages" },
      { status: 400 }
    );
  }

  try {
    const client = getElevenLabsClient();
    const text = renderForKb(body.name, body.pages);

    const created = await client.conversationalAi.knowledgeBase.documents.createFromText({
      name: body.name,
      text,
    });

    const documentId = created.id;
    if (!documentId) {
      return NextResponse.json(
        { error: "ElevenLabs did not return a document id" },
        { status: 502 }
      );
    }

    // Fire-and-don't-await the RAG index call to keep upload feeling fast.
    // The doc still becomes searchable, just maybe a few seconds later.
    client.conversationalAi.knowledgeBase
      .getOrCreateRagIndexes({
        items: [
          {
            documentId,
            createIfMissing: true,
            model: "e5_mistral_7b_instruct",
          },
        ],
      })
      .catch((e) => console.warn("rag index failed", e));

    const ensure = await ensureAgentHasDocument({
      documentId,
      documentName: body.name,
    });

    return NextResponse.json({
      documentId,
      attached: ensure.updated,
      knowledgeBaseSize: ensure.knowledgeBaseSize,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
