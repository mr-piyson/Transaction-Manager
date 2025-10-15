"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { auth } from "@/lib/auth-client";

export const SignInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export default function SignInTab() {
  const [loading, setLoading] = useState(false);
  const form = useForm<z.infer<typeof SignInSchema>>({
    resolver: zodResolver(SignInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(formData: z.infer<typeof SignInSchema>) {
    setLoading(true);
    const res = await auth.signIn.email({
      email: formData.email,
      password: formData.password,
      callbackURL: "/App",
    });

    if (res.error) {
      toast.error(res.error.message); // Show an error message
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Sign In</CardTitle>
        <CardDescription>
          Sign in or create an account to begin managing your finances.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-2">
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
                      placeholder="user@example.com"
                      className="border-1 border-muted-foreground/50"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage>
                    {form.formState.errors.email?.message}
                  </FormMessage>
                </FormItem>
              )}
            ></FormField>
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
            ></FormField>
          </CardContent>
          <CardFooter className="mt-5">
            <Button
              disabled={loading}
              type="submit"
              className="w-full font-bold"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {!loading && "Sign In"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
