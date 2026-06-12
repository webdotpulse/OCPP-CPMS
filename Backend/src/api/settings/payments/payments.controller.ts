import { Request, Response } from "express";
import { prisma } from "../../../config/database.js";
import { logger } from "../../../utils/logger.js";

export const getMollieConfig = async (req: Request, res: Response) => {
  try {
    const config = await prisma.mollieConfig.findFirst({
        where: { companyId: null }
    });

    if (config) {
      // Don't send the full API key back to the client for security
      return res.json({
        success: true,
        data: {
          id: config.id,
          profileId: config.profileId,
          testMode: config.testMode,
          hasApiKey: !!config.apiKey
        }
      });
    }

    res.json({ success: true, data: null });
  } catch (error: any) {
    logger.error("Failed to fetch Mollie config", error);
    res.status(500).json({ success: false, message: "Failed to fetch config" });
  }
};

export const updateMollieConfig = async (req: Request, res: Response) => {
  try {
    const { apiKey, profileId, testMode } = req.body;

    const existingConfig = await prisma.mollieConfig.findFirst({
        where: { companyId: null }
    });

    let config;
    if (existingConfig) {
       config = await prisma.mollieConfig.update({
           where: { id: existingConfig.id },
           data: {
               ...(apiKey ? { apiKey } : {}),
               profileId,
               testMode
           }
       });
    } else {
        if (!apiKey) {
             return res.status(400).json({ success: false, message: "API Key is required for initial setup." });
        }
        config = await prisma.mollieConfig.create({
            data: {
                apiKey,
                profileId,
                testMode
            }
        });
    }

    res.json({ success: true, data: { id: config.id, testMode: config.testMode, profileId: config.profileId } });
  } catch (error: any) {
    logger.error("Failed to update Mollie config", error);
    res.status(500).json({ success: false, message: "Failed to update config" });
  }
};
