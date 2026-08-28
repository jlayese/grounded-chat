import {
  pgTable,
  uuid,
  text,
  varchar,
  integer,
  timestamp,
  vector,
  jsonb,
} from "drizzle-orm/pg-core";

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  chatId: uuid("chat_id")
    .notNull()
    .references(() => chats.id, { onDelete: "cascade" }),
  filename: varchar("filename", { length: 512 }).notNull(),
  mimeType: varchar("mime_type", { length: 128 }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const chunks = pgTable("chunks", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  chunkIndex: integer("chunk_index").notNull(),
  content: text("content").notNull(),
  // Section/page label, best-effort (e.g. "Page 3" or "Section 2.1"), null if unknown.
  location: varchar("location", { length: 128 }),
  embedding: vector("embedding", { dimensions: 384 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const chats = pgTable("chats", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 256 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  chatId: uuid("chat_id")
    .notNull()
    .references(() => chats.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 32 }).notNull(),
  // Full UIMessage parts array (text, tool calls, citations) stored as JSON
  // so a reload can rehydrate the exact conversation, not just plain text.
  parts: jsonb("parts").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
