import { Elysia, t } from "elysia";
import { authMiddleware } from "../middleware/auth.middleware";
import db from "@/lib/database";
import { InventoryItem } from "@prisma/client";

export const inventoryRoutes = new Elysia({ prefix: "/inventory" })
  .use(authMiddleware)
  .get("/", async ({ query, set }) => {
    try {
      const data = await db.inventoryItem.findMany({});
      return data;
    } catch (e: any) {
      set.status = 500;
      return { success: false, message: e.message };
    }
  })
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
  .post("/", async ({ body, set }) => {
    const { name, purchasePrice, salesPrice, code, description, image } =
      body as InventoryItem;
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
  })
  .patch("/:id", async ({ params, body, set }) => {
    try {
      return db.inventoryItem.update({
        data: body as any,
        where: {
          id: Number(params.id),
        },
      });
    } catch (e: any) {
      set.status = 400;
      return { success: false, message: e.message };
    }
  })
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
