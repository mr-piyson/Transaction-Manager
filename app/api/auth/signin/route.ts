import { ApiResponse } from '@/lib/server';
import { SignInSchema } from '@/lib/validators/auth';
import { signIn } from '@/server/auth';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest, ctx: RouteContext<'/api/auth/signin'>) {
  try {
    // Validate Input
    const body = await req.json();
    const result = SignInSchema.safeParse(body);
    if (!result.success) return ApiResponse.validationError(result.error);
    // handle sign in logic
    const user = await signIn(body);
    return ApiResponse.success(user);
  } catch (error) {
    console.error(error);
    return ApiResponse.serverError();
  }
}
