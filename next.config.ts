import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // three.js ships untranspiled ESM examples; let Next transpile them.
  transpilePackages: ["three"],
};

export default nextConfig;
