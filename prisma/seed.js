const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Nirman database seed...");

  // Upsert Default Organization
  const org = await prisma.organization.upsert({
    where: { slug: "apex-engineering" },
    update: {},
    create: {
      name: "Apex Engineering",
      slug: "apex-engineering",
    },
  });

  // Upsert User
  await prisma.user.upsert({
    where: { email: "rashmin@nirman.ai" },
    update: {},
    create: {
      name: "Rashmin",
      email: "rashmin@nirman.ai",
      role: "lead_recruiter",
      organizationId: org.id,
    },
  });

  console.log("✅ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
