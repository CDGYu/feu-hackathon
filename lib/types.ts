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

export type StudyKind = "quiz" | "flashcards" | "summary" | "explain";

export type QuizQuestion = {
  q: string;
  choices: string[];
  answerIndex: number;
  explanation: string;
  citations: CitationRef[];
};

export type Flashcard = {
  front: string;
  back: string;
  citations: CitationRef[];
};

export type KeyPoint = {
  text: string;
  citations: CitationRef[];
};

export type StudyResult =
  | { kind: "quiz"; questions: QuizQuestion[] }
  | { kind: "flashcards"; cards: Flashcard[] }
  | { kind: "summary"; tldr: string; keyPoints: KeyPoint[] }
  | {
      kind: "explain";
      sourceId: string;
      page: number;
      explanation: string;
      citations: CitationRef[];
    };

export type StudyOptions = {
  count?: number;
  sourceId?: string;
  page?: number;
};

export type StudyRequest = {
  kind: StudyKind;
  sources: Source[];
  options?: StudyOptions;
};
