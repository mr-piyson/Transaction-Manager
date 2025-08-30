"use server";

import { z } from "zod";
import { Vehicle } from "./Vehicles-Dialog";
import prisma from "@/lib/prisma";

export async function getVehicle(id: string) {
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: {
        vehicleNo: id,
      },
    });
    return vehicle;
  } catch (error) {
    return null;
  }
}

export async function createVehicle(formData: z.infer<typeof Vehicle>) {
  try {
    if (await getVehicle(formData.vehicleNo)) {
      return { error: "Vehicle already exists" };
    }
    const vehicle = await prisma.vehicle.create({
      data: {
        vehicleNo: formData.vehicleNo,
        type: formData.type,
        driver: formData.driver,
        mechanic: formData.mechanic,
      },
    });
    return vehicle;
  } catch (error) {
    return { error: "Error creating vehicle" };
  }
}
