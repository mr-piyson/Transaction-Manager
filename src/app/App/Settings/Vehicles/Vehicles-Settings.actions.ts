"use server";
import { getAccount } from "@/app/Auth/auth.actions";
import { VehicleType } from "@prisma/client";
import prisma from "@/lib/prisma";

export async function getVehicleTypes(): Promise<{
  success: boolean;
  error: string | null;
  data: VehicleType[] | null;
}> {
  try {
    const types = await prisma.vehicleType.findMany({});
    return {
      success: true,
      error: null,
      data: types,
    };
  } catch (error) {
    return {
      success: false,
      error: "Error fetching vehicle types",
      data: null,
    };
  }
}

export async function addVehicleType(name: string): Promise<{
  success: boolean;
  error: string | null;
  data: VehicleType | null;
}> {
  try {
    if ((await getAccount())?.role !== "Admin") {
      return {
        success: false,
        error: "You do not have permission to add vehicle types",
        data: null,
      };
    }

    if (!name.trim()) {
      return {
        success: false,
        error: "Vehicle type name cannot be empty",
        data: null,
      };
    }

    const type = await prisma.vehicleType.create({
      data: { name: name.trim() },
    });

    return {
      success: true,
      error: null,
      data: type,
    };
  } catch (error) {
    return {
      success: false,
      error: "Error adding vehicle type",
      data: null,
    };
  }
}

export async function updateVehicleType(
  id: string,
  name: string
): Promise<{
  success: boolean;
  error: string | null;
  data: VehicleType | null;
}> {
  try {
    if ((await getAccount())?.role !== "Admin") {
      return {
        success: false,
        error: "You do not have permission to update vehicle types",
        data: null,
      };
    }

    if (!name.trim()) {
      return {
        success: false,
        error: "Vehicle type name cannot be empty",
        data: null,
      };
    }

    const type = await prisma.vehicleType.update({
      where: { id },
      data: { name },
    });

    return {
      success: true,
      error: null,
      data: type,
    };
  } catch (error) {
    return {
      success: false,
      error: "Error updating vehicle type",
      data: null,
    };
  }
}

export async function deleteVehicleType(id: string): Promise<{
  success: boolean;
  error: string | null;
  data: VehicleType | null;
}> {
  try {
    if ((await getAccount())?.role !== "Admin") {
      return {
        success: false,
        error: "You do not have permission to delete vehicle types",
        data: null,
      };
    }
    const type = await prisma.vehicleType.delete({
      where: { id },
    });
    return {
      success: true,
      error: null,
      data: type,
    };
  } catch (error) {
    return {
      success: false,
      error: "Error deleting vehicle type",
      data: null,
    };
  }
}
