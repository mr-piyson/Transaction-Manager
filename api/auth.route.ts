import { signIn, signOut, signUp } from "../services/auth.service";
import { Hono } from "hono";

const authRouter = new Hono();
export default authRouter;

// Sign Out Route Handler
authRouter.delete("/", async c => {
  try {
    const res = await signOut();
    if (res.success) {
      return c.json({ success: true }, { status: 200 });
    }
    return c.json({ error: "Sign out failed" }, { status: 400 });
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal Server Error" }, { status: 500 });
  }
});

// Sign in Route Handler
authRouter.post("/", async c => {
  try {
    const { email, password } = await c.req.json();
    const result = await signIn({
      email,
      password,
    });
    if (result.success) {
      return c.json({ message: "Sign in successful" }, { status: 200 });
    } else {
      return c.json({ error: result.error || "Sign in failed" }, { status: 401 });
    }
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal Server Error" }, { status: 500 });
  }
});

// Sign up Route Handler
authRouter.put("/", async c => {
  try {
    const { email, password, name } = await c.req.json();
    const result = await signUp({
      email,
      password,
      name,
    });

    if (result.success) {
      return c.json({ message: "Registration successful" }, { status: 201 });
    } else {
      return c.json({ error: result.error || "Registration failed" }, { status: 400 });
    }
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal Server Error" }, { status: 500 });
  }
});
