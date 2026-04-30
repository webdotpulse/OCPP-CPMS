import { prisma } from "../../config/database.js";
import { logger } from "../../utils/logger.js";
import { parseId, parsePagination } from "../../utils/validation.js";
/**
 * GET /api/connectors - Get all connectors
 */
export const getAllConnectors = async (req, res) => {
    try {
        const { page: queryPage, limit: queryLimit, charger_id } = req.query;
        const { page, limit } = parsePagination(queryPage, queryLimit);
        const skip = (page - 1) * limit;
        const take = limit;
        const where = {};
        if (charger_id) {
            const parsedChargerId = parseId(charger_id);
            if (parsedChargerId) {
                where.charger_id = parsedChargerId;
            }
        }
        const [connectors, total] = await Promise.all([
            prisma.connector.findMany({
                skip,
                take,
                where,
                include: { charger: true },
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
    }
    catch (error) {
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
export const getConnectorById = async (req, res) => {
    try {
        const connectorId = parseId(req.params.id);
        if (!connectorId) {
            return res.status(400).json({
                success: false,
                error: "Invalid connector ID",
            });
        }
        const connector = await prisma.connector.findUnique({
            where: { connector_id: connectorId },
            include: { charger: true },
        });
        if (!connector) {
            return res.status(404).json({
                success: false,
                error: "Connector not found",
            });
        }
        res.json({ success: true, data: connector });
    }
    catch (error) {
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
export const createConnector = async (req, res) => {
    try {
        const data = req.body;
        // Verify charger exists
        const charger = await prisma.charger.findUnique({
            where: { charger_id: data.charger_id },
        });
        if (!charger) {
            return res.status(400).json({
                success: false,
                error: "Charger not found",
            });
        }
        const connector = await prisma.connector.create({
            data,
            include: { charger: true },
        });
        logger.info(`Connector created: ${connector.connector_name}`);
        res.status(201).json({ success: true, data: connector });
    }
    catch (error) {
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
export const updateConnector = async (req, res) => {
    try {
        const connectorId = parseId(req.params.id);
        if (!connectorId) {
            return res.status(400).json({
                success: false,
                error: "Invalid connector ID",
            });
        }
        const connector = await prisma.connector.update({
            where: { connector_id: connectorId },
            data: req.body,
            include: { charger: true },
        });
        logger.info(`Connector updated: ${connector.connector_name}`);
        res.json({ success: true, data: connector });
    }
    catch (error) {
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
export const deleteConnector = async (req, res) => {
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
    }
    catch (error) {
        logger.error(`Error deleting connector: ${error}`);
        res.status(500).json({
            success: false,
            error: "Failed to delete connector",
        });
    }
};
