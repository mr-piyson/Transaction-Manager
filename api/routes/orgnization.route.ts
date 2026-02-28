import { Elysia, t } from "elysia";
import { authMiddleware } from "../middleware/auth.middleware";
import { organizationAction } from "@/actions/orgnization.action";

export const organizationRoutes = new Elysia({ prefix: "/organization" })
  .use(authMiddleware)
  .get("/", async ({ set }) => {
    try {
      const data = await organizationAction.get();
      return { success: true, data };
    } catch (e: any) {
      set.status = 500;
      return { success: false, message: e.message };
    }
  })
  .put(
    "/",
    async ({ body, set }) => {
      try {
        const data = await organizationAction.upsert(body);
        return { success: true, data };
      } catch (e: any) {
        set.status = 400;
        return { success: false, message: e.message };
      }
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        logo: t.Optional(t.String()),
        address: t.Optional(t.String()),
        country: t.Optional(t.String()),
        website: t.Optional(t.String()),
        tax: t.Optional(t.String()),
      }),
    },
  );
