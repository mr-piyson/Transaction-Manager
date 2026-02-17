import { Permission, RolePermissions } from "@/types/rbac";
import { Context, Next } from "hono";
import { HonoResponse } from "../../utils/response";

export const requirePermission = (...permissions: Permission[]) => {
  return async (c: Context, next: Next) => {
    const user = c.get("user");

    if (!user) {
      return HonoResponse.unauthorized(c);
    }

    const userPermissions = RolePermissions[user.role] || [];

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

    if (!roles.includes(user.role)) {
      return HonoResponse.forbidden(c, "Insufficient role");
    }

    await next();
  };
};
