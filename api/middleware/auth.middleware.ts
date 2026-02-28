import { getCurrentUser } from "@/actions/auth.action";
import { Elysia } from "elysia";

export const authMiddleware = new Elysia({ name: "auth-middleware" }).derive(
  { as: "scoped" },
  async ({ headers, set }) => {
    try {
      const user = await getCurrentUser();
    } catch {
      set.status = 401;
      throw new Error("Unauthorized");
    }
  },
);
