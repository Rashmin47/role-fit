/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Prisma's Rust-free client and the SQLite native driver must stay outside
  // the bundler once the persistence layer is wired into server code.
  // unpdf/pdfjs and mammoth are Node-only document parsers used by the ingest
  // route; keep them unbundled so their workers and assets resolve correctly.
  serverExternalPackages: [
    "@prisma/client",
    "@prisma/adapter-better-sqlite3",
    "unpdf",
    "mammoth",
  ],
};

export default nextConfig;
