import { NextResponse } from "next/server";
import { getElevenLabsClient, getAgentId } from "@/lib/elevenlabs-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const client = getElevenLabsClient();
    const agentId = getAgentId();
    const res = await client.conversationalAi.conversations.getSignedUrl({
      agentId,
    });
    return NextResponse.json({ signedUrl: res.signedUrl, agentId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
