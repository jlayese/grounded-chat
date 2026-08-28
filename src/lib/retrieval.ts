import { desc, eq, gt, and, cosineDistance, sql } from "drizzle-orm";
import { db } from "@/db";
import { chunks, documents } from "@/db/schema";
import { embedText } from "@/lib/local-embeddings";

export type RetrievedChunk = {
  content: string;
  location: string | null;
  filename: string;
  similarity: number;
};

/**
 * Embeds the query and returns the most relevant chunks scoped to this
 * chat's own uploaded documents (never leaks another chat's content).
 */
export async function retrieveRelevantChunks(
  chatId: string,
  query: string,
  limit = 6
): Promise<RetrievedChunk[]> {
  const embedding = await embedText(query);

  const similarity = sql<number>`1 - (${cosineDistance(chunks.embedding, embedding)})`;

  const results = await db
    .select({
      content: chunks.content,
      location: chunks.location,
      filename: documents.filename,
      similarity,
    })
    .from(chunks)
    .innerJoin(documents, eq(chunks.documentId, documents.id))
    .where(and(eq(documents.chatId, chatId), gt(similarity, 0.3)))
    .orderBy((t) => desc(t.similarity))
    .limit(limit);

  return results;
}
