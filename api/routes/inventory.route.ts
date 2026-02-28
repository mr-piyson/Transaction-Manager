import { Elysia, t } from "elysia";
import { authMiddleware } from "../middleware/auth.middleware";
import { inventoryAction } from "@/actions/inventory.action";

export const inventoryRoutes = new Elysia({ prefix: "/inventory" })
  .use(authMiddleware)
  .get(
    "/",
    async ({ query, set }) => {
      try {
        const data = await inventoryAction.getAll({
          page: query.page ? Number(query.page) : undefined,
          limit: query.limit ? Number(query.limit) : undefined,
          search: query.search,
        });
        return { success: true, ...data };
      } catch (e: any) {
        set.status = 500;
        return { success: false, message: e.message };
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
        const data = await inventoryAction.getById(Number(params.id));
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
        const data = await inventoryAction.create(body);
        set.status = 201;
        return { success: true, data };
      } catch (e: any) {
        set.status = 400;
        return { success: false, message: e.message };
      }
    },
    {
      body: t.Object({
        code: t.Optional(t.String()),
        name: t.String({ minLength: 1 }),
        description: t.String({ minLength: 1 }),
        purchasePrice: t.Number({ minimum: 0 }),
        salesPrice: t.Number({ minimum: 0 }),
        image: t.Optional(t.String()),
      }),
    },
  )
  .patch(
    "/:id",
    async ({ params, body, set }) => {
      try {
        const data = await inventoryAction.update(Number(params.id), body);
        return { success: true, data };
      } catch (e: any) {
        set.status = 400;
        return { success: false, message: e.message };
      }
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        code: t.Optional(t.String()),
        name: t.Optional(t.String()),
        description: t.Optional(t.String()),
        purchasePrice: t.Optional(t.Number({ minimum: 0 })),
        salesPrice: t.Optional(t.Number({ minimum: 0 })),
        image: t.Optional(t.String()),
      }),
    },
  )
  .delete(
    "/:id",
    async ({ params, set }) => {
      try {
        const data = await inventoryAction.delete(Number(params.id));
        return { success: true, data };
      } catch (e: any) {
        set.status = 400;
        return { success: false, message: e.message };
      }
    },
    { params: t.Object({ id: t.String() }) },
  );
