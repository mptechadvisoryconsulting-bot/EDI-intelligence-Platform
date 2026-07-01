import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "better-sqlite3",
    "@libsql/client",
    "@prisma/adapter-better-sqlite3",
    "@prisma/adapter-libsql",
  ],
};

export default nextConfig;
