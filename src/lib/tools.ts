import { tool } from "ai";
import { z } from "zod";

/**
 * No `execute` function on purpose: this tool exists purely to hand the
 * frontend structured data to render as evidence cards. The model decides
 * *when* a claim is worth surfacing as evidence; the UI decides how to
 * display it.
 */
export const presentEvidence = tool({
  description:
    "Present the specific factual claims used to answer the question, each grounded in an excerpt from the uploaded document. Call this whenever you give a factual answer sourced from the document.",
  inputSchema: z.object({
    items: z
      .array(
        z.object({
          claim: z.string().describe("The specific fact or answer being supported"),
          filename: z.string().describe("The source document's filename"),
          location: z
            .string()
            .nullable()
            .describe("Page or section label, e.g. 'Page 3', or null if unknown"),
          excerpt: z
            .string()
            .describe("The exact excerpt from the document that supports the claim"),
        })
      )
      .min(1),
  }),
});

export const tools = { presentEvidence };
