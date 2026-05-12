-- AlterTable
ALTER TABLE "Tariff" ADD COLUMN     "country" TEXT,
ADD COLUMN     "fixedFeePerMonth" DOUBLE PRECISION,
ADD COLUMN     "markupPerKwh" DOUBLE PRECISION,
ADD COLUMN     "tariffType" TEXT NOT NULL DEFAULT 'FIXED',
ADD COLUMN     "taxPercentage" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "EpexSpotPrice" (
    "id" SERIAL NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "country" TEXT NOT NULL,
    "pricePerMwh" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "EpexSpotPrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EpexSpotPrice_timestamp_country_key" ON "EpexSpotPrice"("timestamp", "country");
