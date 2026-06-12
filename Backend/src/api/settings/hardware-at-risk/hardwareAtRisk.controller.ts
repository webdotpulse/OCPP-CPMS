import { Request, Response } from "express";
import { prisma } from "../../../config/database.js";
import { logger } from "../../../utils/logger.js";

/**
 * GET /api/settings/hardware-at-risk
 */
export const getHardwareAtRiskSettings = async (req: Request, res: Response) => {
  try {
    let settings = await prisma.hardwareAtRiskSetting.findFirst();
    if (!settings) {
      settings = await prisma.hardwareAtRiskSetting.create({
        data: {
          isEnabled: false,
          offlineThresholdMinutes: 60,
          criticalErrorCodeLimit: 5,
          autoHealAttemptLimit: 3,
          notifyAdminEmail: false,
          adminEmailAddress: null,
        },
      });
    }
    res.json(settings);
  } catch (error) {
    logger.error(`Error fetching HardwareAtRiskSettings: ${error}`);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
};

/**
 * PUT /api/settings/hardware-at-risk
 */
export const updateHardwareAtRiskSettings = async (req: Request, res: Response) => {
  try {
    const { isEnabled, offlineThresholdMinutes, criticalErrorCodeLimit, autoHealAttemptLimit, notifyAdminEmail, adminEmailAddress } = req.body;

    let settings = await prisma.hardwareAtRiskSetting.findFirst();
    if (!settings) {
      settings = await prisma.hardwareAtRiskSetting.create({
        data: {
          isEnabled,
          offlineThresholdMinutes,
          criticalErrorCodeLimit,
          autoHealAttemptLimit,
          notifyAdminEmail,
          adminEmailAddress,
        },
      });
    } else {
      settings = await prisma.hardwareAtRiskSetting.update({
        where: { id: settings.id },
        data: {
          isEnabled,
          offlineThresholdMinutes,
          criticalErrorCodeLimit,
          autoHealAttemptLimit,
          notifyAdminEmail,
          adminEmailAddress,
        },
      });
    }

    res.json(settings);
  } catch (error) {
    logger.error(`Error updating HardwareAtRiskSettings: ${error}`);
    res.status(500).json({ error: "Failed to update settings" });
  }
};
