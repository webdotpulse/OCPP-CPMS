import { Request, Response } from "express";
import { prisma } from "../../config/database.js";

export const getAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const vehicles = await prisma.vehicleContractCertificate.findMany({
      include: { user: true, rfidUser: true },
    });
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch vehicles" });
  }
};

export const create = async (req: Request, res: Response): Promise<void> => {
  try {
    const { emaid, macAddress, contractCert, status, expirationDate, userId, rfidUserId } = req.body;

    // Convert expirationDate to ISO format if provided
    let expDate = expirationDate ? new Date(expirationDate) : undefined;
    if (!expDate) {
       expDate = new Date();
       expDate.setFullYear(expDate.getFullYear() + 1); // default 1 year from now
    }

    const newVcc = await prisma.vehicleContractCertificate.create({
      data: {
        emaid,
        macAddress,
        contractCert,
        status: status || "Valid",
        expirationDate: expDate,
        userId: Number(userId),
        rfidUserRfid_user_id: rfidUserId ? Number(rfidUserId) : undefined,
      },
    });
    res.status(201).json(newVcc);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const update = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, expirationDate, macAddress, contractCert } = req.body;

    const updateData: any = {};
    if (status) updateData.status = status;
    if (expirationDate) updateData.expirationDate = new Date(expirationDate);
    if (macAddress !== undefined) updateData.macAddress = macAddress;
    if (contractCert !== undefined) updateData.contractCert = contractCert;

    const updated = await prisma.vehicleContractCertificate.update({
      where: { id: Number(id) },
      data: updateData,
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const remove = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.vehicleContractCertificate.delete({
      where: { id: Number(id) },
    });
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
