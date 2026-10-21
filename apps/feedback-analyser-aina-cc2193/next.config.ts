import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Server-only packages that must not be bundled into client code
  serverExternalPackages: ["@neondatabase/serverless"],
};

export default nextConfig;
