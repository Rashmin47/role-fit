/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Prisma's Rust-free client and the SQLite native driver must stay outside
  // the bundler once the persistence layer is wired into server code.
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-better-sqlite3"],
};

export default nextConfig;
