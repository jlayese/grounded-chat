import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // transformers.js and pdf-parse use native/dynamic Node APIs that don't
  // bundle cleanly; keep them as real dependencies at runtime instead.
  serverExternalPackages: ["@huggingface/transformers", "pdf-parse"],
};

export default nextConfig;
