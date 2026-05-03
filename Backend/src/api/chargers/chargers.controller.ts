import { Request, Response } from "express";
import { prisma } from "../../config/database.js";
import { logger } from "../../utils/logger.js";
import {
  isChargerConnected,
} from "../../ocpp/remoteControl.js";
import { parseId, parsePagination } from "../../utils/validation.js";
import type { CreateChargerDto, UpdateChargerDto } from "../../types/index.js";

/**
 * GET /api/chargers - Get all chargers
 */
/**
 * GET /api/chargers/:id/logs - Get charger logs
 */
export const getChargerLogs = async (req: Request, res: Response) => {
  try {
    const chargerId = parseId(req.params.id);

    if (!chargerId) {
      return res.status(400).json({
        success: false,
        error: "Invalid charger ID",
      });
    }

    const { limit = 50 } = req.query;

    const logs = await prisma.ocppLog.findMany({
      where: { chargerId },
      orderBy: { timestamp: "desc" },
      take: Number(limit),
    });

    res.json({ success: true, data: logs });
  } catch (error) {
    logger.error(`Error getting charger logs: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to get charger logs",
    });
  }
};

/**
 * GET /api/chargers/:id/configurations - Get saved charger configurations
 */
export const getChargerConfigurations = async (req: Request, res: Response) => {
  try {
    const chargerId = parseId(req.params.id);

    if (!chargerId) {
      return res.status(400).json({
        success: false,
        error: "Invalid charger ID",
      });
    }

    const configs = await prisma.chargerConfiguration.findMany({
      where: { chargerId },
      orderBy: { key: "asc" },
    });

    res.json({ success: true, data: configs });
  } catch (error) {
    logger.error(`Error getting charger configurations: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to get charger configurations",
    });
  }
};

