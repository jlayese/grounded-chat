"use client";

import { useEffect, useState } from "react";
import type { UIMessage } from "ai";
import { Chat } from "@/components/chat";

const STORAGE_KEY = "kleo-doc-chat-id";

type DocumentSummary = { id: string; filename: string; mimeType: string };

type BootstrapState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      chatId: string;
      messages: UIMessage[];
      documents: DocumentSummary[];
    };

export default function Home() {
  const [state, setState] = useState<BootstrapState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        let chatId = localStorage.getItem(STORAGE_KEY);

        if (!chatId) {
          const res = await fetch("/api/upload", { method: "PUT", body: "{}" });
          if (!res.ok) throw new Error("Failed to start a new chat session.");
          const data = await res.json();
          chatId = data.chat.id;
          if (chatId) localStorage.setItem(STORAGE_KEY, chatId);
        }

        if (!chatId) throw new Error("Failed to start a new chat session.");

        const [messagesRes, documentsRes] = await Promise.all([
          fetch(`/api/chat?chatId=${chatId}`),
          fetch(`/api/documents?chatId=${chatId}`),
        ]);

        if (!messagesRes.ok || !documentsRes.ok) {
          throw new Error("Failed to load your previous conversation.");
        }

        const { messages } = await messagesRes.json();
        const { documents } = await documentsRes.json();

        if (!cancelled) {
          setState({ status: "ready", chatId, messages, documents });
        }
      } catch (err) {
        if (!cancelled) {
          setState({
            status: "error",
            message: err instanceof Error ? err.message : "Something went wrong.",
          });
        }
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
        <span className="relative flex size-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-primary" />
        </span>
        Loading…
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
        <p>{state.message}</p>
        <button
          onClick={() => {
            localStorage.removeItem(STORAGE_KEY);
            window.location.reload();
          }}
          className="border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
        >
          Start over
        </button>
      </div>
    );
  }

  return (
    <Chat
      chatId={state.chatId}
      initialMessages={state.messages}
      initialDocuments={state.documents}
    />
  );
}
