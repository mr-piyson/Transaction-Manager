import { Permission, RolePermissions } from "@/types/rbac";
import { Context, Next } from "hono";
import { HonoResponse } from "../../utils/response";
import db from "@/lib/database";

export const requirePermission = (...permissions: Permission[]) => {
  return async (c: Context, next: Next) => {
    const user = c.get("user");

    if (!user) {
      return HonoResponse.unauthorized(c);
    }

    const dbUser = await db.user.findUnique({
      where: {
        id: user.userId,
      },
    });

    if (!dbUser) {
      return HonoResponse.notFound(c);
    }

    const userPermissions = RolePermissions[dbUser.role] || [];

    const hasPermission = permissions.every(permission => userPermissions.includes(permission));

    if (!hasPermission) {
      return HonoResponse.forbidden(c, "Insufficient permissions");
    }

    await next();
  };
};

export const requireRole = (...roles: string[]) => {
  return async (c: Context, next: Next) => {
    const user = c.get("user");

    if (!user) {
      return HonoResponse.unauthorized(c);
    }

    const dbUser = await db.user.findUnique({
      where: {
        id: user.userId,
      },
    });

    if (!dbUser) {
      return HonoResponse.notFound(c);
    }

    if (!roles.includes(dbUser.role)) {
      return HonoResponse.forbidden(c, "Insufficient role");
    }

    await next();
  };
};
