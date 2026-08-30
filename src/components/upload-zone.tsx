"use client";

import { useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";

type DocumentSummary = {
  id: string;
  filename: string;
  mimeType: string;
};

export function UploadZone({
  chatId,
  documents,
  onUploaded,
}: {
  chatId: string;
  documents: DocumentSummary[];
  onUploaded: (doc: DocumentSummary) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setStatus("uploading");
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("chatId", chatId);

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Upload failed");
      }

      onUploaded(data.document);
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-2.5 border-b px-4 pb-3 pt-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={status === "uploading"}
          className="flex items-center gap-2 border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-50"
        >
          {status === "uploading" ? (
            <Loader2 className="size-3.5 animate-spin text-primary" />
          ) : (
            <Upload className="size-3.5 text-primary" />
          )}
          {status === "uploading" ? "Uploading…" : "Upload document"}
        </button>
        <span className="font-sans text-xs text-muted-foreground">PDF, TXT, or Markdown</span>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,.md,.markdown,application/pdf,text/plain,text/markdown"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>

      {status === "error" && error && (
        <p className="font-sans text-xs text-destructive">{error}</p>
      )}

      {documents.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="border border-primary/20 bg-primary/10 px-2.5 py-1 font-sans text-xs text-primary"
            >
              {doc.filename}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
