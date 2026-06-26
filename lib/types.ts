export type SourceKind = "pdf" | "text";

export type Source = {
  id: string;
  name: string;
  kind: SourceKind;
  pages: SourcePage[];
  elevenlabsDocumentId?: string;
  addedAt: number;
};

export type SourcePage = {
  page: number;
  text: string;
};

export type CitationRef = {
  sourceId: string;
  sourceName: string;
  page: number;
};

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  citations?: CitationRef[];
  pending?: boolean;
};

export type ConversationMode = "idle" | "connecting" | "listening" | "speaking";
