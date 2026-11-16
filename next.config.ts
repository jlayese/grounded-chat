import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // transformers.js and pdf-parse use native/dynamic Node APIs that don't
  // bundle cleanly; keep them as real dependencies at runtime instead.
  serverExternalPackages: ["@huggingface/transformers", "pdf-parse"],
  // onnxruntime's native binding loads libonnxruntime.so.1 at runtime, which
  // file tracing can't see, so ship the Linux binaries with the API routes.
  outputFileTracingIncludes: {
    "/api/*": ["./node_modules/onnxruntime-node/bin/napi-v6/linux/x64/**/*"],
  },
};

export default nextConfig;
