-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "userType" TEXT NOT NULL DEFAULT 'private',
    "companyName" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "taxNumber" TEXT,
    "resetToken" TEXT,
    "resetTokenExpiry" TIMESTAMP(3),
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorMethod" TEXT,
    "twoFactorSecret" TEXT,
    "twoFactorCode" TEXT,
    "twoFactorCodeExpiry" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChargingStation" (
    "id" SERIAL NOT NULL,
    "station_name" TEXT NOT NULL,
    "street_name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "postal_code" TEXT NOT NULL,
    "country" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "on_site_person_name" TEXT,
    "on_site_contact_details" TEXT,
    "emergency_contact" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "maxPower" DOUBLE PRECISION,
    "owner_id" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChargingStation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Charger" (
    "charger_id" SERIAL NOT NULL,
    "model" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "serial_number" TEXT NOT NULL,
    "manufacturing_date" TIMESTAMP(3),
    "power_capacity" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'offline',
    "last_heartbeat" TIMESTAMP(3) NOT NULL DEFAULT '1970-01-01 00:00:00 +00:00',
    "firmware_version" TEXT NOT NULL,
    "service_contacts" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "thirdPartyBackendUrl" TEXT,
    "owner_id" INTEGER NOT NULL,
    "charging_station_id" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "chargeGroupId" INTEGER,
    "quirkProfileId" INTEGER,

    CONSTRAINT "Charger_pkey" PRIMARY KEY ("charger_id")
);

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

-- CreateTable
CREATE TABLE "Evse" (
    "id" SERIAL NOT NULL,
    "evse_id" INTEGER NOT NULL,
    "charger_id" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Evse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Connector" (
    "connector_id" SERIAL NOT NULL,
    "connector_name" TEXT NOT NULL DEFAULT 'Connector 1',
    "status" TEXT NOT NULL,
    "current_type" TEXT NOT NULL,
    "max_current" DOUBLE PRECISION,
    "max_power" DOUBLE PRECISION,
    "mac_address" TEXT,
    "evse_id" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Connector_pkey" PRIMARY KEY ("connector_id")
);

-- CreateTable
CREATE TABLE "RfidUser" (
    "rfid_user_id" SERIAL NOT NULL,
    "rfid_tag" TEXT NOT NULL,
    "external_id" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "company_name" TEXT,
    "address" TEXT,
    "type" TEXT NOT NULL DEFAULT 'postpaid',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "owner_id" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RfidUser_pkey" PRIMARY KEY ("rfid_user_id")
);

