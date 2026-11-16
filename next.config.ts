import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // transformers.js and pdf-parse use native/dynamic Node APIs that don't
  // bundle cleanly; keep them as real dependencies at runtime instead.
  serverExternalPackages: ["@huggingface/transformers", "pdf-parse"],
  // onnxruntime's native binding loads libonnxruntime.so.1 and pdfjs loads its
  // worker by path at runtime, which file tracing can't see, so ship both with
  // the API routes.
  outputFileTracingIncludes: {
    "/api/*": [
      "./node_modules/onnxruntime-node/bin/napi-v6/linux/x64/**/*",
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
    ],
  },
};

export default nextConfig;
