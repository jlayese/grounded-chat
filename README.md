# Document Chat

A small document-chat application built for Kleo's take-home assessment: upload a PDF, TXT, or
Markdown file, then ask questions grounded in its content, with streamed answers and citations.

## Setup

1. `npm install`
2. Create a Neon Postgres project (or point `DATABASE_URL` at any Postgres with the `pgvector`
   extension available) and an OpenRouter API key.
3. Copy `.env.example` to `.env.local` and fill in `DATABASE_URL` and `OPENROUTER_API_KEY`.
4. `npm run db:setup` — enables the `pgvector` extension.
5. `npm run db:push` — creates the schema.
6. `npm run dev`

## Architecture

```
Upload (PDF/TXT/MD)
  -> extract text (real per-page text + page numbers for PDF via pdf-parse;
     heading-aware sections for Markdown)
  -> chunk (paragraph-aware, ~1000 chars, overlap at seams)
  -> embed locally (Xenova/all-MiniLM-L6-v2 via @huggingface/transformers,
     no API key, runs in the Node runtime)
  -> store in Postgres (documents, chunks+embedding vector(384))

Chat message
  -> embed the query (same local model)
  -> retrieve top-6 chunks via pgvector cosine similarity, scoped to that
     chat's own documents only
  -> stream a response (OpenRouter -> gpt-4o-mini) grounded in the retrieved
     excerpts, with document content treated as data, never as instructions
     (basic prompt-injection hygiene, verified — see Security below)
  -> model calls a presentEvidence tool (no `execute`, purely structural) to
     cite claims; the UI renders it as expandable evidence cards
  -> both sides of the exchange persist to Postgres (JSONB message parts,
     so a reload rehydrates the full conversation including tool calls)
```

### Database schema

- `chats` — one row per conversation
- `documents` — uploaded files, full extracted text, scoped to a chat
- `chunks` — chunked text + `location` (page/heading label) + `embedding vector(384)`
- `messages` — `role` + full `parts` JSONB (text, tool calls, everything `useChat` needs to
  rehydrate the UI exactly as it was)

### Why local embeddings instead of an API

OpenRouter (the LLM provider used here) doesn't expose an embeddings endpoint, and the brief said
no paid services are required. Rather than add a second paid API key just for embeddings,
retrieval runs on a small local sentence-transformer model
(`Xenova/all-MiniLM-L6-v2`, 384 dimensions) via `@huggingface/transformers`, entirely in the Node
runtime, no external call, no cost. The real trade-off: cold starts on Vercel pay a one-time
model-download/init cost per warm instance (model cache is routed to `/tmp` since `node_modules`
is read-only at runtime).

## Key trade-offs

- **Chunking is paragraph-aware but not semantic.** It splits on blank lines with a target size
  and a small overlap, not embedding-based semantic chunking. Good enough for this scope; a
  larger document set would benefit from smarter boundaries.
- **Citations are model-reported, not independently verified.** The excerpt text in a citation
  comes from the model quoting the retrieved context, not a server-side re-check that the excerpt
  is a verbatim substring of the source. Worth adding if this went further.
- **Local embeddings trade cold-start latency for zero cost.** Documented above. The alternative
  (a hosted embeddings API) would be faster per-request but adds a second paid dependency this
  scope doesn't need.
- **One evidence tool call per response, not per claim.** The system prompt explicitly asks for
  exactly one `presentEvidence` call bundling every claim into its `items` array. Without that
  constraint, and because the tool has no `execute` (so the loop never gets a result to react to),
  earlier testing showed the model calling the tool repeatedly across steps instead of stopping.

## Known limitation (a real one, not glossed over)

`gpt-4o-mini` sometimes hallucinates a fake tool invocation as **plain text**
(`multi_tool_use.parallel({...})`, a documented artifact from a specific OpenAI training batch)
instead of making a real, structured tool call, on both the Responses and Chat Completions API
paths tested. When this happens, the streamed answer is still correct and grounded, but no real
evidence cards render for that turn. This showed up in roughly 40-50% of tool-calling turns during
testing. I did not paper over it with a fragile regex parser against near-JSON text; documenting
it here is the honest call given the time box. A production fix would likely mean testing a
different model/provider combination for tool-call reliability specifically, not just chat quality.

## Time spent

Roughly the full 5-hour box: initial scaffolding and schema (~45 min), upload/extraction/chunking
pipeline (~1 hr), retrieval + chat route + citation tool (~1 hr), frontend (~1 hr), and the rest on
real end-to-end testing (a real Neon database, a real API key, real uploaded documents, a real
prompt-injection test) plus debugging the tool-calling reliability issue above, rather than
shipping untested.

## AI tools used

Claude Code, as the primary way this was built: scaffolding, schema, API routes, and the frontend.
Every AI SDK API used (`tool()`, `streamText`, `convertToModelMessages`, `embed`/`embedMany`,
`useChat`) was checked directly against the installed package's own TypeScript type definitions
before use, not assumed from training data, since this SDK has had real breaking changes between
versions.

**One example of correcting AI-generated output:** while wiring up message persistence, Claude
Code's first pass read the finished response off `streamText`'s own `onFinish` callback
(`GenerateTextOnEndCallback`), assuming it exposed a ready-made `responseMessage` field. Checking
that callback's actual type (`GenerateTextEndEvent`) showed no such field, it exposes `text`,
`content`, `toolCalls`, and step-level data, not a UI-message-shaped object. The real fix was
moving persistence to `toUIMessageStreamResponse`'s own `onFinish` option instead, whose event
type (`UIMessageStreamOnEndCallback`) does expose the full updated `messages` array in the exact
shape the database needs to store and later rehydrate. Caught by reading the type definitions
before running the code, not after a runtime failure.

A second, more consequential example is the tool-calling reliability issue described above under
Known limitation: the first working version looked correct in a single manual test, but repeated
testing (multiple questions, multiple runs of the same question) surfaced that the model doesn't
reliably call the tool at all, a real behavioral property of the model/provider combination, not
something a single passing test would have caught.
