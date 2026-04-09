'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { trpc } from '@/lib/trpc/client';
import { useRouter } from 'next/navigation';
import { authClient, signIn } from '@/auth/auth-client';
import { useState } from 'react';

export const SignInSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
});

export default function SignInTab() {
  const router = useRouter();

  const [isPending, setIsLoading] = useState(false);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    const { data, error } = await authClient.signIn.email({
      email,
      password,
    });
    setIsLoading(false);

    if (data) {
      router.push('/app');
    }

    if (error) console.error(error.message);
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof SignInSchema>>({
    resolver: zodResolver(SignInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(data: z.infer<typeof SignInSchema>) {
    await login(data.email, data.password);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Sign In</CardTitle>
        <CardDescription>
          Sign in or create an account to begin managing your finances.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-2">
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              className="border border-muted-foreground/50"
              {...register('email')}
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <Input
              id="password"
              type="password"
              className="border border-muted-foreground/50"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="mt-5">
          <Button disabled={isPending} type="submit" className="w-full font-bold">
            {isPending && <Spinner />}
            {!isPending && 'Sign In'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
