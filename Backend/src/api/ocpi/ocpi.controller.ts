import { Request, Response } from "express";
import { prisma } from "../../config/database.js";
import axios from "axios";
import { logger } from "../../utils/logger.js";

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
export const testEndpoint = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      res.status(400).json({ success: false, message: "Invalid endpoint ID." });
      return;
    }

    const endpoint = await prisma.ocpiEndpoint.findUnique({
      where: { id },
    });

    if (!endpoint) {
      res.status(404).json({ success: false, message: "OCPI endpoint not found." });
      return;
    }

    // Attempt to ping the endpoint's URL
    // Standard OCPI typically expects an Authorization header for most requests,
    // though a basic reachability test might just ping the versions URL.
    const response = await axios.get(endpoint.url, {
      headers: {
        Authorization: `Token ${endpoint.token}`,
      },
      timeout: 5000, // 5 second timeout
    });

    if (response.status >= 200 && response.status < 300) {
      res.json({ success: true, message: "Connection successful.", data: response.data });
    } else {
      res.status(response.status).json({ success: false, message: `Received unexpected status code: ${response.status}` });
    }
  } catch (error: any) {
    logger.error("Error testing OCPI endpoint connection", error);
    res.status(500).json({ success: false, message: "Failed to connect to OCPI endpoint.", error: error.message });
  }
};

// OCPI endpoints
export const getLocations = async (req: Request, res: Response): Promise<void> => {
  try {
    const stations = await prisma.chargingStation.findMany({
      include: {
        chargers: {
          include: {
            evses: {
              include: {
                connectors: true,
              },
            },
          },
        },
      },
    });

    const ocpiLocations = stations.map(station => {
      // Map EVSEs from all chargers in this station
      const evses: any[] = [];

      for (const charger of station.chargers) {
        for (const evse of charger.evses) {
          const connectors = evse.connectors.map(connector => ({
            id: String(connector.connector_id),
            standard: connector.connector_name, // e.g., "Channel 1" - adjust as needed
            format: "SOCKET", // Dummy value or derive from DB if available
            power_type: connector.current_type || "AC_3_PHASE",
            max_voltage: 400, // Dummy value or derive
            max_amperage: connector.max_current || 32,
            max_electric_power: connector.max_power ? connector.max_power * 1000 : 22000,
          }));

          evses.push({
            uid: String(evse.id),
            evse_id: String(evse.evse_id),
            status: "AVAILABLE", // This should ideally be mapped from connector.status
            connectors: connectors,
          });
        }
      }

      return {
        id: String(station.id),
        type: "ON_STREET", // Default type
        name: station.station_name,
        address: `${station.street_name}`,
        city: station.city,
        postal_code: station.postal_code,
        country: station.country || "BEL",
        coordinates: {
          latitude: String(station.latitude),
          longitude: String(station.longitude),
        },
        evses: evses,
        last_updated: station.updatedAt.toISOString(),
      };
    });

    res.json({
      success: true,
      data: ocpiLocations,
    });
  } catch (error: any) {
    logger.error("Error fetching OCPI locations", error);
    res.status(500).json({ success: false, message: "Failed to fetch OCPI locations." });
  }
};

export const getTariffs = async (req: Request, res: Response): Promise<void> => {
  try {
    const tariffs = await prisma.tariff.findMany();

    const ocpiTariffs = tariffs.map(tariff => {
      const elements: any[] = [];

      // Add fixed charge if any
      if (tariff.charge > 0) {
        elements.push({
          price_components: [
            {
              type: "FLAT",
              price: tariff.charge,
              vat: tariff.taxPercentage || 21.0,
              step_size: 1,
            },
          ],
        });
      }

      // Add energy rate
      if (tariff.electricity_rate > 0) {
        elements.push({
          price_components: [
            {
              type: "ENERGY",
              price: tariff.electricity_rate,
              vat: tariff.taxPercentage || 21.0,
              step_size: 1,
            },
          ],
        });
      }

      // Add time fee
      if (tariff.time_fee && tariff.time_fee > 0) {
        elements.push({
          price_components: [
            {
              type: "TIME",
              price: tariff.time_fee,
              vat: tariff.taxPercentage || 21.0,
              step_size: 60, // per minute or hour depending on interpretation
            },
          ],
        });
      }

      // If tariffType is DYNAMIC_EPEX, we might have additional fields or map them differently,
      // but for basic mapping we can just output the elements we have.

      return {
        id: String(tariff.tariff_id),
        currency: "EUR",
        type: tariff.tariffType === "DYNAMIC_EPEX" ? "PROFILE_CHEAP" : "REGULAR",
        elements: elements,
        last_updated: tariff.updatedAt.toISOString(),
      };
    });

    res.json({
      success: true,
      data: ocpiTariffs,
    });
  } catch (error: any) {
    logger.error("Error fetching OCPI tariffs", error);
    res.status(500).json({ success: false, message: "Failed to fetch OCPI tariffs." });
  }
};
