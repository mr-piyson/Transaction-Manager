import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
const setupRouter = new Hono();

const tenantSchema = z.object({
  name: z.string().min(1, "Organization name is required").max(100),
  slug: z
    .string()
    .min(3, "Slug must be at least 3 characters")
    .max(50)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  plan: z.enum(["free", "starter", "professional", "enterprise"]),
});

/**
 * POST /tenants
 * Create a new tenant with Zod validation middleware
 */
setupRouter.post("/tenants", zValidator("json", tenantSchema), async c => {
  const validatedData = c.req.valid("json");

  try {
    // Check if slug already exists
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug: validatedData.slug },
    });

    if (existingTenant) {
      return c.json({ error: "This slug is already taken. Please choose another." }, 409);
    }

    // Create tenant
    const tenant = await prisma.tenant.create({
      data: {
        ...validatedData,
        isActive: true,
      },
    });

    return c.json(
      {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        plan: tenant.plan,
        message: "Tenant created successfully",
      },
      201,
    );
  } catch (error) {
    console.error("Error creating tenant:", error);
    return c.json({ error: "An unexpected error occurred." }, 500);
  }
});

/**
 * GET /tenants/check
 * Check if a slug is available
 */
setupRouter.get("/tenants/check", async c => {
  const slug = c.req.query("slug");

  if (!slug) {
    return c.json({ error: "Slug parameter is required" }, 400);
  }

  try {
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug },
    });

    return c.json({
      available: !existingTenant,
    });
  } catch (error) {
    console.error("Error checking tenant slug:", error);
    return c.json({ error: "An unexpected error occurred" }, 500);
  }
});

export default setupRouter;
