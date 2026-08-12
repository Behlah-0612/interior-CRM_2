import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { sslConfigFor } from "@/lib/db-ssl";

// Prevents creating a new Prisma Client + connection pool on every hot reload
// in development. In production, this just creates one instance per server.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Add it to your .env file (see .env.example)."
  );
}

const adapter = new PrismaPg({ connectionString, ssl: sslConfigFor(connectionString) });

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
