import Elysia from "elysia";
import { ForbiddenError } from "@casl/ability";
import { AppAbility, AuthUser, defineAbilityFor } from "../ability";

// Extend context with ability + user
export const caslPlugin = new Elysia({ name: "casl" }).derive(
  { as: "global" },
  async ({ headers }) => {
    // --- Replace with your real auth logic (JWT, session, etc.) ---
    const token = headers["authorization"]?.replace("Bearer ", "");

    let user: AuthUser | null = null;

    if (token) {
      // Mock: decode token → real app: verify JWT
      try {
        user = JSON.parse(Buffer.from(token, "base64").toString());
      } catch {
        user = null;
      }
    }

    const ability = defineAbilityFor(user);

    return { user, ability };
  },
);

// Helper: throw 403 if ability check fails
export function guard(
  ability: AppAbility,
  action: Parameters<AppAbility["can"]>[0],
  subject: Parameters<AppAbility["can"]>[1],
) {
  if (!ability.can(action, subject)) {
    throw new ForbiddenError(ability).setMessage(
      `Forbidden: cannot ${action} ${subject as string}`,
    );
  }
}
