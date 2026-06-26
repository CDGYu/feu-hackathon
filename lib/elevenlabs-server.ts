import "server-only";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

let cached: ElevenLabsClient | null = null;

export function getElevenLabsClient(): ElevenLabsClient {
  if (cached) return cached;
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ELEVENLABS_API_KEY is not set. Add it to .env.local — see README."
    );
  }
  cached = new ElevenLabsClient({ apiKey });
  return cached;
}

export function getAgentId(): string {
  const id = process.env.ELEVENLABS_AGENT_ID;
  if (!id) {
    throw new Error(
      "ELEVENLABS_AGENT_ID is not set. Create a Conversational AI agent in the ElevenLabs dashboard and put its id in .env.local."
    );
  }
  return id;
}

export const ERID_SYSTEM_PROMPT = `You are erid, a warm and patient Filipino study companion.

Hard rules:
- Only answer using the documents in your knowledge base. If the answer isn't there, say so honestly in the user's language.
- Match the user's language. If they speak Tagalog, reply in Tagalog. If Taglish or English, mirror that. Use simple, encouraging tone.
- When citing, name the source and page like: "(ayon sa <source>, p. <n>)" or "(per <source>, p. <n>)".
- Keep voice replies short — 2 to 4 sentences unless asked for more. Pause for the student.
- If asked something off-topic, gently redirect to their materials.
- Never invent facts. Never claim sources you don't have.

erid is a cinematic study interface: quiet, grounded, and precise. You help the student see what they already have in their own materials.`;

export type EnsureAgentResult = {
  updated: boolean;
  knowledgeBaseSize: number;
};

/**
 * Make sure the agent is configured the way erid expects: RAG enabled,
 * Filipino tutor prompt, and the new doc attached to its knowledge_base.
 * Safe to call repeatedly -- it is a no-op if the doc is already attached
 * and the prompt is already set.
 */
export async function ensureAgentHasDocument(params: {
  documentId: string;
  documentName: string;
}): Promise<EnsureAgentResult> {
  const client = getElevenLabsClient();
  const agentId = getAgentId();

  // Fetch current agent config so we can merge instead of overwrite.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const agent: any = await client.conversationalAi.agents.get(agentId);
  const conversationConfig = agent?.conversationConfig ?? {};
  const agentBlock = conversationConfig.agent ?? {};
  const prompt = agentBlock.prompt ?? {};
  const existingKb: Array<{ id: string; type: string; name?: string; usageMode?: string }> =
    Array.isArray(prompt.knowledgeBase) ? prompt.knowledgeBase : [];

  const alreadyAttached = existingKb.some((d) => d.id === params.documentId);
  // We always upload via createFromText (even for PDFs — we extract client-side),
  // so the document type at ElevenLabs is "text".
  const knowledgeBase = alreadyAttached
    ? existingKb
    : [
        ...existingKb,
        {
          type: "text",
          id: params.documentId,
          name: params.documentName,
          usageMode: "auto",
        },
      ];

  await client.conversationalAi.agents.update(agentId, {
    conversationConfig: {
      agent: {
        prompt: {
          prompt: ERID_SYSTEM_PROMPT,
          knowledgeBase,
          rag: {
            enabled: true,
            embeddingModel: "e5_mistral_7b_instruct",
            maxDocumentsLength: 50000,
            maxRetrievedRagChunksCount: 20,
          },
        },
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  return {
    updated: !alreadyAttached,
    knowledgeBaseSize: knowledgeBase.length,
  };
}
