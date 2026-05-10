import { Request, Response } from "express";
import { prisma } from "../../config/database.js";
import { logger } from "../../utils/logger.js";

const parseId = (id: string | string[] | undefined) => {
  if (typeof id !== 'string') return null;
  const parsed = parseInt(id, 10);
  return isNaN(parsed) ? null : parsed;
};

/**
 * GET /api/quirk-profiles - Get all quirk profiles
 */
export const getQuirkProfiles = async (req: Request, res: Response) => {
  try {
    const profiles = await prisma.chargerQuirkProfile.findMany({
      include: {
        _count: {
          select: { chargers: true }
        }
      }
    });

    res.json({ success: true, data: profiles });
  } catch (error) {
    logger.error(`Error getting quirk profiles: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to get quirk profiles",
    });
  }
};

/**
 * GET /api/quirk-profiles/:id - Get specific quirk profile
 */
export const getQuirkProfile = async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Invalid profile ID",
      });
    }

    const profile = await prisma.chargerQuirkProfile.findUnique({
      where: { id },
      include: {
        chargers: {
          select: {
            charger_id: true,
            name: true,
            model: true,
          }
        }
      }
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: "Quirk profile not found",
      });
    }

    res.json({ success: true, data: profile });
  } catch (error) {
    logger.error(`Error getting quirk profile: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to get quirk profile",
    });
  }
};

/**
 * POST /api/quirk-profiles - Create a new quirk profile
 */
export const createQuirkProfile = async (req: Request, res: Response) => {
  try {
    const { name, description, rules } = req.body;

    if (!name || !rules) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: name and rules",
      });
    }

    const existing = await prisma.chargerQuirkProfile.findUnique({
      where: { name }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: "Quirk profile with this name already exists",
      });
    }

    const profile = await prisma.chargerQuirkProfile.create({
      data: {
        name,
        description,
        rules,
      }
    });

    logger.info(`Created quirk profile: ${profile.name}`);
    res.status(201).json({ success: true, data: profile });
  } catch (error) {
    logger.error(`Error creating quirk profile: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to create quirk profile",
    });
  }
};

/**
 * PUT /api/quirk-profiles/:id - Update an existing quirk profile
 */
export const updateQuirkProfile = async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);
    const { name, description, rules } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Invalid profile ID",
      });
    }

    const existing = await prisma.chargerQuirkProfile.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: "Quirk profile not found",
      });
    }

    if (name && name !== existing.name) {
      const duplicate = await prisma.chargerQuirkProfile.findUnique({
        where: { name }
      });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          error: "Quirk profile with this name already exists",
        });
      }
    }

    const profile = await prisma.chargerQuirkProfile.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(rules !== undefined && { rules }),
      }
    });

    logger.info(`Updated quirk profile: ${profile.name}`);
    res.json({ success: true, data: profile });
  } catch (error) {
    logger.error(`Error updating quirk profile: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to update quirk profile",
    });
  }
};

/**
 * DELETE /api/quirk-profiles/:id - Delete a quirk profile
 */
export const deleteQuirkProfile = async (req: Request, res: Response) => {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Invalid profile ID",
      });
    }

    const existing = await prisma.chargerQuirkProfile.findUnique({
      where: { id },
      include: {
        _count: {
          select: { chargers: true }
        }
      }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: "Quirk profile not found",
      });
    }

    if (existing._count.chargers > 0) {
      return res.status(400).json({
        success: false,
        error: "Cannot delete quirk profile: it is assigned to one or more chargers",
      });
    }

    await prisma.chargerQuirkProfile.delete({
      where: { id }
    });

    logger.info(`Deleted quirk profile: ${existing.name}`);
    res.json({ success: true, message: "Quirk profile deleted successfully" });
  } catch (error) {
    logger.error(`Error deleting quirk profile: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to delete quirk profile",
    });
  }
};

/**
 * GET /api/quirk-profiles/export - Export all quirk profiles as a JSON file
 */
export const exportProfiles = async (req: Request, res: Response) => {
  try {
    const profiles = await prisma.chargerQuirkProfile.findMany({
      select: {
        name: true,
        description: true,
        rules: true,
      }
    });

    res.setHeader('Content-disposition', 'attachment; filename=quirk-profiles.json');
    res.setHeader('Content-type', 'application/json');
    res.send(JSON.stringify(profiles, null, 2));
  } catch (error) {
    logger.error(`Error exporting quirk profiles: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to export quirk profiles",
    });
  }
};

/**
 * POST /api/quirk-profiles/import - Import quirk profiles from a JSON array
 */
export const importProfiles = async (req: Request, res: Response) => {
  try {
    const profiles = req.body;

    if (!Array.isArray(profiles)) {
      return res.status(400).json({
        success: false,
        error: "Invalid input: expected a JSON array of quirk profiles",
      });
    }

    // Validate that each profile has a name and rules
    const validProfiles = profiles.filter(p => p.name && p.rules).map(p => ({
      name: String(p.name),
      description: p.description ? String(p.description) : null,
      rules: p.rules,
    }));

    if (validProfiles.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No valid quirk profiles found in the import data",
      });
    }

    const result = await prisma.chargerQuirkProfile.createMany({
      data: validProfiles,
      skipDuplicates: true,
    });

    logger.info(`Imported ${result.count} quirk profiles`);
    res.status(201).json({
      success: true,
      message: `Successfully imported ${result.count} quirk profiles`,
      count: result.count,
    });
  } catch (error) {
    logger.error(`Error importing quirk profiles: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to import quirk profiles",
    });
  }
};
