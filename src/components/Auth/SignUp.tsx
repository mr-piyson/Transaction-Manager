"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { User } from "lucide-react";
import type React from "react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { Spinner } from "../ui/spinner";

// SIGN UP SCHEMA
export const SignUpSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z.email("Please enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
    image: z.string().optional(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof SignUpSchema>;

export default function SignUpTab() {
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // const [loading, setLoading] = useState(false);
  const { signUp, isPending: loading } = useAuth();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(SignUpSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      image: undefined,
    },
  });

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (1MB = 1048576 bytes)
    if (file.size > 1048576) {
      alert("Avatar image must be less than 1MB");
      return;
    }

    // Check file type
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      return;
    }

    // Convert image to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setValue("image", base64);
      setAvatarPreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = async (data: FormData) => {
    await signUp(data);
  };

  return (
    <Card className="gap-0">
      <div className="flex flex-row px-6 pt-6 justify-between items-start">
        <div className="space-y-1">
          <CardTitle className="text-2xl font-bold">Sign Up</CardTitle>
          <CardDescription>Create an account to get started</CardDescription>
        </div>

        <div className="flex flex-col items-center space-y-2">
          <div className="relative group cursor-pointer hover:outline-5 hover:outline-blue-500 rounded-full" onClick={handleAvatarClick}>
            <Avatar className="w-24 h-24 border-transparent">
              {avatarPreview ? (
                <AvatarImage src={avatarPreview} className="object-cover" alt="Avatar preview" />
              ) : (
                <AvatarFallback className="bg-card border-3 border-muted-foreground/50">
                  <User className="w-12 h-12 text-accent-foreground/50" />
                </AvatarFallback>
              )}
            </Avatar>

            <div className="absolute inset-0 flex items-center justify-center bg-background bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              <i className="icon-[line-md--cloud-alt-upload-filled] text-6xl opacity-50" />
            </div>
          </div>

          <Input ref={fileInputRef} id="image" type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />

          <p className="text-xs text-center text-gray-500">Max size: 1MB</p>
        </div>
      </div>

      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name Field */}
          <div className="grid gap-2">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" {...register("name")} className={`border ${errors.name ? "border-red-500" : "border-muted-foreground/50"}`} />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>
          {/* Email Field */}
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("email")} className={`border ${errors.email ? "border-red-500" : "border-muted-foreground/50"}`} />
            {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
          </div>
          {/* Password Field */}
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" {...register("password")} className={`border ${errors.password ? "border-red-500" : "border-muted-foreground/50"}`} />
            {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
          </div>
          {/* Confirm Password Field */}
          <div className="grid gap-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input id="confirmPassword" type="password" {...register("confirmPassword")} className={`border-1 ${errors.confirmPassword ? "border-red-500" : "border-muted-foreground/50"}`} />
            {errors.confirmPassword && <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>}
          </div>

          <Button disabled={loading} type="submit" className="w-full font-bold">
            {loading && <Spinner className="ps-2 h-4 w-4 " />}
            {!loading && "Sign Up"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
