-- CreateEnum
CREATE TYPE "TariffType" AS ENUM ('FIXED', 'DYNAMIC_EPEX');

-- CreateEnum
CREATE TYPE "CountryCode" AS ENUM ('BE', 'NL');

-- AlterTable
ALTER TABLE "Tariff" ADD COLUMN     "country" "CountryCode",
ADD COLUMN     "fixedFeePerMonth" DOUBLE PRECISION,
ADD COLUMN     "markupPerKwh" DOUBLE PRECISION,
ADD COLUMN     "tariffType" "TariffType" NOT NULL DEFAULT 'FIXED',
ADD COLUMN     "taxPercentage" DOUBLE PRECISION,
ALTER COLUMN "charge" DROP NOT NULL,
ALTER COLUMN "electricity_rate" DROP NOT NULL;

-- CreateTable
CREATE TABLE "EpexSpotPrice" (
    "id" SERIAL NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "country" "CountryCode" NOT NULL,
    "pricePerMwh" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EpexSpotPrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EpexSpotPrice_timestamp_idx" ON "EpexSpotPrice"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "EpexSpotPrice_timestamp_country_key" ON "EpexSpotPrice"("timestamp", "country");
