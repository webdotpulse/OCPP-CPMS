import { Request, Response } from "express";
import { prisma } from "../../config/database.js";
import { logger } from "../../utils/logger.js";

// Mail Config

export const getMailConfig = async (req: Request, res: Response) => {
  try {
    const config = await prisma.mailConfig.findFirst({
      orderBy: { id: "desc" },
    });
    res.json({ success: true, data: config });
  } catch (error) {
    logger.error(`Error getting mail config: ${error}`);
    res.status(500).json({ success: false, error: "Failed to fetch mail configuration" });
  }
};

export const updateMailConfig = async (req: Request, res: Response) => {
  try {
    const { host, port, username, password, fromAddress, isActive } = req.body;

    const existingConfig = await prisma.mailConfig.findFirst({
      orderBy: { id: "desc" },
    });

    let config;
    if (existingConfig) {
      config = await prisma.mailConfig.update({
        where: { id: existingConfig.id },
        data: { host, port, username, password, fromAddress, isActive },
      });
    } else {
      config = await prisma.mailConfig.create({
        data: { host, port, username, password, fromAddress, isActive },
      });
    }

    res.json({ success: true, data: config });
  } catch (error) {
    logger.error(`Error updating mail config: ${error}`);
    res.status(500).json({ success: false, error: "Failed to update mail configuration" });
  }
};

// Mail Templates

export const getMailTemplates = async (req: Request, res: Response) => {
  try {
    const templates = await prisma.mailTemplate.findMany({
      orderBy: { id: "asc" },
    });
    res.json({ success: true, data: templates });
  } catch (error) {
    logger.error(`Error getting mail templates: ${error}`);
    res.status(500).json({ success: false, error: "Failed to fetch mail templates" });
  }
};

export const getMailTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const template = await prisma.mailTemplate.findUnique({
      where: { id: parseInt(id as string, 10) },
    });

    if (!template) {
      return res.status(404).json({ success: false, error: "Mail template not found" });
    }

    res.json({ success: true, data: template });
  } catch (error) {
    logger.error(`Error getting mail template: ${error}`);
    res.status(500).json({ success: false, error: "Failed to fetch mail template" });
  }
};

export const createMailTemplate = async (req: Request, res: Response) => {
  try {
    const { name, type, subject, bodyHtml, bodyText } = req.body;

    const template = await prisma.mailTemplate.create({
      data: { name, type, subject, bodyHtml, bodyText },
    });

    res.status(201).json({ success: true, data: template });
  } catch (error) {
    logger.error(`Error creating mail template: ${error}`);
    res.status(500).json({ success: false, error: "Failed to create mail template" });
  }
};

export const updateMailTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, type, subject, bodyHtml, bodyText } = req.body;

    const template = await prisma.mailTemplate.update({
      where: { id: parseInt(id as string, 10) },
      data: { name, type, subject, bodyHtml, bodyText },
    });

    res.json({ success: true, data: template });
  } catch (error) {
    logger.error(`Error updating mail template: ${error}`);
    res.status(500).json({ success: false, error: "Failed to update mail template" });
  }
};

export const deleteMailTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.mailTemplate.delete({
      where: { id: parseInt(id as string, 10) },
    });

    res.json({ success: true, message: "Mail template deleted successfully" });
  } catch (error) {
    logger.error(`Error deleting mail template: ${error}`);
    res.status(500).json({ success: false, error: "Failed to delete mail template" });
  }
};
