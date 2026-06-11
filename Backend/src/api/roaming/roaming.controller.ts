import { Request, Response } from "express";
import { prisma } from "../../config/database.js";
import { logger } from "../../utils/logger.js";
import { Parser } from "json2csv";

export const getMargins = async (req: Request, res: Response) => {
  try {
    const sessions = await prisma.roamingSession.findMany({
      include: {
        partner: true,
        station: true,
      },
      orderBy: {
        startTime: 'desc',
      },
      take: 100, // Limit for UI performance
    });

    res.json({ success: true, data: sessions });
  } catch (error: any) {
    logger.error("Error fetching roaming margins", error);
    res.status(500).json({ success: false, message: "Failed to fetch roaming margins." });
  }
};

export const getReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const format = req.query.format || "json";

    // Aggregate data by partner
    const sessions = await prisma.roamingSession.findMany({
      include: {
        partner: true,
      },
    });

    const reportData = sessions.reduce((acc: any, session) => {
      const partnerName = session.partner.name;
      if (!acc[partnerName]) {
        acc[partnerName] = {
          partner: partnerName,
          totalEnergy: 0,
          totalWholesaleBilled: 0,
          totalBaseCost: 0,
          netMargin: 0,
          sessionCount: 0,
        };
      }

      acc[partnerName].totalEnergy += session.energyConsumed;
      acc[partnerName].totalWholesaleBilled += session.wholesaleCost;
      acc[partnerName].totalBaseCost += session.baseCost;
      acc[partnerName].netMargin += session.netMargin;
      acc[partnerName].sessionCount += 1;

      return acc;
    }, {});

    const reportArray = Object.values(reportData);

    if (format === "csv") {
      const parser = new Parser();
      const csv = parser.parse(reportArray);
      res.header("Content-Type", "text/csv");
      res.attachment("monthly_clearinghouse_report.csv");
      res.send(csv);
    } else {
      res.json({ success: true, data: reportArray });
    }
  } catch (error: any) {
    logger.error("Error generating clearinghouse report", error);
    res.status(500).json({ success: false, message: "Failed to generate report." });
  }
};

export const getStats = async (req: Request, res: Response) => {
  try {
    // Revenue breakdown by MSP
    const sessions = await prisma.roamingSession.findMany({
      include: {
        partner: true,
        station: true,
      },
    });

    const revenueByPartner = sessions.reduce((acc: any, session) => {
      const name = session.partner.name;
      acc[name] = (acc[name] || 0) + session.wholesaleCost;
      return acc;
    }, {});

    const partnerRevenueStats = Object.keys(revenueByPartner).map(name => ({
      name,
      value: revenueByPartner[name]
    }));

    // Geographic heatmap data (stations attracting roaming users)
    const stationStats = sessions.reduce((acc: any, session) => {
      const stationId = session.station.id;
      if (!acc[stationId]) {
        acc[stationId] = {
          stationId,
          name: session.station.station_name,
          latitude: session.station.latitude,
          longitude: session.station.longitude,
          sessionCount: 0,
          revenue: 0,
        };
      }
      acc[stationId].sessionCount += 1;
      acc[stationId].revenue += session.wholesaleCost;
      return acc;
    }, {});

    const heatmapData = Object.values(stationStats);

    res.json({
      success: true,
      data: {
        revenueByPartner: partnerRevenueStats,
        heatmapData
      }
    });
  } catch (error: any) {
    logger.error("Error fetching roaming stats", error);
    res.status(500).json({ success: false, message: "Failed to fetch roaming stats." });
  }
};
