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
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-2.5 px-4">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-primary" />
          </span>
          <span className="text-sm font-semibold uppercase tracking-tight">Document Chat</span>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl px-4">
        <p className="pt-3 text-xs font-semibold uppercase tracking-widest text-primary">
          [01] Documents
        </p>
      </div>
      <UploadZone
        chatId={chatId}
        documents={documents}
        onUploaded={(doc) => setDocuments((prev) => [...prev, doc])}
      />

      <div className="mx-auto w-full max-w-3xl px-4 pt-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          [02] Conversation
        </p>
      </div>

      <div className="relative flex-1 overflow-y-auto px-4 py-4">
        <div className="pointer-events-none absolute inset-0 grid-fill opacity-30" />
        {messages.length === 0 && <EmptyState hasDocuments={hasDocuments} />}

        <div className="relative mx-auto flex max-w-3xl flex-col gap-4">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {status === "submitted" && (
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
              </span>
              Thinking…
            </div>
          )}

          {error && (
            <div className="border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Something went wrong: {error.message}
            </div>
          )}
        </div>
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t bg-background px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              hasDocuments
                ? "Ask a question about your document…"
                : "Upload a document above to get started…"
            }
            className="flex-1 border border-border bg-card px-3 py-2 text-sm font-sans text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/50"
          />
          <button
            type="submit"
            disabled={isBusy || !input.trim()}
            className="flex items-center gap-2 bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-1 ring-primary transition-all hover:brightness-110 disabled:opacity-40"
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
    <div className="relative mx-auto mt-16 max-w-md text-center font-sans text-sm text-muted-foreground">
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
        className={`max-w-[85%] px-4 py-2.5 font-sans text-sm ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "border border-border bg-card text-card-foreground"
        }`}
      >
        {message.parts.map((part, i) => {
          if (part.type === "text") {
            return (
              <p key={i} className="whitespace-pre-wrap leading-relaxed">
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
