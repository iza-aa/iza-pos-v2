import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,

  eslint: {
    ignoreDuringBuilds: true,
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  turbopack: {
    resolveExtensions: [".tsx", ".ts", ".jsx", ".js"],
  },
};

export default nextConfig;