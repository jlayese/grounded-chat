"use client";

import { useState } from "react";

type EvidenceItem = {
  claim: string;
  filename: string;
  location: string | null;
  excerpt: string;
};

export function EvidenceCards({ items }: { items: EvidenceItem[] }) {
  if (!items?.length) return null;

  return (
    <div className="mt-2 flex flex-col gap-2">
      {items.map((item, i) => (
        <EvidenceCard key={i} item={item} />
      ))}
    </div>
  );
}

function EvidenceCard({ item }: { item: EvidenceItem }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 text-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start justify-between gap-3 px-3 py-2 text-left"
      >
        <span className="text-neutral-800">{item.claim}</span>
        <span className="shrink-0 text-xs text-neutral-500">
          {item.filename}
          {item.location ? ` · ${item.location}` : ""}
        </span>
      </button>
      {open && (
        <div className="border-t border-neutral-200 px-3 py-2 text-xs text-neutral-600">
          &ldquo;{item.excerpt}&rdquo;
        </div>
      )}
    </div>
  );
}
