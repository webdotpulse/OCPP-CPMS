import { Request, Response } from "express";
import { prisma } from "../../config/database.js";
import { logger } from "../../utils/logger.js";
import { parsePagination, parseId } from "../../utils/validation.js";
import { AuthRequest } from "../../middleware/auth.js";
import { sendEmail } from "../../utils/mailer.js";
import bcrypt from "bcrypt";
import { sanitizeUsers, sanitizeUser } from "../../utils/user.dto.js";

/**
 * GET /api/users - Get all users
 */
export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { page: queryPage, limit: queryLimit, search } = req.query;
    const { page, limit } = parsePagination(queryPage as string, queryLimit as string);

    const skip = (page - 1) * limit;
    const take = limit;

    const where: any = {
      deletedAt: null // Exclude soft-deleted users
    };
    if (search) {
      where.OR = [
        { email: { contains: search as string, mode: "insensitive" } },
        { name: { contains: search as string, mode: "insensitive" } }
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take,
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          userType: true,
          companyName: true,
        companyId: true,
        emailVerified: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: sanitizeUsers(users),
      pagination: {
        page: Number(page),
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    logger.error(`Error getting users: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to get users",
    });
  }
};

/**
 * GET /api/users/:id - Get specific user
 */
export const getUserById = async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseId(req.params.id);

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "Invalid user ID",
      });
    }

    if (req.userId !== userId && req.userRole !== "superadmin") {
      return res.status(403).json({
        success: false,
        error: "Forbidden",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        userType: true,
        companyName: true,
        companyId: true,
        address: true,
        phone: true,
        taxNumber: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    res.json({ success: true, data: sanitizeUser(user) });
  } catch (error) {
    logger.error(`Error getting user: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to get user",
    });
  }
};

/**
 * PUT /api/users/:id - Update user details
 */
export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseId(req.params.id);
    const updateData = { ...req.body };

    // Completely strip password from the payload - must use dedicated endpoint
    delete updateData.password;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "Invalid user ID",
      });
    }

    if (req.userId !== userId && req.userRole !== "superadmin") {
      return res.status(403).json({
        success: false,
        error: "Forbidden",
      });
    }

    // Admins modifying another user cannot change their email
    if (req.userId !== userId && updateData.email) {
      delete updateData.email;
    }

    // Standard users cannot elevate or change their role
    if (req.userRole !== "superadmin" && updateData.role) {
      delete updateData.role;
    }

    // Only superadmins can manually alter email verification status
    if (req.userRole !== "superadmin" && "emailVerified" in updateData) {
      delete updateData.emailVerified;
    }

    if (updateData.role && (updateData.role !== "admin" && updateData.role !== "user" && updateData.role !== "superadmin")) {
        return res.status(400).json({
          success: false,
          error: "Valid role is required",
        });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: updateData.name,
        ...(updateData.email ? { email: updateData.email } : {}),
        ...(updateData.role ? { role: updateData.role } : {}),
        userType: updateData.userType,
        companyName: updateData.companyName,
        companyId: updateData.companyId ? parseInt(updateData.companyId, 10) : null,
        address: updateData.address,
        phone: updateData.phone,
        taxNumber: updateData.taxNumber,
        ...("emailVerified" in updateData ? { emailVerified: updateData.emailVerified } : {})
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        userType: true,
        companyName: true,
        companyId: true,
        address: true,
        phone: true,
        taxNumber: true,
        emailVerified: true,
      }
    });

    res.json({ success: true, data: sanitizeUser(updatedUser) });
  } catch (error) {
    logger.error(`Error updating user: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to update user",
    });
  }
};

/**
 * PUT /api/users/:id/role - Update user role
 */
export const updateUserRole = async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseId(req.params.id);
    const { role } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "Invalid user ID",
      });
    }

    if (!role || (role !== "admin" && role !== "user")) {
        return res.status(400).json({
          success: false,
          error: "Valid role is required (admin or user)",
        });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        userType: true,
        companyName: true,
      }
    });

    res.json({ success: true, data: sanitizeUser(updatedUser) });
  } catch (error) {
    logger.error(`Error updating user role: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to update user role",
    });
  }
};

export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, password, role, userType, companyName, companyId } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email and password required" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ success: false, error: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name: name || null,
        email,
        password: hashedPassword,
        role: role || "user",
        userType: userType || "private",
        companyName: companyName || null,
        companyId: companyId ? parseInt(companyId, 10) : null
      },
      select: { id: true, name: true, email: true, role: true, userType: true, companyName: true, companyId: true, language: true, emailVerified: true }
    });

    try {
      const loginUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      await sendEmail(
        user.email,
        "Welcome to OCPP CMS",
        `Welcome ${name || "User"}! Your account has been created by an admin. You can log in at ${loginUrl} using your email and the password provided.`,
        `<p>Welcome ${name || "User"}!</p><p>Your account has been created by an admin.</p><p>You can log in at <a href="${loginUrl}">${loginUrl}</a> using your email and the password provided.</p>`,
        "admin_welcome",
        user.language,
        {
          userEmail: user.email,
          name: name || "User",
          password,
          loginUrl
        }
      );
    } catch (emailError) {
      logger.error(`Error sending welcome email to ${user.email}: ${emailError}`);
    }

    res.status(201).json({ success: true, data: user });
  } catch (error) {
    logger.error(`Error creating user: ${error}`);
    res.status(500).json({ success: false, error: "Failed to create user" });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ success: false, error: "Invalid ID" });

    if (req.userId !== id && req.userRole !== "superadmin") {
      return res.status(403).json({
        success: false,
        error: "Forbidden",
      });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    if (user.role === 'admin' && user.id === 1) {
      return res.status(400).json({ success: false, error: "Cannot delete root admin" });
    }

    const isHardDelete = req.query.hard === 'true';

    if (isHardDelete) {
      if (req.userRole !== "superadmin") {
        return res.status(403).json({ success: false, error: "Superadmin access required for hard deletion" });
      }
      await prisma.user.delete({ where: { id } });
      res.json({ success: true, message: "Hard deleted" });
    } else {
      await prisma.user.update({
        where: { id },
        data: { deletedAt: new Date() }
      });
      res.json({ success: true, message: "Soft deleted" });
    }
  } catch (error) {
    logger.error(`Error deleting user: ${error}`);
    res.status(500).json({ success: false, error: "Failed to delete user" });
  }
};
