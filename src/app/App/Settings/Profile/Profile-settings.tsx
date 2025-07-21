"use client";

import { useEffect } from "react"; // No need for useState for currency here anymore
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { CurrencySelector } from "@/components/Currency-Selector"; // Assuming this component handles value and onChange correctly
import useSWR from "swr";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateSettings } from "./Profile.actions"; // Assuming this action is correct and available

// Define the schema for the form data (what react-hook-form will manage)
const CompanyProfileSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  address: z.string().min(1, "Company address is required"),
  contactNumber: z.string().min(1, "Contact number is required"),
  currency: z.string().min(1, "Currency is required"),
});

type CompanyProfileForm = z.infer<typeof CompanyProfileSchema>;

// Define the type for the data fetched from the API (assuming it's an array of name-value pairs)
type ApiSetting = {
  name: string;
  value: string;
};

export function ProfileSettings() {
  // Use SWR to fetch settings data. It's expected to return an array of ApiSetting objects.
  const {
    data: apiSettings, // Renamed to avoid conflict with form 'data'
    error,
    mutate, // Function to revalidate SWR cache
    isLoading: isFetching,
  } = useSWR<ApiSetting[]>(`/api/settings`, async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) {
      // Throw an error to be caught by SWR's error handling
      const errorData = await res.json();
      throw new Error(errorData.message || "Failed to fetch profile settings");
    }
    return res.json();
  });

  // Initialize react-hook-form
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty }, // isDirty helps enable/disable buttons based on changes
    reset, // Function to reset form values
    setValue, // Function to set individual form values
    watch, // Function to watch a specific form field's value
  } = useForm<CompanyProfileForm>({
    resolver: zodResolver(CompanyProfileSchema),
    // Set initial default values. These will be overwritten by fetched data later via `reset()`.
    defaultValues: {
      name: "",
      address: "",
      contactNumber: "",
      currency: "USD", // A sensible default while waiting for data
    },
  });

  // Watch the currency field to pass its value to the CurrencySelector component
  const currentCurrency = watch("currency");

  // Effect to populate the form once API settings are fetched
  useEffect(() => {
    // Ensure apiSettings is available and is an array before attempting to populate the form
    if (apiSettings && Array.isArray(apiSettings) && apiSettings.length > 0) {
      const transformedData: CompanyProfileForm = {
        name:
          apiSettings.find((item) => item.name === "companyName")?.value || "",
        address:
          apiSettings.find((item) => item.name === "companyAddress")?.value ||
          "",
        contactNumber:
          apiSettings.find((item) => item.name === "companyPhone")?.value || "",
        currency:
          apiSettings.find((item) => item.name === "companyCurrency")?.value ||
          "USD", // Default to USD if currency not found
      };
      // Use `reset` to set all form values at once to the fetched data.
      // This also resets the `isDirty` state.
      reset(transformedData);
    }
  }, [apiSettings, reset]); // `reset` from react-hook-form is stable and won't cause infinite loops

  // Handler for form submission
  const onSubmit = async (formData: CompanyProfileForm) => {
    // Format the form data back into the ApiSetting[] format for the updateSettings action
    const formattedData: ApiSetting[] = [
      { name: "companyName", value: formData.name },
      { name: "companyAddress", value: formData.address },
      { name: "companyPhone", value: formData.contactNumber },
      { name: "companyCurrency", value: formData.currency },
    ];

    try {
      // Call the update action
      await updateSettings(formattedData);
      toast.success("Profile settings updated successfully");
      // Revalidate SWR cache. When new data is fetched, the useEffect will automatically
      // call `reset()` with the updated data, ensuring the form reflects the latest state.
      mutate();
    } catch (err: any) {
      console.error("Error updating profile settings:", err);
      toast.error(
        err.message || "Error updating profile settings. Please try again."
      );
    }
  };

  // Handles resetting the form to the last fetched state or initial defaults
  const handleCancel = () => {
    if (apiSettings && Array.isArray(apiSettings) && apiSettings.length > 0) {
      // If settings were loaded, reset to those values
      const transformedData: CompanyProfileForm = {
        name:
          apiSettings.find((item) => item.name === "companyName")?.value || "",
        address:
          apiSettings.find((item) => item.name === "companyAddress")?.value ||
          "",
        contactNumber:
          apiSettings.find((item) => item.name === "companyPhone")?.value || "",
        currency:
          apiSettings.find((item) => item.name === "companyCurrency")?.value ||
          "USD",
      };
      reset(transformedData);
    } else {
      // If apiSettings was never loaded (e.g., initially, or after an error), reset to initial default values
      reset({
        name: "",
        address: "",
        contactNumber: "",
        currency: "USD",
      });
    }
  };

  // Show a loading spinner if data is being fetched and no previous data is available
  if (isFetching && !apiSettings) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        <span className="sr-only">Loading settings...</span>
      </div>
    );
  }

  // Show an error message if fetching failed
  if (error) {
    return (
      <div className="text-red-500 text-center py-8">
        Error loading profile settings:{" "}
        {error.message || "An unknown error occurred."}
      </div>
    );
  }

  // Render the form once data is loaded or if there's no data but no error
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Company Profile Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your company profile and preferences
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card className="shadow-sm">
          <CardContent className="space-y-6 pt-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <Avatar className="h-20 w-20 border">
                <AvatarImage alt="Company Logo" />
                <AvatarFallback className="text-lg">CO</AvatarFallback>
              </Avatar>
              <Button type="button" variant="outline">
                Change Logo {/* Placeholder for logo upload functionality */}
              </Button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Company Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter company name"
                    {...register("name")}
                    autoComplete="off"
                    autoCorrect="off"
                  />
                  {errors.name && (
                    <p className="text-red-500 text-sm">
                      {errors.name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Company Address</Label>
                  <Input
                    id="address"
                    placeholder="Enter company address"
                    {...register("address")}
                    autoComplete="off"
                    autoCorrect="off"
                  />
                  {errors.address && (
                    <p className="text-red-500 text-sm">
                      {errors.address.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactNumber">Contact Number</Label>
                  <Input
                    id="contactNumber"
                    type="text"
                    placeholder="+973 173789"
                    {...register("contactNumber")}
                    autoComplete="off"
                    autoCorrect="off"
                  />
                  {errors.contactNumber && (
                    <p className="text-red-500 text-sm">
                      {errors.contactNumber.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Company Currency</Label>
                  <CurrencySelector
                    value={currentCurrency} // The CurrencySelector now reads its value directly from the form state
                    onChange={(value) => {
                      // When CurrencySelector changes, update the form state
                      setValue("currency", value, { shouldDirty: true }); // Mark the form as dirty
                    }}
                  />
                  {errors.currency && (
                    <p className="text-red-500 text-sm">
                      {errors.currency.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting || !isDirty} // Disable if submitting or no changes made
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !isDirty}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
