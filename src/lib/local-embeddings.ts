import os from "node:os";
import path from "node:path";
import { env, pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";

// node_modules is read-only on Vercel at runtime, so route the model cache
// to the OS tmp dir (Vercel's writable /tmp) instead of the package default.
env.cacheDir = path.join(os.tmpdir(), "transformers-cache");

const MODEL_ID = "Xenova/all-MiniLM-L6-v2";
export const EMBEDDING_DIMENSIONS = 384;

let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;

// Loaded once per warm serverless instance; the first request per cold
// start pays the model-download/init cost, subsequent requests reuse it.
function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = pipeline("feature-extraction", MODEL_ID);
  }
  return extractorPromise;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const extractor = await getExtractor();
  const output = await extractor(texts, { pooling: "mean", normalize: true });
  const [count, dims] = output.dims;
  const flat = output.data as Float32Array;

  const vectors: number[][] = [];
  for (let i = 0; i < count; i++) {
    vectors.push(Array.from(flat.slice(i * dims, (i + 1) * dims)));
  }
  return vectors;
}

export async function embedText(text: string): Promise<number[]> {
  const [vector] = await embedTexts([text]);
  return vector;
}
