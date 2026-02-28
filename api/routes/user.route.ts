import { Elysia, t } from "elysia";
import { userAction } from "@/actions/user.action";

export const userRoutes = new Elysia({ prefix: "/users" })
  .get(
    "/",
    async ({ query, set }) => {
      try {
        const data = await userAction.getAll({
          page: query.page ? Number(query.page) : undefined,
          limit: query.limit ? Number(query.limit) : undefined,
          role: query.role as any,
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
        role: t.Optional(t.String()),
      }),
    },
  )
  .get(
    "/:id",
    async ({ params, set }) => {
      try {
        const data = await userAction.getById(params.id);
        return { success: true, data };
      } catch (e: any) {
        set.status = 404;
        return { success: false, message: e.message };
      }
    },
    { params: t.Object({ id: t.String() }) },
  )
  .patch(
    "/:id",
    async ({ params, body, set }) => {
      try {
        const data = await userAction.update(params.id, body);
        return { success: true, data };
      } catch (e: any) {
        set.status = 400;
        return { success: false, message: e.message };
      }
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        firstName: t.Optional(t.String()),
        lastName: t.Optional(t.String()),
        email: t.Optional(t.String({ format: "email" })),
        role: t.Optional(
          t.Union([
            t.Literal("SUPER_ADMIN"),
            t.Literal("ADMIN"),
            t.Literal("USER"),
          ]),
        ),
        isActive: t.Optional(t.Boolean()),
        password: t.Optional(t.String({ minLength: 8 })),
      }),
    },
  )
  .delete(
    "/:id",
    async ({ params, set }) => {
      try {
        const data = await userAction.delete(params.id);
        return { success: true, data };
      } catch (e: any) {
        set.status = 400;
        return { success: false, message: e.message };
      }
    },
    { params: t.Object({ id: t.String() }) },
  );
