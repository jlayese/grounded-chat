import { NextRequest, NextResponse } from "next/server";
import { eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { documents } from "@/db/schema";

export async function GET(req: NextRequest) {
  const chatId = req.nextUrl.searchParams.get("chatId");
  if (!chatId) {
    return NextResponse.json({ error: "Missing chatId" }, { status: 400 });
  }

  const rows = await db
    .select({
      id: documents.id,
      filename: documents.filename,
      mimeType: documents.mimeType,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .where(eq(documents.chatId, chatId))
    .orderBy(asc(documents.createdAt));

  return NextResponse.json({ documents: rows });
}
