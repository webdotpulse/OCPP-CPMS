/*
  Warnings:

  - You are about to drop the column `power_consumption` on the `Charger` table. All the data in the column will be lost.
  - You are about to drop the column `warranty_period` on the `Charger` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Charger" DROP COLUMN "power_consumption",
DROP COLUMN "warranty_period",
ADD COLUMN     "chargeGroupId" INTEGER,
ADD COLUMN     "thirdPartyBackendUrl" TEXT,
ALTER COLUMN "manufacturing_date" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ChargingStation" ADD COLUMN     "country" TEXT,
ADD COLUMN     "maxPower" DOUBLE PRECISION,
ALTER COLUMN "state" DROP NOT NULL,
ALTER COLUMN "on_site_person_name" DROP NOT NULL,
ALTER COLUMN "on_site_contact_details" DROP NOT NULL,
ALTER COLUMN "emergency_contact" DROP NOT NULL;

-- AlterTable
ALTER TABLE "OcppLog" ALTER COLUMN "transactionId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "RfidSession" ADD COLUMN     "current" DOUBLE PRECISION,
ADD COLUMN     "currentPower" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "soc" DOUBLE PRECISION,
ADD COLUMN     "stopReason" TEXT,
ADD COLUMN     "voltage" DOUBLE PRECISION,
ALTER COLUMN "transactionId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "RfidUser" ADD COLUMN     "external_id" TEXT;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "current" DOUBLE PRECISION,
ADD COLUMN     "currentPower" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "soc" DOUBLE PRECISION,
ADD COLUMN     "stopReason" TEXT,
ADD COLUMN     "voltage" DOUBLE PRECISION,
ALTER COLUMN "transactionId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "address" TEXT,
ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "resetToken" TEXT,
ADD COLUMN     "resetTokenExpiry" TIMESTAMP(3),
ADD COLUMN     "taxNumber" TEXT,
ADD COLUMN     "twoFactorCode" TEXT,
ADD COLUMN     "twoFactorCodeExpiry" TIMESTAMP(3),
ADD COLUMN     "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "twoFactorMethod" TEXT,
ADD COLUMN     "twoFactorSecret" TEXT,
ADD COLUMN     "userType" TEXT NOT NULL DEFAULT 'private';

-- CreateTable
CREATE TABLE "PaymentTransaction" (
    "id" SERIAL NOT NULL,
    "transactionId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "paymentIntentId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OcpiEndpoint" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '2.2.1',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OcpiEndpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChargeGroup" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "maxPower" DOUBLE PRECISION,
    "maxAmperage" DOUBLE PRECISION,
    "phaseUnbalanceLimit" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChargeGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChargerConfiguration" (
    "id" SERIAL NOT NULL,
    "chargerId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "readonly" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ChargerConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChargeGroupUser" (
    "chargeGroupId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "tariffId" INTEGER,

    CONSTRAINT "ChargeGroupUser_pkey" PRIMARY KEY ("chargeGroupId","userId")
);

-- CreateTable
CREATE TABLE "UnrecognizedConnection" (
    "id" SERIAL NOT NULL,
    "chargePointId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "reason" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UnrecognizedConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChargingProfile" (
    "id" SERIAL NOT NULL,
    "chargerId" INTEGER NOT NULL,
    "connectorId" INTEGER NOT NULL,
    "chargingProfileId" INTEGER NOT NULL,
    "transactionId" TEXT,
    "stackLevel" INTEGER NOT NULL,
    "chargingProfilePurpose" TEXT NOT NULL,
    "chargingProfileKind" TEXT NOT NULL,
    "recurrencyKind" TEXT,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "chargingSchedule" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChargingProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OicpEndpoint" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '2.3.0',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OicpEndpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfigurationProfile" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfigurationProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfigurationProfileItem" (
    "id" SERIAL NOT NULL,
    "profileId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "ConfigurationProfileItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeterValue" (
    "id" SERIAL NOT NULL,
    "transactionId" TEXT NOT NULL,
    "chargerId" INTEGER NOT NULL,
    "connectorId" INTEGER,
    "energy" DOUBLE PRECISION,
    "power" DOUBLE PRECISION,
    "soc" DOUBLE PRECISION,
    "current" DOUBLE PRECISION,
    "voltage" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeterValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTransaction_transactionId_key" ON "PaymentTransaction"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "ChargerConfiguration_chargerId_key_key" ON "ChargerConfiguration"("chargerId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "ChargingProfile_chargerId_chargingProfileId_key" ON "ChargingProfile"("chargerId", "chargingProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "ConfigurationProfile_name_key" ON "ConfigurationProfile"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ConfigurationProfileItem_profileId_key_key" ON "ConfigurationProfileItem"("profileId", "key");

-- CreateIndex
CREATE INDEX "MeterValue_transactionId_idx" ON "MeterValue"("transactionId");

-- CreateIndex
CREATE INDEX "MeterValue_chargerId_idx" ON "MeterValue"("chargerId");

-- CreateIndex
CREATE INDEX "OcppLog_chargerId_idx" ON "OcppLog"("chargerId");

-- CreateIndex
CREATE INDEX "Transaction_charger_id_idx" ON "Transaction"("charger_id");

-- CreateIndex
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");

-- AddForeignKey
ALTER TABLE "Charger" ADD CONSTRAINT "Charger_chargeGroupId_fkey" FOREIGN KEY ("chargeGroupId") REFERENCES "ChargeGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChargerConfiguration" ADD CONSTRAINT "ChargerConfiguration_chargerId_fkey" FOREIGN KEY ("chargerId") REFERENCES "Charger"("charger_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChargeGroupUser" ADD CONSTRAINT "ChargeGroupUser_chargeGroupId_fkey" FOREIGN KEY ("chargeGroupId") REFERENCES "ChargeGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChargeGroupUser" ADD CONSTRAINT "ChargeGroupUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChargeGroupUser" ADD CONSTRAINT "ChargeGroupUser_tariffId_fkey" FOREIGN KEY ("tariffId") REFERENCES "Tariff"("tariff_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChargingProfile" ADD CONSTRAINT "ChargingProfile_chargerId_fkey" FOREIGN KEY ("chargerId") REFERENCES "Charger"("charger_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfigurationProfileItem" ADD CONSTRAINT "ConfigurationProfileItem_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ConfigurationProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeterValue" ADD CONSTRAINT "MeterValue_chargerId_fkey" FOREIGN KEY ("chargerId") REFERENCES "Charger"("charger_id") ON DELETE CASCADE ON UPDATE CASCADE;
