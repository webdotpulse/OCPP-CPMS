-- AlterTable
ALTER TABLE "Charger" ADD COLUMN     "quirkProfileId" INTEGER;

-- CreateTable
CREATE TABLE "ChargerQuirkProfile" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "rules" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChargerQuirkProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChargerQuirkProfile_name_key" ON "ChargerQuirkProfile"("name");

-- AddForeignKey
ALTER TABLE "Charger" ADD CONSTRAINT "Charger_quirkProfileId_fkey" FOREIGN KEY ("quirkProfileId") REFERENCES "ChargerQuirkProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
