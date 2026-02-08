import db from "@/lib/database";
import { Hono } from "hono";

export const recordsRoute = new Hono();

// ------------------------------------------------------------------
// RECORDS API Handler
// ------------------------------------------------------------------
recordsRoute.get("/records", async c => {
  try {
    // GET logic here
    const customers = await db.records.findMany({
      orderBy: { id: "desc" },
    });
    return c.json(customers);
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal Server Error" }, { status: 500 });
  }
});

recordsRoute.post("/records", async c => {
  try {
    const formData = await c.req.formData();
    const name = formData.get("name") as string | null;
    const phone = formData.get("phone") as string | null;
    const email = formData.get("email") as string | null;
    const address = formData.get("address") as string | null;
    const image = formData.get("image") as string | null;

    // Optional basic validation
    if (!name) {
      return c.json({ error: "Name is required" }, { status: 400 });
    }

    // Step 1: Insert the customer
    const customer = await db.records.create({
      data: { name, email, phone, address, image },
    });

    // Step 2: Update the code based on the auto-incremented ID
    const updatedCustomer = await db.records.update({
      where: { id: customer.id },
      data: { code: `CUST-${String(customer.id).padStart(6, "0")}` },
    });

    return c.json(customer, { status: 201 });
  } catch (error) {
    console.error("Create customer error:", error);
    return c.json({ error: "Internal Server Error" }, { status: 500 });
  }
});
