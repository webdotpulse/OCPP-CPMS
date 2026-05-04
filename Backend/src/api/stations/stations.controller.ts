import { Request, Response } from "express";
import { prisma } from "../../config/database.js";
import { logger } from "../../utils/logger.js";
import { parseId, parsePagination } from "../../utils/validation.js";
import type { CreateStationDto } from "../../types/index.js";

/**
 * GET /api/stations - Get all stations
 */
export const getAllStations = async (req: Request, res: Response) => {
  try {
    const { page: queryPage, limit: queryLimit, status, search } = req.query;
    const { page, limit } = parsePagination(queryPage, queryLimit);

    // @ts-expect-error userRole is attached by authenticateToken middleware
    const userRole = req.userRole;
    // @ts-expect-error userId is attached by authenticateToken middleware
    const userId = req.userId;

    const skip = (page - 1) * limit;
    const take = limit;

    const where: any = {};
    if (status) {
      where.status = status;
    }

    if (userRole !== "admin") {
      where.owner_id = userId;
    }

    if (search) {
      where.OR = [
        { station_name: { contains: search as string, mode: "insensitive" } },
        { city: { contains: search as string, mode: "insensitive" } }
      ];
    }

    const [stations, total] = await Promise.all([
      prisma.chargingStation.findMany({
        skip,
        take,
        where,
        include: {
          owner: { select: { id: true, email: true } },
          chargers: {
            include: { connectors: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.chargingStation.count({ where }),
    ]);

    res.json({
      success: true,
      data: stations,
      pagination: {
        page: Number(page),
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    logger.error(`Error getting stations: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to get stations",
    });
  }
};

/**
 * GET /api/stations/:id - Get specific station
 */
export const getStationById = async (req: Request, res: Response) => {
  try {
    const stationId = parseId(req.params.id);

    if (!stationId) {
      return res.status(400).json({
        success: false,
        error: "Invalid station ID",
      });
    }

    const station = await prisma.chargingStation.findUnique({
      where: { id: stationId },
      include: {
        owner: { select: { id: true, email: true } },
        chargers: {
          include: { connectors: true },
        },
      },
    });

    if (!station) {
      return res.status(404).json({
        success: false,
        error: "Station not found",
      });
    }

    res.json({ success: true, data: station });
  } catch (error) {
    logger.error(`Error getting station: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to get station",
    });
  }
};

/**
 * GET /api/stations/:id/chargers - Get all chargers for a station
 */
export const getStationChargers = async (req: Request, res: Response) => {
  try {
    const stationId = parseId(req.params.id);

    if (!stationId) {
      return res.status(400).json({
        success: false,
        error: "Invalid station ID",
      });
    }

    const chargers = await prisma.charger.findMany({
      where: { charging_station_id: stationId },
      include: { connectors: true },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: chargers });
  } catch (error) {
    logger.error(`Error getting station chargers: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to get station chargers",
    });
  }
};

/**
 * POST /api/stations - Create new station
 */
export const createStation = async (req: Request, res: Response) => {
  try {
    const data = req.body as CreateStationDto;

    // Validate required fields
    if (!data.owner_id) {
      return res.status(400).json({
        success: false,
        error: "owner_id is required",
      });
    }

    // Verify owner exists
    const owner = await prisma.user.findUnique({
      where: { id: data.owner_id },
    });

    if (!owner) {
      return res.status(400).json({
        success: false,
        error: "Owner not found",
      });
    }

    const station = await prisma.chargingStation.create({
      data,
      include: { owner: true, chargers: true },
    });

    logger.info(`Station created: ${station.station_name}`);
    res.status(201).json({ success: true, data: station });
  } catch (error) {
    logger.error(`Error creating station: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to create station",
    });
  }
};

/**
 * PUT /api/stations/:id - Update station
 */
export const updateStation = async (req: Request, res: Response) => {
  try {
    const stationId = parseId(req.params.id);

    if (!stationId) {
      return res.status(400).json({
        success: false,
        error: "Invalid station ID",
      });
    }

    const station = await prisma.chargingStation.update({
      where: { id: stationId },
      data: req.body,
      include: { owner: true, chargers: true },
    });

    logger.info(`Station updated: ${station.station_name}`);
    res.json({ success: true, data: station });
  } catch (error) {
    logger.error(`Error updating station: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to update station",
    });
  }
};

/**
 * DELETE /api/stations/:id - Delete station
 */
export const deleteStation = async (req: Request, res: Response) => {
  try {
    const stationId = parseId(req.params.id);

    if (!stationId) {
      return res.status(400).json({
        success: false,
        error: "Invalid station ID",
      });
    }

    await prisma.chargingStation.delete({
      where: { id: stationId },
    });

    logger.info(`Station deleted: ID ${stationId}`);
    res.json({ success: true, message: "Station deleted" });
  } catch (error) {
    logger.error(`Error deleting station: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to delete station",
    });
  }
};
