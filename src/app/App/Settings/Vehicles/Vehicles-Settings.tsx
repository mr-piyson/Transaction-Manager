"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Save, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  addVehicleType,
  deleteVehicleType,
  updateVehicleType,
} from "./Vehicles-Settings.actions";
import { VehicleType } from "@prisma/client";
import useSWR from "swr";

export default function VehiclesSettings() {
  const {
    data: VehiclesTypes = [],
    error,
    mutate,
    isLoading,
  } = useSWR<VehicleType[]>("/api/vehicleTypes", {
    fetcher: (url: string) => fetch(url).then((res) => res.json()),
  });

  const [newVehicleType, setNewJobCardType] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const handleAddJobCardType = async () => {
    const res = await addVehicleType(newVehicleType);

    if (!res.success) {
      toast.error("Error", {
        description: res.error || "Failed to add job card type",
      });
      return;
    } else {
      mutate(); // Revalidate the SWR cache
      setNewJobCardType("");
      toast.success("Success", {
        description: "Job card type added successfully",
      });
    }
  };

  const handleEditStart = (type: VehicleType) => {
    setEditingId(type.id);
    setEditValue(type.name);
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditValue("");
  };

  const handleEditSave = async (id: string) => {
    if (!editValue.trim()) {
      toast.error("Error", {
        description: "Job card type name cannot be empty",
      });
      return;
    }

    const res = await updateVehicleType(id, editValue.trim());

    if (!res.success) {
      toast.error("Error", {
        description: res.error || "Failed to update job card type",
      });
      return;
    } else {
      mutate(); // Revalidate the SWR cache
      setEditingId(null);

      toast.success("Success", {
        description: "Job card type updated successfully",
      });
    }
  };

  const handleDelete = async (id: string) => {
    const res = await deleteVehicleType(id);
    if (!res.success) {
      toast.error("Error", {
        description: res.error || "Failed to delete job card type",
      });
      return;
    } else {
      mutate();
      toast("Success", {
        description: "Job card type deleted successfully",
      });
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Vehicles Settings
          </h1>
          <p className="text-muted-foreground">
            Manage vehicle types for vehicle maintenance and repairs.
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Vehicle Types</CardTitle>
            <CardDescription>
              Add, edit, or remove job card types that can be assigned to
              vehicles in Job Card.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-end gap-4">
                <div className="grid w-full max-w-sm items-center gap-1.5">
                  <Label htmlFor="new-job-card-type">
                    Add New Vehicle Type
                  </Label>
                  <Input
                    id="new-job-card-type"
                    placeholder="Enter job card type name"
                    value={newVehicleType}
                    onChange={(e) => setNewJobCardType(e.target.value)}
                  />
                </div>
                <Button onClick={handleAddJobCardType}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Type
                </Button>
              </div>

              <Separator className="my-4" />

              <div className="space-y-2">
                <h3 className="text-lg font-medium">Vehicles Types</h3>
                <div className="rounded-md border">
                  <div className="divide-y">
                    {VehiclesTypes.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        No Vehicle types added yet. Add your first one above.
                      </div>
                    ) : (
                      VehiclesTypes.map((type) => (
                        <div
                          key={type.id}
                          className="flex items-center justify-between p-4"
                        >
                          {editingId === type.id ? (
                            <div className="flex items-center gap-2 flex-1">
                              <Input
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="h-full"
                                autoComplete="off"
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditSave(type.id)}
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleEditCancel}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <span className="font-medium">{type.name}</span>
                          )}

                          {editingId !== type.id && (
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditStart(type)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(type.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
