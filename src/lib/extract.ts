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
    // pdf-parse (via pdfjs-dist) references DOMMatrix, a browser-only API,
    // even for plain text extraction with no rendering involved. It isn't
    // defined in the Node.js runtime Vercel/Next.js API routes run in, so
    // polyfill it before pdf-parse loads. Also why the import is dynamic
    // here rather than a static top-of-file import: a static import would
    // crash this entire module, including routes that never touch PDFs,
    // the moment Next.js loads it as an external module.
    if (!("DOMMatrix" in globalThis)) {
      const { default: CSSMatrix } = await import("dommatrix");
      (globalThis as typeof globalThis & { DOMMatrix: unknown }).DOMMatrix =
        CSSMatrix;
    }
    const { PDFParse } = await import("pdf-parse");
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
