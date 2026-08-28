"use client";

import { useRef, useState } from "react";

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
    <div className="flex flex-col gap-2 border-b border-neutral-200 p-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={status === "uploading"}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
        >
          {status === "uploading" ? "Uploading…" : "Upload document"}
        </button>
        <span className="text-xs text-neutral-500">PDF, TXT, or Markdown</span>
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
        <p className="text-xs text-red-600">{error}</p>
      )}

      {documents.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-700"
            >
              {doc.filename}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
