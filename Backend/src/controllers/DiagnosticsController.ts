import { Request, Response } from "express";
import { prisma } from "../config/database.js";

export const getDiagnostics = async (req: Request, res: Response) => {
  try {
    const hardwareAtRisk = await prisma.charger.findMany({
      where: { isHardwareAtRisk: true },
      select: {
        charger_id: true,
        name: true,
        consecutiveErrors: true,
        last_heartbeat: true,
        status: true,
      }
    });

    const events = await prisma.diagnosticEvent.findMany({
      orderBy: { timestamp: "desc" },
      take: 50,
      include: {
        charger: {
          select: {
            name: true,
          }
        }
      }
    });
    res.json({ events, hardwareAtRisk });
  } catch (error) {
    console.error("Error fetching diagnostics", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
