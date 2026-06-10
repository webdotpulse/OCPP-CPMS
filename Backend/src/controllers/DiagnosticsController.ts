import { Request, Response } from "express";
import { prisma } from "../config/database.js";

export const getDiagnostics = async (req: Request, res: Response) => {
  try {
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
    res.json(events);
  } catch (error) {
    console.error("Error fetching diagnostics", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
