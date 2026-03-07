import { Elysia, t } from "elysia";
import { authMiddleware } from "../middleware/auth.middleware";
import db from "@/lib/database";

export const inventoryRoutes = new Elysia({ prefix: "/inventory" })
  .use(authMiddleware)
  .get(
    "/",
    async ({ query, set }) => {
      try {
        const data = await db.inventoryItem.findMany({});
        return data;
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
        return await db.inventoryItem.findUnique({
          where: { id: Number(params.id) },
        });
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
      const { name, purchasePrice, salesPrice, code, description, image } =
        body;
      try {
        await db.inventoryItem.create({
          data: {
            name,
            description,
            salesPrice,
            purchasePrice,
            code,
          },
        });
        set.status = 201;
        return { success: true };
      } catch (e: any) {
        set.status = 400;
        console.log(e.message);
        return { success: false, message: e.message };
      }
    },
    {
      body: t.Object({
        code: t.Optional(t.String()),
        name: t.String({ minLength: 1 }),
        description: t.Optional(t.String({ minLength: 1 })),
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
        return db.inventoryItem.update({
          data: body,
          where: {
            id: Number(params.id),
          },
        });
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
        const data = await db.inventoryItem.delete({
          where: {
            id: Number(params.id),
          },
        });
        set.status = 201;
      } catch (e: any) {
        set.status = 400;
        return { success: false, message: e.message };
      }
    },
    { params: t.Object({ id: t.String() }) },
  );
