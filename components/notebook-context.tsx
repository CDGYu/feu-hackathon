"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ChatMessage, Source } from "@/lib/types";

type NotebookContextValue = {
  sources: Source[];
  messages: ChatMessage[];
  addSource: (s: Source) => void;
  removeSource: (id: string) => void;
  addMessage: (m: ChatMessage) => void;
  updateMessage: (id: string, patch: Partial<ChatMessage>) => void;
};

const NotebookContext = createContext<NotebookContextValue | null>(null);

const STORAGE_KEY = "erid.notebook.v1";

type Persisted = { sources: Source[] };

function loadFromStorage(): Persisted | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Persisted;
  } catch {
    return null;
  }
}

function saveToStorage(data: Persisted) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Quota exceeded — fail silently. Source still lives in ElevenLabs KB.
  }
}

export function NotebookProvider({ children }: { children: React.ReactNode }) {
  const [sources, setSources] = useState<Source[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    const saved = loadFromStorage();
    // Hydrating from localStorage is exactly the "subscribe to external
    // system" pattern the rule warns about - this is the documented exception.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved?.sources) setSources(saved.sources);
  }, []);

  useEffect(() => {
    saveToStorage({ sources });
  }, [sources]);

  const addSource = useCallback((s: Source) => {
    setSources((prev) => [...prev, s]);
  }, []);

  const removeSource = useCallback((id: string) => {
    setSources((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const addMessage = useCallback((m: ChatMessage) => {
    setMessages((prev) => [...prev, m]);
  }, []);

  const updateMessage = useCallback(
    (id: string, patch: Partial<ChatMessage>) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, ...patch } : m))
      );
    },
    []
  );

  const value = useMemo<NotebookContextValue>(
    () => ({
      sources,
      messages,
      addSource,
      removeSource,
      addMessage,
      updateMessage,
    }),
    [sources, messages, addSource, removeSource, addMessage, updateMessage]
  );

  return (
    <NotebookContext.Provider value={value}>
      {children}
    </NotebookContext.Provider>
  );
}

export function useNotebook(): NotebookContextValue {
  const ctx = useContext(NotebookContext);
  if (!ctx) {
    throw new Error("useNotebook must be used inside NotebookProvider");
  }
  return ctx;
}
