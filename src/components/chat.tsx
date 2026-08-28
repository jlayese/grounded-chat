"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { UploadZone } from "./upload-zone";
import { EvidenceCards } from "./evidence-cards";

type DocumentSummary = { id: string; filename: string; mimeType: string };

export function Chat({
  chatId,
  initialMessages,
  initialDocuments,
}: {
  chatId: string;
  initialMessages: UIMessage[];
  initialDocuments: DocumentSummary[];
}) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error } = useChat({
    id: chatId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { chatId },
    }),
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  const isBusy = status === "submitted" || status === "streaming";
  const hasDocuments = documents.length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isBusy) return;
    sendMessage({ text });
    setInput("");
  }

  return (
    <div className="flex h-screen flex-col">
      <UploadZone
        chatId={chatId}
        documents={documents}
        onUploaded={(doc) => setDocuments((prev) => [...prev, doc])}
      />

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <EmptyState hasDocuments={hasDocuments} />
        )}

        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {status === "submitted" && (
            <div className="text-sm text-neutral-400">Thinking…</div>
          )}

          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              Something went wrong: {error.message}
            </div>
          )}
        </div>
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t border-neutral-200 p-3">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              hasDocuments
                ? "Ask a question about your document…"
                : "Upload a document above to get started…"
            }
            className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
          />
          <button
            type="submit"
            disabled={isBusy || !input.trim()}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

function EmptyState({ hasDocuments }: { hasDocuments: boolean }) {
  return (
    <div className="mx-auto mt-16 max-w-md text-center text-sm text-neutral-500">
      {hasDocuments
        ? "Ask a question about the document you uploaded."
        : "Upload a PDF, TXT, or Markdown file to start chatting with it."}
    </div>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
          isUser ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-900"
        }`}
      >
        {message.parts.map((part, i) => {
          if (part.type === "text") {
            return (
              <p key={i} className="whitespace-pre-wrap">
                {part.text}
              </p>
            );
          }

          if (part.type === "tool-presentEvidence") {
            const items =
              "input" in part && part.input && typeof part.input === "object" && "items" in part.input
                ? (part.input as { items: never[] }).items
                : [];
            return <EvidenceCards key={i} items={items} />;
          }

          return null;
        })}
      </div>
    </div>
  );
}
