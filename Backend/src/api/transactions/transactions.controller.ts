import { Request, Response } from "express";
import { prisma } from "../../config/database.js";
import { logger } from "../../utils/logger.js";
import { parseId, parsePagination } from "../../utils/validation.js";

/**
 * GET /api/transactions - Get all transactions (basic and RFID sessions)
 */
export const getAllTransactions = async (req: Request, res: Response) => {
  try {
    const { page: queryPage, limit: queryLimit, status, chargerId, search } = req.query;
    const { page, limit } = parsePagination(queryPage, queryLimit);

    const skip = (page - 1) * limit;
    const take = limit;

    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (chargerId) {
      const parsedChargerId = parseId(chargerId);
      if (parsedChargerId) {
        where.charger_id = parsedChargerId;
      }
    }
    if (search) {
      where.OR = [
        { transactionId: { contains: search as string, mode: "insensitive" } },
        { status: { contains: search as string, mode: "insensitive" } }
      ];
    }

    // @ts-expect-error userRole is attached by authenticateToken middleware
    const userRole = req.userRole;
    // @ts-expect-error userId is attached by authenticateToken middleware
    const userId = req.userId;

    if (userRole !== "admin") {
      where.charger = { owner_id: userId };
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        skip,
        take,
        where,
        include: { charger: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.transaction.count({ where }),
    ]);

    const rfidSessions = await prisma.rfidSession.findMany({
      skip,
      take,
      where,
      include: { charger: true, rfidUser: true },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      data: {
        transactions,
        rfidSessions,
      },
      pagination: {
        page: Number(page),
        limit: take,
        total: total + (await prisma.rfidSession.count({ where })),
        totalPages: Math.ceil((total + (await prisma.rfidSession.count({ where }))) / take),
      },
    });
  } catch (error) {
    logger.error(`Error getting transactions: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to get transactions",
    });
  }
};

/**
 * GET /api/transactions/user/:userId - Get all RFID sessions for a specific user
 */
export const getRfidSessionsByUser = async (req: Request, res: Response) => {
  try {
    const rfidUserId = parseId(req.params.userId);

    if (!rfidUserId) {
      return res.status(400).json({
        success: false,
        error: "Invalid RFID user ID",
      });
    }

    // @ts-expect-error userRole is attached by authenticateToken middleware
    const userRole = req.userRole;
    // @ts-expect-error userId is attached by authenticateToken middleware
    const userId = req.userId;

    const where: any = { rfidUserId };
    if (userRole !== "admin") {
      where.charger = { owner_id: userId };
    }

    const rfidSessions = await prisma.rfidSession.findMany({
      where,
      include: {
        charger: { include: { chargingStation: true } },
        rfidUser: true,
      },
      orderBy: { startTime: "desc" },
    });

    res.json({ success: true, data: rfidSessions });
  } catch (error) {
    logger.error(`Error getting RFID sessions for user: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to get RFID sessions",
    });
  }
};

/**
 * GET /api/transactions/active - Get all active charging sessions
 */
export const getActiveTransactions = async (req: Request, res: Response) => {
  try {
    // @ts-expect-error userRole is attached by authenticateToken middleware
    const userRole = req.userRole;
    // @ts-expect-error userId is attached by authenticateToken middleware
    const userId = req.userId;

    const where: any = { status: "charging" };
    if (userRole !== "admin") {
      where.charger = { owner_id: userId };
    }

    const [activeTransactions, activeRfidSessions] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: { charger: { include: { chargingStation: true } } },
        orderBy: { startTime: "desc" },
      }),
      prisma.rfidSession.findMany({
        where,
        include: { charger: { include: { chargingStation: true } }, rfidUser: true },
        orderBy: { startTime: "desc" },
      }),
    ]);

    const allActiveSessions = [
      ...activeTransactions.map((t: any) => ({ ...t, type: "basic" })),
      ...activeRfidSessions.map((s: any) => ({ ...s, type: "rfid" })),
    ];

    // Deduplicate by transactionId
    const uniqueSessionsMap = new Map();
    for (const session of allActiveSessions) {
      if (uniqueSessionsMap.has(session.transactionId)) {
        if (session.type === "rfid") {
          uniqueSessionsMap.set(session.transactionId, session);
        }
      } else {
        uniqueSessionsMap.set(session.transactionId, session);
      }
    }
    const uniqueSessions = Array.from(uniqueSessionsMap.values());

    res.json({ success: true, data: uniqueSessions, count: uniqueSessions.length });
  } catch (error) {
    logger.error(`Error getting active transactions: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to get active transactions",
    });
  }
};

/**
 * GET /api/transactions/charger/:chargerId - Get transactions for a specific charger
 */
export const getChargerTransactions = async (req: Request, res: Response) => {
  try {
    const charger_id = parseId(req.params.chargerId);

    if (!charger_id) {
      return res.status(400).json({
        success: false,
        error: "Invalid charger ID",
      });
    }

    // @ts-expect-error userRole is attached by authenticateToken middleware
    const userRole = req.userRole;
    // @ts-expect-error userId is attached by authenticateToken middleware
    const userId = req.userId;

    const where: any = { charger_id };
    if (userRole !== "admin") {
      where.charger = { owner_id: userId };
    }

    const [transactions, rfidSessions] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: { charger: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.rfidSession.findMany({
        where,
        include: { charger: true, rfidUser: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    res.json({
      success: true,
      data: {
        transactions,
        rfidSessions,
        total: transactions.length + rfidSessions.length,
      },
    });
  } catch (error) {
    logger.error(`Error getting charger transactions: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to get charger transactions",
    });
  }
};

