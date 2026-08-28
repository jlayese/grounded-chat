import { createOpenAI } from "@ai-sdk/openai";

// OpenRouter is an OpenAI-compatible provider: same request/response shape,
// different base URL and key. Embeddings run locally instead (see
// local-embeddings.ts), since OpenRouter doesn't expose an embeddings API.
const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

// Known limitation, documented in the README: gpt-4o-mini sometimes
// hallucinates a fake `multi_tool_use.parallel(...)` pseudo-call as plain
// text instead of emitting a real tool call, on both the Responses and
// Chat Completions API paths. The default (Responses) path was empirically
// more reliable in testing, so it's used here rather than .chat().
export const chatModel = openrouter("openai/gpt-4o-mini");