-- CreateTable
CREATE TABLE "RfidSession" (
    "id" SERIAL NOT NULL,
    "transactionId" TEXT NOT NULL,
    "rfidUserId" INTEGER NOT NULL,
    "charger_id" INTEGER NOT NULL,
    "connectorName" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "initialMeterValue" DOUBLE PRECISION,
    "finalMeterValue" DOUBLE PRECISION,
    "energyConsumed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentPower" DOUBLE PRECISION DEFAULT 0,
    "soc" DOUBLE PRECISION,
    "current" DOUBLE PRECISION,
    "voltage" DOUBLE PRECISION,
    "tariffRate" DOUBLE PRECISION,
    "amountDue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'charging',
    "stopReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RfidSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" SERIAL NOT NULL,
    "transactionId" TEXT NOT NULL,
    "connectorName" TEXT NOT NULL,
    "charger_id" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "initialMeterValue" DOUBLE PRECISION,
    "finalMeterValue" DOUBLE PRECISION,
    "energyConsumed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentPower" DOUBLE PRECISION DEFAULT 0,
    "soc" DOUBLE PRECISION,
    "current" DOUBLE PRECISION,
    "voltage" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'initiated',
    "stopReason" TEXT,
    "idTag" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OcppLog" (
    "id" SERIAL NOT NULL,
    "chargerId" INTEGER NOT NULL,
    "transactionId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "direction" TEXT NOT NULL,
    "message" TEXT NOT NULL,

    CONSTRAINT "OcppLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tariff" (
    "tariff_id" SERIAL NOT NULL,
    "tariff_name" TEXT NOT NULL,
    "charge" DOUBLE PRECISION NOT NULL,
    "electricity_rate" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tariff_pkey" PRIMARY KEY ("tariff_id")
);

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
    "current_L1" DOUBLE PRECISION,
    "current_L2" DOUBLE PRECISION,
    "current_L3" DOUBLE PRECISION,
    "voltage_L1" DOUBLE PRECISION,
    "voltage_L2" DOUBLE PRECISION,
    "voltage_L3" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeterValue_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "_ChargerToTariff" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ChargerToTariff_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Charger_name_key" ON "Charger"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Charger_serial_number_key" ON "Charger"("serial_number");

-- CreateIndex
CREATE UNIQUE INDEX "ChargerQuirkProfile_name_key" ON "ChargerQuirkProfile"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Evse_charger_id_evse_id_key" ON "Evse"("charger_id", "evse_id");

-- CreateIndex
CREATE UNIQUE INDEX "RfidUser_rfid_tag_key" ON "RfidUser"("rfid_tag");

-- CreateIndex
CREATE UNIQUE INDEX "RfidSession_transactionId_key" ON "RfidSession"("transactionId");

-- CreateIndex
CREATE INDEX "Transaction_charger_id_idx" ON "Transaction"("charger_id");

-- CreateIndex
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");

-- CreateIndex
CREATE INDEX "OcppLog_chargerId_idx" ON "OcppLog"("chargerId");

-- CreateIndex
CREATE UNIQUE INDEX "Tariff_tariff_name_key" ON "Tariff"("tariff_name");

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
CREATE UNIQUE INDEX "VariableAttribute_variableId_type_key" ON "VariableAttribute"("variableId", "type");

-- CreateIndex
CREATE INDEX "_ChargerToTariff_B_index" ON "_ChargerToTariff"("B");

-- AddForeignKey
ALTER TABLE "ChargingStation" ADD CONSTRAINT "ChargingStation_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Charger" ADD CONSTRAINT "Charger_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Charger" ADD CONSTRAINT "Charger_charging_station_id_fkey" FOREIGN KEY ("charging_station_id") REFERENCES "ChargingStation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Charger" ADD CONSTRAINT "Charger_chargeGroupId_fkey" FOREIGN KEY ("chargeGroupId") REFERENCES "ChargeGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Charger" ADD CONSTRAINT "Charger_quirkProfileId_fkey" FOREIGN KEY ("quirkProfileId") REFERENCES "ChargerQuirkProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evse" ADD CONSTRAINT "Evse_charger_id_fkey" FOREIGN KEY ("charger_id") REFERENCES "Charger"("charger_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Connector" ADD CONSTRAINT "Connector_evse_id_fkey" FOREIGN KEY ("evse_id") REFERENCES "Evse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfidUser" ADD CONSTRAINT "RfidUser_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfidSession" ADD CONSTRAINT "RfidSession_charger_id_fkey" FOREIGN KEY ("charger_id") REFERENCES "Charger"("charger_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfidSession" ADD CONSTRAINT "RfidSession_rfidUserId_fkey" FOREIGN KEY ("rfidUserId") REFERENCES "RfidUser"("rfid_user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_charger_id_fkey" FOREIGN KEY ("charger_id") REFERENCES "Charger"("charger_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OcppLog" ADD CONSTRAINT "OcppLog_chargerId_fkey" FOREIGN KEY ("chargerId") REFERENCES "Charger"("charger_id") ON DELETE RESTRICT ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "DeviceComponent" ADD CONSTRAINT "DeviceComponent_chargerId_fkey" FOREIGN KEY ("chargerId") REFERENCES "Charger"("charger_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceVariable" ADD CONSTRAINT "DeviceVariable_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "DeviceComponent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariableAttribute" ADD CONSTRAINT "VariableAttribute_variableId_fkey" FOREIGN KEY ("variableId") REFERENCES "DeviceVariable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChargerAlert" ADD CONSTRAINT "ChargerAlert_chargerId_fkey" FOREIGN KEY ("chargerId") REFERENCES "Charger"("charger_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ChargerToTariff" ADD CONSTRAINT "_ChargerToTariff_A_fkey" FOREIGN KEY ("A") REFERENCES "Charger"("charger_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ChargerToTariff" ADD CONSTRAINT "_ChargerToTariff_B_fkey" FOREIGN KEY ("B") REFERENCES "Tariff"("tariff_id") ON DELETE CASCADE ON UPDATE CASCADE;
