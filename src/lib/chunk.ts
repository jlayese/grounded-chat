import type { ExtractedPage } from "./extract";

export type Chunk = {
  content: string;
  location: string | null;
};

const TARGET_CHUNK_SIZE = 1000;
const OVERLAP = 150;

/**
 * Splits text into overlapping, roughly-paragraph-aligned chunks so a single
 * chunk doesn't cut a sentence in half at the boundary the embedding will be
 * compared against.
 */
function splitText(text: string): string[] {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    if (current.length + para.length + 2 > TARGET_CHUNK_SIZE && current) {
      chunks.push(current);
      // Carry a small overlap forward so context isn't lost at the seam.
      current = current.slice(-OVERLAP) + "\n\n" + para;
    } else {
      current = current ? current + "\n\n" + para : para;
    }
  }
  if (current.trim()) chunks.push(current);

  // Fallback for a single huge paragraph with no blank-line breaks.
  return chunks.flatMap((c) =>
    c.length <= TARGET_CHUNK_SIZE * 1.5
      ? [c]
      : (c.match(new RegExp(`.{1,${TARGET_CHUNK_SIZE}}`, "gs")) ?? [c])
  );
}

/** Finds the most recent Markdown heading before a given offset, if any. */
function nearestHeading(text: string, offset: number): string | null {
  const before = text.slice(0, offset);
  const matches = [...before.matchAll(/^#{1,6}\s+(.+)$/gm)];
  return matches.length ? matches[matches.length - 1][1].trim() : null;
}

export function chunkPages(pages: ExtractedPage[], fullText: string): Chunk[] {
  const chunks: Chunk[] = [];
  let runningOffset = 0;

  for (const page of pages) {
    for (const content of splitText(page.text)) {
      const location =
        page.location ?? nearestHeading(fullText, runningOffset);
      chunks.push({ content, location });
    }
    runningOffset += page.text.length;
  }

  return chunks;
}
