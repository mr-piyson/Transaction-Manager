"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Trash } from "lucide-react";
import { toast } from "sonner";
import { createVehicle } from "./Vehicles.actions";

// Validation schema using Zod
export const Vehicle = z.object({
  vehicleNo: z.string().nonempty("Vehicle No is required"),
  type: z.string().nonempty("Type is required"),
  driver: z.string().nonempty("Driver / Operator is required"),
  mechanic: z.string().nonempty("Mechanic is required"),
});

export function AddVehicle(props: {
  mutate: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const form = useForm<z.infer<typeof Vehicle>>({
    resolver: zodResolver(Vehicle),
    defaultValues: {
      vehicleNo: "",
      type: "",
      driver: "",
      mechanic: "",
    },
  });

  const handleTypeChange = (value: string) => {
    form.setValue("type", value);
  };

  // Handle form submission
  const onSubmit = async (data: z.infer<typeof Vehicle>) => {
    setLoading(true);

    const res = await createVehicle(data);

    if ("error" in res) {
      setLoading(false);
      toast.error("Error", {
        description: res.error,
      });
    } else {
      // Simulate API call
      setLoading(false);
      form.reset();
      setOpen(false);

      props.mutate(); // Call the mutate function to refresh data
      toast.success("Account created successfully!", {
        description: "You can now log in with your new account.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{props.children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogTitle>Create New Vehicle</DialogTitle>

            <div className="flex flex-col gap-4 h-full p-4">
              {/* Vehicle Number */}
              <FormField
                control={form.control}
                name="vehicleNo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehicle No </FormLabel>
                    <FormControl>
                      <Input
                        id="vehicleNo"
                        type="text"
                        className="border-1 border-muted-foreground/50"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage>
                      {form.formState.errors.vehicleNo?.message}
                    </FormMessage>
                  </FormItem>
                )}
              />

              {/* Driver */}
              <FormField
                control={form.control}
                name="driver"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Driver</FormLabel>
                    <FormControl>
                      <Input
                        id="driver"
                        type="text"
                        className="border-1 border-muted-foreground/50"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage>
                      {form.formState.errors.driver?.message}
                    </FormMessage>
                  </FormItem>
                )}
              />

              {/* mechanic */}
              <FormField
                control={form.control}
                name="mechanic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mechanic</FormLabel>
                    <FormControl>
                      <Input
                        id="mechanic"
                        type="text"
                        className="border-1 border-muted-foreground/50"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage>
                      {form.formState.errors.mechanic?.message}
                    </FormMessage>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehicle Type</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        form.clearErrors("type");
                      }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="h-full w-full ">
                          <SelectValue placeholder="Select service type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Passenger Car">
                          Passenger Car
                        </SelectItem>
                        <SelectItem value="Motorcycle">Motorcycle</SelectItem>
                        <SelectItem value="Bus">Bus</SelectItem>
                        <SelectItem value="Commercial Vehicle">
                          Commercial Vehicle
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="h-5" />
                  </FormItem>
                )}
              />
              <DialogFooter className="mt-5">
                <Button
                  disabled={loading}
                  type="submit"
                  className="w-full font-bold"
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    "Save"
                  )}
                </Button>
              </DialogFooter>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
