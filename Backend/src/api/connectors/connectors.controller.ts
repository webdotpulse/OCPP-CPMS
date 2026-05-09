import { Request, Response } from "express";
import { prisma } from "../../config/database.js";
import { logger } from "../../utils/logger.js";
import { parseId, parsePagination } from "../../utils/validation.js";
import type { CreateConnectorDto } from "../../types/index.js";

/**
 * GET /api/connectors - Get all connectors
 */
export const getAllConnectors = async (req: Request, res: Response) => {
  try {
    const { page: queryPage, limit: queryLimit, charger_id } = req.query;
    const { page, limit } = parsePagination(queryPage, queryLimit);

    const skip = (page - 1) * limit;
    const take = limit;

    const where: any = {};
    if (charger_id) {
      const parsedChargerId = parseId(charger_id);
      if (parsedChargerId) {
        where.evse = { charger_id: parsedChargerId };
      }
    }

    // @ts-expect-error userRole is attached by authenticateToken middleware
    const userRole = req.userRole;
    // @ts-expect-error userId is attached by authenticateToken middleware
    const userId = req.userId;

    if (userRole !== "admin") {
      if (where.evse) {
        where.evse.charger = { owner_id: userId };
      } else {
        where.evse = { charger: { owner_id: userId } };
      }
    }

    const [connectors, total] = await Promise.all([
      prisma.connector.findMany({
        skip,
        take,
        where,
        include: { evse: { include: { charger: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.connector.count({ where }),
    ]);

    res.json({
      success: true,
      data: connectors,
      pagination: {
        page: Number(page),
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    logger.error(`Error getting connectors: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to get connectors",
    });
  }
};

/**
 * GET /api/connectors/:id - Get specific connector
 */
export const getConnectorById = async (req: Request, res: Response) => {
  try {
    const connectorId = parseId(req.params.id);

    if (!connectorId) {
      return res.status(400).json({
        success: false,
        error: "Invalid connector ID",
      });
    }

    // @ts-expect-error userRole is attached by authenticateToken middleware
    const userRole = req.userRole;
    // @ts-expect-error userId is attached by authenticateToken middleware
    const userId = req.userId;

    const where: any = { connector_id: connectorId };
    if (userRole !== "admin") {
      where.charger = { owner_id: userId };
    }

    const connector = await prisma.connector.findFirst({
      where,
      include: { evse: { include: { charger: true } } },
    });

    if (!connector) {
      return res.status(404).json({
        success: false,
        error: "Connector not found",
      });
    }

    res.json({ success: true, data: connector });
  } catch (error) {
    logger.error(`Error getting connector: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to get connector",
    });
  }
};

/**
 * POST /api/connectors - Create new connector
 */
export const createConnector = async (req: Request, res: Response) => {
  try {
    const { charger_id, ...data } = req.body as any;

    let evseIdToUse = data.evse_id;

    if (charger_id) {
      const parsedChargerId = parseInt(charger_id, 10);
      const charger = await prisma.charger.findUnique({
        where: { charger_id: parsedChargerId }
      });
      if (!charger) {
        return res.status(400).json({
          success: false,
          error: "Charger not found",
        });
      }

      let evse = await prisma.evse.findFirst({
        where: { charger_id: parsedChargerId }
      });

      if (!evse) {
        evse = await prisma.evse.create({
          data: {
            charger_id: parsedChargerId,
            evse_id: 1
          }
        });
      }
      evseIdToUse = evse.id;
    }

    if (!evseIdToUse) {
      return res.status(400).json({
        success: false,
        error: "Either evse_id or charger_id must be provided",
      });
    }

    if (!charger_id) {
      // Verify evse exists only if charger_id was not provided
      const evse = await prisma.evse.findUnique({
        where: { id: evseIdToUse },
      });

      if (!evse) {
        return res.status(400).json({
          success: false,
          error: "EVSE not found",
        });
      }
    }

    const connector = await prisma.connector.create({
      data: {
        ...data,
        evse_id: evseIdToUse
      },
      include: { evse: { include: { charger: true } } },
    });

    logger.info(`Connector created: ${connector.connector_name}`);
    res.status(201).json({ success: true, data: connector });
  } catch (error) {
    logger.error(`Error creating connector: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to create connector",
    });
  }
};

/**
 * PUT /api/connectors/:id - Update connector
 */
export const updateConnector = async (req: Request, res: Response) => {
  try {
    const connectorId = parseId(req.params.id);

    if (!connectorId) {
      return res.status(400).json({
        success: false,
        error: "Invalid connector ID",
      });
    }

    const { charger_id, ...updateData } = req.body as any;

    const connector = await prisma.connector.update({
      where: { connector_id: connectorId },
      data: updateData,
      include: { evse: { include: { charger: true } } },
    });

    logger.info(`Connector updated: ${connector.connector_name}`);
    res.json({ success: true, data: connector });
  } catch (error) {
    logger.error(`Error updating connector: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to update connector",
    });
  }
};

/**
 * DELETE /api/connectors/:id - Delete connector
 */
export const deleteConnector = async (req: Request, res: Response) => {
  try {
    const connectorId = parseId(req.params.id);

    if (!connectorId) {
      return res.status(400).json({
        success: false,
        error: "Invalid connector ID",
      });
    }

    await prisma.connector.delete({
      where: { connector_id: connectorId },
    });

    logger.info(`Connector deleted: ID ${connectorId}`);
    res.json({ success: true, message: "Connector deleted" });
  } catch (error) {
    logger.error(`Error deleting connector: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to delete connector",
    });
  }
};
