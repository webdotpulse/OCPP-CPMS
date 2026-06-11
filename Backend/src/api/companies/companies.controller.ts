import { Request, Response } from "express";
import { prisma } from "../../config/database.js";
import { logger } from "../../utils/logger.js";
import { AuthRequest } from "../../middleware/auth.js";

/**
 * GET /api/companies - Get all companies
 */
export const getAllCompanies = async (req: AuthRequest, res: Response) => {
  try {
    const companies = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: "asc" },
    });

    res.json({
      success: true,
      data: companies,
    });
  } catch (error) {
    logger.error(`Error getting companies: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to get companies",
    });
  }
};
