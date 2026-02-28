import { Elysia, t } from "elysia";
import { authMiddleware } from "../middleware/auth.middleware";
import db from "@/lib/database";

export const customerRoutes = new Elysia({ prefix: "/customers" })
  .use(authMiddleware)
  .get(
    "/",
    async ({ query, set }) => {
      try {
        const data = await db.customer.findMany({});
        return data;
      } catch (e: any) {
        throw new Error("Failed to retrieve data");
      }
    },
    {
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        search: t.Optional(t.String()),
      }),
    },
  )
  .get(
    "/:id",
    async ({ params, set }) => {
      try {
        const data = {};
        return { success: true, data };
      } catch (e: any) {
        set.status = 404;
        return { success: false, message: e.message };
      }
    },
    { params: t.Object({ id: t.String() }) },
  )
  .post(
    "/",
    async ({ body, set }) => {
      try {
        const data = {};
        set.status = 201;
        return { success: true, data };
      } catch (e: any) {
        set.status = 400;
        return { success: false, message: e.message };
      }
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        phone: t.String({ minLength: 1 }),
        address: t.String({ minLength: 1 }),
        email: t.Optional(t.String({ format: "email" })),
      }),
    },
  )
  .patch(
    "/:id",
    async ({ params, body, set }) => {
      try {
        const data = {};
        return { success: true, data };
      } catch (e: any) {
        set.status = 400;
        return { success: false, message: e.message };
      }
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        name: t.Optional(t.String()),
        phone: t.Optional(t.String()),
        address: t.Optional(t.String()),
        email: t.Optional(t.String({ format: "email" })),
      }),
    },
  )
  .delete(
    "/:id",
    async ({ params, set }) => {
      try {
        const data = {};
        return { success: true, data };
      } catch (e: any) {
        set.status = 400;
        return { success: false, message: e.message };
      }
    },
    { params: t.Object({ id: t.String() }) },
  );
