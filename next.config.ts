import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // cacheComponents is left off on purpose: it keeps a left page alive in the background, and
  // the Monaco code editor crashes ("InstantiationService has been disposed") when that page comes back.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
