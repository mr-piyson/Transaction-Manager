import { Elysia, t } from "elysia";
import { authMiddleware } from "../middleware/auth.middleware";
import { signIn, signOut, signUp } from "@/actions/auth.action";

export const authRoutes = new Elysia({ prefix: "/auth" })
  .post(
    "/register",
    async ({ body, set }) => {
      try {
        const user = await signUp({
          email: body.email,
          name: body.firstName,
          password: body.password,
        });
        set.status = 201;
        return { success: true, data: user };
      } catch (e: any) {
        set.status = 400;
        return { success: false, message: e.message };
      }
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String({ minLength: 8 }),
        firstName: t.String({ minLength: 1 }),
        lastName: t.Optional(t.String()),
      }),
    },
  )
  .post(
    "/login",
    async ({ body, headers, request, set }) => {
      try {
        const result = await signIn({
          email: body.email,
          password: body.password,
        });
        return { success: true, data: result };
      } catch (e: any) {
        set.status = 401;
        return { success: false, message: e.message };
      }
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String(),
      }),
    },
  )
  .use(authMiddleware)
  .post("/logout", async ({ set }) => {
    await signOut();
    return { success: true };
  });
// .get("/me", ({ user }) => ({ success: true, data: user }));
