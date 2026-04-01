import { Response, NextFunction } from "express";
import { USER_ROLE } from "../types/roles";
import { AuthRequest } from "./auth";

/**
 * Role-based authorization middleware
 * 
 * Usage:
 * - authorize(USER_ROLE.ADMIN) - Only admins can access
 * - authorize([USER_ROLE.ADMIN, USER_ROLE.COUNSELOR]) - Admins or counselors can access
 */

export const authorize = (...allowedRoles: (USER_ROLE | USER_ROLE[])[]) => {
  // Flatten the array in case nested arrays are passed
  const roles = allowedRoles.flat();

  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    // Check if user is authenticated (should be set by authenticate middleware)
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required. Please login first.",
      });
      return;
    }

    // Check if user's role is in the allowed roles
    const userRole = req.user.role as USER_ROLE;
    
    if (!roles.includes(userRole)) {
      res.status(403).json({
        success: false,
        message: `Access denied. This resource requires one of the following roles: ${roles.join(", ")}. Your role: ${userRole}`,
      });
      return;
    }

    // User has required role, proceed
    next();
  };
};

/**
 * Convenience functions for common role checks
 */

// Only admins can access
export const adminOnly = authorize(USER_ROLE.ADMIN);

// Only super admins can access
export const superAdminOnly = authorize(USER_ROLE.SUPER_ADMIN);

// Super admins or admins can access
export const superAdminOrAdmin = authorize(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN);

// Super admins, admins, or counselors can access
export const superAdminOrAdminOrCounselor = authorize(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN, USER_ROLE.COUNSELOR);

// Admins or counselors can access
export const adminOrCounselor = authorize(USER_ROLE.ADMIN, USER_ROLE.COUNSELOR);

