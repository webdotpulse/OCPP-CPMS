import { Request, Response } from "express";
import { prisma } from "../../config/database.js";
import axios from "axios";
import { logger } from "../../utils/logger.js";

/**
 * Retrieve all OICP endpoints
 */
export const getEndpoints = async (req: Request, res: Response) => {
  try {
    const endpoints = await prisma.oicpEndpoint.findMany();
    res.json({ success: true, data: endpoints });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch OICP endpoints." });
  }
};

/**
 * Create a new OICP endpoint
 */
export const createEndpoint = async (req: Request, res: Response) => {
  try {
    const endpoint = await prisma.oicpEndpoint.create({
      data: req.body,
    });
    res.json({ success: true, data: endpoint });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create OICP endpoint." });
  }
};

/**
 * Update an OICP endpoint
 */
export const updateEndpoint = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const endpoint = await prisma.oicpEndpoint.update({
      where: { id },
      data: req.body,
    });
    res.json({ success: true, data: endpoint });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update OICP endpoint." });
  }
};

/**
 * Delete an OICP endpoint
 */
export const deleteEndpoint = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    await prisma.oicpEndpoint.delete({
      where: { id },
    });
    res.json({ success: true, message: "OICP endpoint deleted." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete OICP endpoint." });
  }
};

/**
 * Test an OICP endpoint connection
 */
export const testEndpoint = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const endpoint = await prisma.oicpEndpoint.findUnique({
      where: { id },
    });

    if (!endpoint) {
      res.status(404).json({ success: false, message: "OICP endpoint not found." });
      return;
    }

    const response = await axios.get(endpoint.url, {
      headers: {
        Authorization: `Bearer ${endpoint.token}`,
      },
      timeout: 5000,
    });

    res.json({ success: true, message: "Connection successful.", data: response.data });
  } catch (error: any) {
    logger.error(`OICP Test Endpoint Connection failed: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Connection failed.",
      error: error.message || "Unknown error occurred"
    });
  }
};
