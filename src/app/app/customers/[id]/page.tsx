"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Customers } from "@prisma/client";
import { useToolbar } from "@/hooks/use-toolbar";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import axios from "axios";
import { cn } from "@/lib/utils";

async function fetchEmployee(id: string) {
  const response = await fetch(`/api/customers/${id}`);
  if (!response.ok) {
    throw new Error("Failed to fetch employee");
  }
  return response.json();
}

async function updateEmployee(id: string, data: Partial<Customers>) {
  const response = axios.patch(`/api/customers/${id}`, data);
  if (!(await response).status) {
    toast.error("Failed to update employee", {
      description: "Check you network connection ",
    });
    throw new Error("Failed to update employee");
  }
  return (await response).data;
}

async function deleteEmployee(id: string) {
  const response = await fetch(`/api/customers/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to delete employee");
  }
  return response.json();
}

function EditableField({
  icon,
  label,
  value,
  isEditing,
  onChange,
  multiline = false,
  type = "text",
}: {
  icon: string;
  label: string;
  value: string | null | undefined;
  isEditing: boolean;
  onChange: (value: string) => void;
  multiline?: boolean;
  type?: string;
}) {
  if (!value && !isEditing) return null;

  return (
    <div className="flex items-start gap-3">
      <svg className={cn(icon, "h-4 w-4 text-muted-foreground mt-0.5 shrink-0")} />
      <div className="space-y-1 flex-1">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {isEditing ? (
          multiline ? (
            <Textarea value={value || ""} onChange={e => onChange(e.target.value)} className="min-h-[60px] resize-none" />
          ) : (
            <Input type={type} value={value || ""} onChange={e => onChange(e.target.value)} className="h-8" />
          )
        ) : (
          <p className="text-sm py-1">{value}</p>
        )}
      </div>
    </div>
  );
}

export default function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const toolbar = useToolbar();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<Partial<Customers>>({});

  const {
    data: employee,
    isLoading: employeeLoading,
    error: employeeError,
  } = useQuery<Customers>({
    queryKey: ["customer", id],
    queryFn: () => fetchEmployee(id),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Customers>) => updateEmployee(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", id] });
      setIsEditing(false);
      toast.success("Employee updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteEmployee(id),
    onSuccess: () => {
      toast.success("Employee deleted successfully");
      router.push("/app/customers");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  useEffect(() => {
    if (employee) {
      setEditedData(employee);
    }
  }, [employee]);

  useEffect(() => {
    toolbar.setSlot(
      <div className="flex items-center gap-4 w-full justify-between">
        <div className="flex items-center gap-4">
          <Link href="/app/customers">
            <Button variant="ghost" size="icon">
              <svg className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="max-w-[150px] sm:max-w-[200px] md:max-w-none font-bold tracking-tight truncate text-nowrap">Employee Details</h1>
        </div>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsEditing(false);
                  setEditedData(employee || {});
                }}
              >
                <svg className="h-4 w-4 ps-2" />
                Cancel
              </Button>
              <Button size="sm" onClick={() => updateMutation.mutate(editedData)} disabled={updateMutation.isPending}>
                <svg className="h-4 w-4 ps-2" />
                Save
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <svg className="h-4 w-4 ps-2" />
                Edit
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (confirm("Are you sure you want to delete this employee?")) {
                    deleteMutation.mutate();
                  }
                }}
                disabled={deleteMutation.isPending}
              >
                <svg className="h-4 w-4 ps-2" />
                Delete
              </Button>
            </>
          )}
        </div>
      </div>
    );
    return () => {
      toolbar.clearSlot();
    };
  }, [isEditing, editedData, updateMutation.isPending, deleteMutation.isPending]);

  if (employeeError) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center text-destructive">Error loading employee: {(employeeError as Error).message}</div>
      </div>
    );
  }

  if (employeeLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-40" />
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-6">
              <Skeleton className="h-32 w-32 rounded-full" />
              <div className="flex-1 space-y-4">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Customer not found</div>
      </div>
    );
  }

  return (
    <div className="container flex flex-col h-full mx-auto p-6 space-y-6">
      {/* Header Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row sm:items-start gap-6 items-center h-full">
            <Avatar className="h-32 w-32 border-4 border-border">
              <AvatarImage src={`http://intranet.bfginternational.com:88/storage/employee/${employee.image}`} alt={editedData.name || employee.name || ""} style={{ objectFit: "cover" }} />
              <AvatarFallback className="text-3xl">{(editedData.name || employee.name)?.charAt(0)}</AvatarFallback>
            </Avatar>

            <div className="flex flex-1 flex-col space-y-4 h-full">
              <div className="space-y-2">
                {isEditing ? (
                  <Input value={editedData.name || ""} onChange={e => setEditedData({ ...editedData, name: e.target.value })} className="text-2xl sm:text-4xl font-bold h-auto py-2" />
                ) : (
                  <h2 className="sm:text-4xl text-2xl font-bold">{editedData.name}</h2>
                )}
                <p className="text-muted-foreground">
                  {employee.code} • {employee.id}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <EditableField icon={""} label="Email" value={editedData.email} isEditing={isEditing} onChange={value => setEditedData({ ...editedData, email: value })} type="email" />
            <EditableField icon={""} label="Mobile" value={editedData.phone} isEditing={isEditing} onChange={value => setEditedData({ ...editedData, phone: value })} type="tel" />
            <EditableField icon={""} label="Address" value={editedData.address} isEditing={isEditing} onChange={value => setEditedData({ ...editedData, address: value })} multiline />
          </CardContent>
        </Card>

        {/* List of Deals */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Records</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <EditableField icon={""} label="Email" value={editedData.email} isEditing={isEditing} onChange={value => setEditedData({ ...editedData, email: value })} type="email" />
            <EditableField icon={""} label="Mobile" value={editedData.phone} isEditing={isEditing} onChange={value => setEditedData({ ...editedData, phone: value })} type="tel" />
            <EditableField icon={""} label="Address" value={editedData.address} isEditing={isEditing} onChange={value => setEditedData({ ...editedData, address: value })} multiline />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
