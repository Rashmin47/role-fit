/**
 * Server-only Prisma client.
 *
 * The generated client, the SQLite driver adapter, and the connection string
 * must never reach a browser bundle. Import this module only from route
 * handlers, server-side repositories, seeds, and tests.
 */

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/prisma/generated/client";

if (typeof window !== "undefined") {
  throw new Error(
    "The database client was imported into client code. Use an API route instead."
  );
}

const globalForPrisma = globalThis as unknown as {
  roleFitPrisma?: PrismaClient;
};

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  const adapter = new PrismaBetterSqlite3({ url });
  return new PrismaClient({ adapter });
}

/**
 * Reuse one client across hot reloads in development. Next.js clears module
 * state on every edit, and a fresh SQLite connection per reload leaks handles.
 */
export const prisma = globalForPrisma.roleFitPrisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.roleFitPrisma = prisma;
}
