
-- CreateTable
CREATE TABLE "Evse" (
    "id" SERIAL NOT NULL,
    "evse_id" INTEGER NOT NULL,
    "charger_id" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Evse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Evse_charger_id_evse_id_key" ON "Evse"("charger_id", "evse_id");

-- AddForeignKey
ALTER TABLE "Evse" ADD CONSTRAINT "Evse_charger_id_fkey" FOREIGN KEY ("charger_id") REFERENCES "Charger"("charger_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE "Connector" DROP CONSTRAINT "Connector_charger_id_fkey";

-- AlterTable
ALTER TABLE "Connector" RENAME COLUMN "charger_id" TO "evse_id";

-- AddForeignKey
ALTER TABLE "Connector" ADD CONSTRAINT "Connector_evse_id_fkey" FOREIGN KEY ("evse_id") REFERENCES "Evse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
