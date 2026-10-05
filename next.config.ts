import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Preserve the repository's hand-written instruction map.
  agentRules: false,
};

export default nextConfig;
