import { PDFParse } from "pdf-parse";

export type ExtractedPage = {
  location: string | null;
  text: string;
};

/**
 * Extracts text from an uploaded file, split into location-tagged sections
 * (real PDF page numbers when available) so downstream chunks can carry
 * accurate citation metadata.
 */
export async function extractPages(
  buffer: Buffer,
  mimeType: string
): Promise<ExtractedPage[]> {
  if (mimeType === "application/pdf") {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.pages
        .filter((p) => p.text.trim().length > 0)
        .map((p) => ({ location: `Page ${p.num}`, text: p.text }));
    } finally {
      await parser.destroy();
    }
  }

  // TXT / Markdown: treat as a single section, headings (if any) are
  // resolved per-chunk at chunking time so location labels stay accurate
  // even when a heading falls mid-way through the file.
  const text = buffer.toString("utf-8");
  return [{ location: null, text }];
}
