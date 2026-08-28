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
      <div className="flex h-screen items-center justify-center text-sm text-neutral-500">
        Loading…
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 text-sm text-neutral-600">
        <p>{state.message}</p>
        <button
          onClick={() => {
            localStorage.removeItem(STORAGE_KEY);
            window.location.reload();
          }}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-white"
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
