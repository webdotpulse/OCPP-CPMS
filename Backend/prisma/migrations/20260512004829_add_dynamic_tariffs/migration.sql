-- AlterTable
ALTER TABLE "MeterValue" ADD COLUMN     "current_L1" DOUBLE PRECISION,
ADD COLUMN     "current_L2" DOUBLE PRECISION,
ADD COLUMN     "current_L3" DOUBLE PRECISION,
ADD COLUMN     "voltage_L1" DOUBLE PRECISION,
ADD COLUMN     "voltage_L2" DOUBLE PRECISION,
ADD COLUMN     "voltage_L3" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "DeviceComponent" (
    "id" SERIAL NOT NULL,
    "chargerId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "instance" TEXT,
    "evseId" INTEGER,
    "connectorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceVariable" (
    "id" SERIAL NOT NULL,
    "componentId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "instance" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceVariable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VariableAttribute" (
    "id" SERIAL NOT NULL,
    "variableId" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'Actual',
    "value" TEXT,
    "mutability" TEXT,
    "persistent" BOOLEAN NOT NULL DEFAULT false,
    "constant" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VariableAttribute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChargerAlert" (
    "id" SERIAL NOT NULL,
    "chargerId" INTEGER NOT NULL,
    "eventId" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "severity" INTEGER NOT NULL,
    "component" TEXT NOT NULL,
    "variable" TEXT NOT NULL,
    "actualValue" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChargerAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VariableAttribute_variableId_type_key" ON "VariableAttribute"("variableId", "type");

-- AddForeignKey
ALTER TABLE "DeviceComponent" ADD CONSTRAINT "DeviceComponent_chargerId_fkey" FOREIGN KEY ("chargerId") REFERENCES "Charger"("charger_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceVariable" ADD CONSTRAINT "DeviceVariable_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "DeviceComponent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariableAttribute" ADD CONSTRAINT "VariableAttribute_variableId_fkey" FOREIGN KEY ("variableId") REFERENCES "DeviceVariable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChargerAlert" ADD CONSTRAINT "ChargerAlert_chargerId_fkey" FOREIGN KEY ("chargerId") REFERENCES "Charger"("charger_id") ON DELETE CASCADE ON UPDATE CASCADE;
