import { Request, Response } from "express";
import { prisma } from "../../../config/database.js";
import { logger } from "../../../utils/logger.js";

/**
 * GET /api/settings/tariffs/entsoe-key
 */
export const getEntsoeApiKey = async (req: Request, res: Response) => {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "ENTSOE_API_KEY" }
    });

    res.status(200).json({
      success: true,
      data: {
        hasKey: !!setting?.value,
        key: setting?.value || "" // send it if you want to allow them to see it or obscure it
      }
    });
  } catch (error) {
    logger.error("Error fetching ENTSOE API key:", error);
    res.status(500).json({ success: false, error: "Failed to fetch API key" });
  }
};

/**
 * POST /api/settings/tariffs/entsoe-key
 */
export const updateEntsoeApiKey = async (req: Request, res: Response) => {
  try {
    const { key } = req.body;

    if (key === undefined) {
      return res.status(400).json({ success: false, error: "Missing key in body" });
    }

    await prisma.systemSetting.upsert({
      where: { key: "ENTSOE_API_KEY" },
      update: { value: key },
      create: { key: "ENTSOE_API_KEY", value: key }
    });

    res.status(200).json({
      success: true,
      message: "API key updated successfully"
    });
  } catch (error) {
    logger.error("Error updating ENTSOE API key:", error);
    res.status(500).json({ success: false, error: "Failed to update API key" });
  }
};
