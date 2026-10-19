import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "./generated/client.js";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding Role Fit database...");

  // Upsert default organization
  const org = await prisma.organization.upsert({
    where: { slug: "apex-engineering" },
    update: {},
    create: {
      name: "Apex Engineering",
      slug: "apex-engineering",
    },
  });

  // Upsert demo user
  await prisma.user.upsert({
    where: { email: "rashmin@rolefit.app" },
    update: {},
    create: {
      name: "Rashmin",
      email: "rashmin@rolefit.app",
      role: "lead_recruiter",
      organizationId: org.id,
    },
  });

  console.log("✅ Seed completed successfully.");
}

main()
  .catch((error) => {
    console.error("Seed error:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
