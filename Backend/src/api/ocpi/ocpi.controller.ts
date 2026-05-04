import { Request, Response } from "express";
import { prisma } from "../../config/database.js";

/**
 * Retrieve all OCPI endpoints
 */
export const getEndpoints = async (req: Request, res: Response) => {
  try {
    const endpoints = await prisma.ocpiEndpoint.findMany();
    res.json({ success: true, data: endpoints });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch OCPI endpoints." });
  }
};

/**
 * Create a new OCPI endpoint
 */
export const createEndpoint = async (req: Request, res: Response) => {
  try {
    const endpoint = await prisma.ocpiEndpoint.create({
      data: req.body,
    });
    res.json({ success: true, data: endpoint });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create OCPI endpoint." });
  }
};

/**
 * Update an OCPI endpoint
 */
export const updateEndpoint = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const endpoint = await prisma.ocpiEndpoint.update({
      where: { id },
      data: req.body,
    });
    res.json({ success: true, data: endpoint });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update OCPI endpoint." });
  }
};

/**
 * Delete an OCPI endpoint
 */
export const deleteEndpoint = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    await prisma.ocpiEndpoint.delete({
      where: { id },
    });
    res.json({ success: true, message: "OCPI endpoint deleted." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete OCPI endpoint." });
  }
};

/**
 * Test an OCPI endpoint connection
 */
export const testEndpoint = async (req: Request, res: Response) => {
  // Dummy implementation for testing connection
  res.json({ success: true, message: "Connection successful." });
};

// Keep existing placeholder endpoints to not break anything relying on them
export const getLocations = async (req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    message: "OCPI integration is not implemented yet. Ready for future OCPI endpoints.",
  });
};

export const getTariffs = async (req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    message: "OCPI tariffs integration is not implemented yet.",
  });
};