export const getAllChargers = async (req: Request, res: Response) => {
  try {
    const { page: queryPage, limit: queryLimit, search } = req.query;
    const { page, limit } = parsePagination(queryPage, queryLimit);

    // @ts-expect-error userRole is attached by authenticateToken middleware
    const userRole = req.userRole;
    // @ts-expect-error userId is attached by authenticateToken middleware
    const userId = req.userId;

    const skip = (page - 1) * limit;
    const take = limit;

    const where: any = userRole === "admin" ? {} : { owner_id: userId };

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: "insensitive" } },
        { serial_number: { contains: search as string, mode: "insensitive" } }
      ];
    }

    const [chargers, total] = await Promise.all([
      prisma.charger.findMany({
        skip,
        take,
        where,
        include: {
          chargingStation: true,
          chargeGroup: true,
          connectors: true,
          owner: { select: { id: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.charger.count({ where }),
    ]);

    res.json({
      success: true,
      data: chargers,
      pagination: {
        page: Number(page),
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    logger.error(`Error getting chargers: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to get chargers",
    });
  }
};

/**
 * GET /api/chargers/:id - Get specific charger
 */
export const getChargerById = async (req: Request, res: Response) => {
  try {
    const chargerId = parseId(req.params.id);

    if (!chargerId) {
      return res.status(400).json({
        success: false,
        error: "Invalid charger ID",
      });
    }

    const charger = await prisma.charger.findUnique({
      where: { charger_id: chargerId },
      include: {
        chargingStation: true,
        connectors: true,
        transactions: { take: 10, orderBy: { createdAt: "desc" } },
        owner: { select: { id: true, email: true } },
        tariffs: true,
      },
    });

    if (!charger) {
      return res.status(404).json({
        success: false,
        error: "Charger not found",
      });
    }

    res.json({ success: true, data: charger });
  } catch (error) {
    logger.error(`Error getting charger: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to get charger",
    });
  }
};

/**
 * GET /api/chargers/:id/status - Get charger status with connection info
 */
export const getChargerStatus = async (req: Request, res: Response) => {
  try {
    const chargerId = parseId(req.params.id);

    if (!chargerId) {
      return res.status(400).json({
        success: false,
        error: "Invalid charger ID",
      });
    }

    const charger = await prisma.charger.findUnique({
      where: { charger_id: chargerId },
      select: {
        charger_id: true,
        name: true,
        status: true,
        last_heartbeat: true,
      },
    });

    if (!charger) {
      return res.status(404).json({
        success: false,
        error: "Charger not found",
      });
    }

    res.json({
      success: true,
      data: {
        ...charger,
        isOnline: await isChargerConnected(chargerId),
        connectorsCount: await prisma.connector.count({
          where: { charger_id: chargerId },
        }),
      },
    });
  } catch (error) {
    logger.error(`Error getting charger status: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to get charger status",
    });
  }
};

/**
 * POST /api/chargers - Create new charger
 */
export const createCharger = async (req: Request, res: Response) => {
  try {
    const data = req.body as CreateChargerDto;

    // Validate required fields
    if (!data.charging_station_id) {
      return res.status(400).json({
        success: false,
        error: "charging_station_id is required",
      });
    }

    // Check if charger name already exists
    const existing = await prisma.charger.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: "Charger name already exists",
      });
    }

    // Verify station exists
    const station = await prisma.chargingStation.findUnique({
      where: { id: data.charging_station_id },
    });

    if (!station) {
      return res.status(400).json({
        success: false,
        error: "Charging station not found",
      });
    }

    const { tariffId, ...rest } = data;
    const charger = await prisma.charger.create({
      data: {
        ...rest,
        model: rest.model || "Pending",
        manufacturer: rest.manufacturer || "Pending",
        serial_number: rest.serial_number || "Pending",
        firmware_version: rest.firmware_version || "Pending",
        tariffs: tariffId ? { connect: { tariff_id: tariffId } } : undefined,
      },
      include: { chargingStation: true, owner: true, tariffs: true },
    });

    logger.info(`Charger created: ${charger.name}`);
    res.status(201).json({ success: true, data: charger });
  } catch (error) {
    logger.error(`Error creating charger: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to create charger",
    });
  }
};

/**
 * PUT /api/chargers/:id - Update charger
 */
export const updateCharger = async (req: Request, res: Response) => {
  try {
    const chargerId = parseId(req.params.id);

    if (!chargerId) {
      return res.status(400).json({
        success: false,
        error: "Invalid charger ID",
      });
    }

    const data = req.body as UpdateChargerDto;

    const { tariffId, ...rest } = data;
    const charger = await prisma.charger.update({
      where: { charger_id: chargerId },
      data: {
        ...rest,
        tariffs: tariffId !== undefined ? { set: tariffId ? [{ tariff_id: tariffId }] : [] } : undefined,
      },
      include: { chargingStation: true, owner: true, tariffs: true },
    });

    logger.info(`Charger updated: ${charger.name}`);
    res.json({ success: true, data: charger });
  } catch (error) {
    logger.error(`Error updating charger: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to update charger",
    });
  }
};

/**
 * DELETE /api/chargers/:id - Delete charger
 */
export const deleteCharger = async (req: Request, res: Response) => {
  try {
    const chargerId = parseId(req.params.id);

    if (!chargerId) {
      return res.status(400).json({
        success: false,
        error: "Invalid charger ID",
      });
    }

    await prisma.charger.delete({
      where: { charger_id: chargerId },
    });

    logger.info(`Charger deleted: ID ${chargerId}`);
    res.json({ success: true, message: "Charger deleted" });
  } catch (error) {
    logger.error(`Error deleting charger: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to delete charger",
    });
  }
};

/**
 * POST /api/chargers/connectors - Bulk create connectors
 */
export const createBulkConnectors = async (req: Request, res: Response) => {
  try {
    const connectors = req.body;

    const created = await prisma.connector.createMany({
      data: connectors,
    });

    logger.info(`Created ${created.count} connectors`);
    res.status(201).json({ success: true, count: created.count });
  } catch (error) {
    logger.error(`Error creating connectors: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to create connectors",
    });
  }
};
