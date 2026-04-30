import { prisma } from "../../config/database.js";
import { logger } from "../../utils/logger.js";
import { parseId, parsePagination } from "../../utils/validation.js";
/**
 * GET /api/rfid - Get all RFID users
 */
export const getAllRfidUsers = async (req, res) => {
    try {
        const { page: queryPage, limit: queryLimit, active, search } = req.query;
        const { page, limit } = parsePagination(queryPage, queryLimit);
        const skip = (page - 1) * limit;
        const take = limit;
        const where = {};
        if (active !== undefined) {
            where.active = active === "true";
        }
        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { rfid_tag: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
            ];
        }
        const [rfidUsers, total] = await Promise.all([
            prisma.rfidUser.findMany({
                skip,
                take,
                where,
                include: { owner: { select: { id: true, email: true } } },
                orderBy: { createdAt: "desc" },
            }),
            prisma.rfidUser.count({ where }),
        ]);
        res.json({
            success: true,
            data: rfidUsers,
            pagination: {
                page: Number(page),
                limit: take,
                total,
                totalPages: Math.ceil(total / take),
            },
        });
    }
    catch (error) {
        logger.error(`Error getting RFID users: ${error}`);
        res.status(500).json({
            success: false,
            error: "Failed to get RFID users",
        });
    }
};
/**
 * GET /api/rfid/:id - Get specific RFID user
 */
export const getRfidUserById = async (req, res) => {
    try {
        const rfidUserId = parseId(req.params.id);
        if (!rfidUserId) {
            return res.status(400).json({
                success: false,
                error: "Invalid RFID user ID",
            });
        }
        const rfidUser = await prisma.rfidUser.findUnique({
            where: { rfid_user_id: rfidUserId },
            include: {
                owner: { select: { id: true, email: true } },
                rfidSessions: { take: 10, orderBy: { createdAt: "desc" } },
            },
        });
        if (!rfidUser) {
            return res.status(404).json({
                success: false,
                error: "RFID user not found",
            });
        }
        res.json({ success: true, data: rfidUser });
    }
    catch (error) {
        logger.error(`Error getting RFID user: ${error}`);
        res.status(500).json({
            success: false,
            error: "Failed to get RFID user",
        });
    }
};
/**
 * POST /api/rfid - Create new RFID user
 */
export const createRfidUser = async (req, res) => {
    try {
        const data = req.body;
        // Validate required fields
        if (!data.owner_id) {
            return res.status(400).json({
                success: false,
                error: "owner_id is required",
            });
        }
        // Check if RFID tag already exists
        const existing = await prisma.rfidUser.findUnique({
            where: { rfid_tag: data.rfid_tag },
        });
        if (existing) {
            return res.status(400).json({
                success: false,
                error: "RFID tag already exists",
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
        const rfidUser = await prisma.rfidUser.create({
            data,
            include: { owner: true },
        });
        logger.info(`RFID user created: ${rfidUser.name} (${rfidUser.rfid_tag})`);
        res.status(201).json({ success: true, data: rfidUser });
    }
    catch (error) {
        logger.error(`Error creating RFID user: ${error}`);
        res.status(500).json({
            success: false,
            error: "Failed to create RFID user",
        });
    }
};
/**
 * PUT /api/rfid/:id - Update RFID user
 */
export const updateRfidUser = async (req, res) => {
    try {
        const rfidUserId = parseId(req.params.id);
        if (!rfidUserId) {
            return res.status(400).json({
                success: false,
                error: "Invalid RFID user ID",
            });
        }
        const data = req.body;
        const rfidUser = await prisma.rfidUser.update({
            where: { rfid_user_id: rfidUserId },
            data,
            include: { owner: true },
        });
        logger.info(`RFID user updated: ${rfidUser.name}`);
        res.json({ success: true, data: rfidUser });
    }
    catch (error) {
        logger.error(`Error updating RFID user: ${error}`);
        res.status(500).json({
            success: false,
            error: "Failed to update RFID user",
        });
    }
};
/**
 * PATCH /api/rfid/:id/toggle - Toggle RFID user active status
 */
export const toggleRfidUserStatus = async (req, res) => {
    try {
        const rfidUserId = parseId(req.params.id);
        if (!rfidUserId) {
            return res.status(400).json({
                success: false,
                error: "Invalid RFID user ID",
            });
        }
        const { active } = req.query;
        if (active === undefined) {
            return res.status(400).json({
                success: false,
                error: "Missing query parameter: active",
            });
        }
        const rfidUser = await prisma.rfidUser.update({
            where: { rfid_user_id: rfidUserId },
            data: { active: active === "true" },
            include: { owner: true },
        });
        logger.info(`RFID user ${rfidUser.name} ${active === "true" ? "activated" : "deactivated"}`);
        res.json({ success: true, data: rfidUser });
    }
    catch (error) {
        logger.error(`Error toggling RFID user: ${error}`);
        res.status(500).json({
            success: false,
            error: "Failed to toggle RFID user",
        });
    }
};
/**
 * DELETE /api/rfid/:id - Delete RFID user
 */
export const deleteRfidUser = async (req, res) => {
    try {
        const rfidUserId = parseId(req.params.id);
        if (!rfidUserId) {
            return res.status(400).json({
                success: false,
                error: "Invalid RFID user ID",
            });
        }
        await prisma.rfidUser.delete({
            where: { rfid_user_id: rfidUserId },
        });
        logger.info(`RFID user deleted: ID ${rfidUserId}`);
        res.json({ success: true, message: "RFID user deleted" });
    }
    catch (error) {
        logger.error(`Error deleting RFID user: ${error}`);
        res.status(500).json({
            success: false,
            error: "Failed to delete RFID user",
        });
    }
};
