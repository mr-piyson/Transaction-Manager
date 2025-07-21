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
import { createAccount, deleteAccount } from "./Accounts.actions";
import { Alert_Dialog } from "@/components/Alert_Dialog";
import { Account } from "@prisma/client";

// Validation schema using Zod
export const SignInSchema = z
  .object({
    name: z.string().nonempty("Name is required"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z
      .string()
      .min(6, "Password must be at least 6 characters"),
    role: z.enum(["User", "Admin"]),
    image: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export function AddAccount(props: {
  mutate: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const form = useForm<z.infer<typeof SignInSchema>>({
    resolver: zodResolver(SignInSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "User",
      image: undefined,
    },
  });

  // Handle form submission
  const onSubmit = async (data: z.infer<typeof SignInSchema>) => {
    setLoading(true);

    const res = await createAccount(data);

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

  // Handle role change
  const handleRoleChange = (value: "User" | "Admin") => {
    form.setValue("role", value);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{props.children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogTitle>Create New Account</DialogTitle>

            <div className="flex flex-col gap-4 h-full p-4">
              {/* Full Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input
                        id="name"
                        type="text"
                        className="border-1 border-muted-foreground/50"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage>
                      {form.formState.errors.name?.message}
                    </FormMessage>
                  </FormItem>
                )}
              />

              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        id="email"
                        type="email"
                        className="border-1 border-muted-foreground/50"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage>
                      {form.formState.errors.email?.message}
                    </FormMessage>
                  </FormItem>
                )}
              />

              {/* Password */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        id="password"
                        type="password"
                        className="border-1 border-muted-foreground/50"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage>
                      {form.formState.errors.password?.message}
                    </FormMessage>
                  </FormItem>
                )}
              />

              {/* Confirm Password */}
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input
                        id="confirmPassword"
                        type="password"
                        className="border-1 border-muted-foreground/50"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage>
                      {form.formState.errors.confirmPassword?.message}
                    </FormMessage>
                  </FormItem>
                )}
              />

              {/* Role */}
              <Label htmlFor="role">Role</Label>
              <Select
                onValueChange={handleRoleChange}
                defaultValue={form.getValues("role")}
              >
                <SelectTrigger
                  id="role"
                  className="w-full bg-card border-1 border-muted-foreground/50"
                >
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Administrator</SelectItem>
                  <SelectItem value="User">User</SelectItem>
                </SelectContent>
              </Select>
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

export function DeleteAccount({
  mutate,
  selectedAccount,
}: {
  mutate: () => void;
  selectedAccount: Account;
}) {
  return (
    <Alert_Dialog
      title={"Are You Sure ?"}
      variant="destructive"
      description={"This action will remove the user and cannot be undone. "}
      onConfirm={async () => {
        if (selectedAccount) {
          await deleteAccount(selectedAccount.id);
          mutate();
        }
      }}
      confirmText={"Delete"}
    >
      <Button
        variant={"destructive"}
        className=" bg-transparent hover:bg-background hover:text-destructive-foreground border-2"
      >
        <Trash />
        <span className=" max-sm:hidden me-2 ">Delete</span>
      </Button>
    </Alert_Dialog>
  );
}
