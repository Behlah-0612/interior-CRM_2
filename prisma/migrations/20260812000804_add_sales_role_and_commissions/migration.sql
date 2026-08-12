-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'SALESPERSON';

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "soldById" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "commissionRateBps" INTEGER;

-- CreateTable
CREATE TABLE "CommissionTier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "minRevenueCents" INTEGER NOT NULL,
    "rateBps" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionTier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommissionTier_minRevenueCents_idx" ON "CommissionTier"("minRevenueCents");

-- CreateIndex
CREATE INDEX "Customer_soldById_idx" ON "Customer"("soldById");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_soldById_fkey" FOREIGN KEY ("soldById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
