// Creates the first Admin account so someone can actually log in.
// Run automatically by `prisma migrate dev`, or manually with `npm run db:seed`.
//
// Customize the first admin via env vars before running, e.g.:
//   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=something-strong npm run db:seed

import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { sslConfigFor } from "../lib/db-ssl";

const connectionString = process.env.DATABASE_URL || "";
const adapter = new PrismaPg({ connectionString, ssl: sslConfigFor(connectionString) });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = (process.env.ADMIN_EMAIL || "admin@interiorhomeservicesbc.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "ChangeMe123!";
  const name = process.env.ADMIN_NAME || "Admin";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin account already exists for ${email} — skipping seed.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role: "ADMIN",
      active: true,
    },
  });

  console.log("Created first Admin account:");
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
  console.log("Sign in and change this password (or create your real account) right away.");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