/**
 * GET /api/transactions/stats - Get transaction statistics
 */
export const getTransactionStats = async (req: Request, res: Response) => {
  try {
    // @ts-expect-error userRole is attached by authenticateToken middleware
    const userRole = req.userRole;
    // @ts-expect-error userId is attached by authenticateToken middleware
    const userId = req.userId;

    const baseWhereTx: any = {};
    const baseWhereRfid: any = {};
    if (userRole !== "admin") {
      baseWhereTx.charger = { owner_id: userId };
      baseWhereRfid.charger = { owner_id: userId };
    }

    const [
      totalTransactions,
      completedTransactions,
      totalEnergy,
      totalRfidSessions,
      completedRfidSessions,
      totalAmountDue,
    ] = await Promise.all([
      prisma.transaction.count({ where: baseWhereTx }),
      prisma.transaction.count({ where: { ...baseWhereTx, status: "completed" } }),
      prisma.transaction.aggregate({
        where: baseWhereTx,
        _sum: { energyConsumed: true },
      }),
      prisma.rfidSession.count({ where: baseWhereRfid }),
      prisma.rfidSession.count({ where: { ...baseWhereRfid, status: "completed" } }),
      prisma.rfidSession.aggregate({
        where: baseWhereRfid,
        _sum: { amountDue: true },
      }),
    ]);

    const [todayTransactions, todayRfidSessions] = await Promise.all([
      prisma.transaction.count({
        where: {
          ...baseWhereTx,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      prisma.rfidSession.count({
        where: {
          ...baseWhereRfid,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        transactions: {
          total: totalTransactions,
          completed: completedTransactions,
          today: todayTransactions,
          totalEnergyWh: totalEnergy._sum.energyConsumed || 0,
        },
        rfidSessions: {
          total: totalRfidSessions,
          completed: completedRfidSessions,
          today: todayRfidSessions,
          totalAmountDuePaise: totalAmountDue._sum.amountDue || 0,
        },
      },
    });
  } catch (error) {
    logger.error(`Error getting transaction stats: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to get transaction statistics",
    });
  }
};

/**
 * GET /api/transactions/:id - Get specific transaction
 */
export const getTransactionById = async (req: Request, res: Response) => {
  try {
    const transactionId = parseId(req.params.id);

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        error: "Invalid transaction ID",
      });
    }

    // @ts-expect-error userRole is attached by authenticateToken middleware
    const userRole = req.userRole;
    // @ts-expect-error userId is attached by authenticateToken middleware
    const userId = req.userId;

    const where: any = { id: transactionId };
    if (userRole !== "admin") {
      where.charger = { owner_id: userId };
    }

    const transaction = await prisma.transaction.findFirst({
      where,
      include: { charger: { include: { chargingStation: true } } },
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: "Transaction not found",
      });
    }

    res.json({ success: true, data: transaction });
  } catch (error) {
    logger.error(`Error getting transaction: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to get transaction",
    });
  }
};

/**
 * GET /api/transactions/rfid/:id - Get specific RFID session
 */
export const getRfidSessionById = async (req: Request, res: Response) => {
  try {
    const sessionId = parseId(req.params.id);

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: "Invalid session ID",
      });
    }

    const rfidSession = await prisma.rfidSession.findUnique({
      where: { id: sessionId },
      include: {
        charger: { include: { chargingStation: true } },
        rfidUser: true,
      },
    });

    if (!rfidSession) {
      return res.status(404).json({
        success: false,
        error: "RFID session not found",
      });
    }

    res.json({ success: true, data: rfidSession });
  } catch (error) {
    logger.error(`Error getting RFID session: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to get RFID session",
    });
  }
};
