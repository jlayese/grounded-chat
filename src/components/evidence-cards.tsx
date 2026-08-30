"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

type EvidenceItem = {
  claim: string;
  filename: string;
  location: string | null;
  excerpt: string;
};

export function EvidenceCards({ items }: { items: EvidenceItem[] }) {
  if (!items?.length) return null;

  return (
    <div className="mt-3 flex flex-col gap-2">
      {items.map((item, i) => (
        <EvidenceCard key={i} item={item} />
      ))}
    </div>
  );
}

function EvidenceCard({ item }: { item: EvidenceItem }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-border bg-panel/40 text-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-accent"
      >
        <span className="font-sans text-foreground">{item.claim}</span>
        <span className="flex shrink-0 items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
          {item.filename}
          {item.location ? ` · ${item.location}` : ""}
          <ChevronDown
            className={`size-3 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>
      {open && (
        <div className="border-t border-border px-3 py-2 font-sans text-xs text-muted-foreground">
          &ldquo;{item.excerpt}&rdquo;
        </div>
      )}
    </div>
  );
}
