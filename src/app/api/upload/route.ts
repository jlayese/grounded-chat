import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { documents, chunks, chats } from "@/db/schema";
import { extractPages } from "@/lib/extract";
import { chunkPages } from "@/lib/chunk";
import { embedTexts } from "@/lib/local-embeddings";

const ALLOWED_TYPES: Record<string, boolean> = {
  "application/pdf": true,
  "text/plain": true,
  "text/markdown": true,
};

// .md files are frequently sent with an empty or generic mime type by
// browsers, so fall back to the extension when the mime type is unreliable.
function resolveMimeType(file: File): string | null {
  if (ALLOWED_TYPES[file.type]) return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".md") || name.endsWith(".markdown")) return "text/markdown";
  if (name.endsWith(".txt")) return "text/plain";
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const chatId = formData.get("chatId");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (typeof chatId !== "string" || !chatId) {
      return NextResponse.json({ error: "Missing chatId" }, { status: 400 });
    }

    const mimeType = resolveMimeType(file);
    if (!mimeType) {
      return NextResponse.json(
        { error: "Unsupported file type. Upload a PDF, TXT, or Markdown file." },
        { status: 400 }
      );
    }

    const MAX_BYTES = 15 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "File is too large (15MB limit)." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const pages = await extractPages(buffer, mimeType);
    const fullText = pages.map((p) => p.text).join("\n\n");

    if (!fullText.trim()) {
      return NextResponse.json(
        { error: "Couldn't extract any text from this file." },
        { status: 422 }
      );
    }

    const [document] = await db
      .insert(documents)
      .values({
        chatId,
        filename: file.name,
        mimeType,
        content: fullText,
      })
      .returning();

    const pieces = chunkPages(pages, fullText);

    const embeddings = await embedTexts(pieces.map((p) => p.content));

    await db.insert(chunks).values(
      pieces.map((piece, i) => ({
        documentId: document.id,
        chunkIndex: i,
        content: piece.content,
        location: piece.location,
        embedding: embeddings[i],
      }))
    );

    return NextResponse.json({
      document: {
        id: document.id,
        filename: document.filename,
        chunkCount: pieces.length,
      },
    });
  } catch (error) {
    console.error("Upload failed:", error);
    return NextResponse.json(
      { error: "Failed to process the uploaded file." },
      { status: 500 }
    );
  }
}

// Ensures a chat row exists before a document/message references it.
export async function PUT(req: NextRequest) {
  try {
    const { title } = await req.json().catch(() => ({ title: undefined }));
    const [chat] = await db.insert(chats).values({ title }).returning();
    return NextResponse.json({ chat });
  } catch (error) {
    console.error("Failed to create chat:", error);
    return NextResponse.json(
      { error: "Failed to start a new chat session." },
      { status: 500 }
    );
  }
}
