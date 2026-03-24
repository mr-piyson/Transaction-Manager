import { ApiResponse } from '@/lib/server';
import { SignInSchema } from '@/lib/validators/auth';
import { signIn } from '@/server/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest, ctx: RouteContext<'/api/auth/signin'>) {
  try {
    // Validate Input
    const result = SignInSchema.safeParse(req.json());
    if (!result.success) return ApiResponse.validationError(result.error);
    const body = result.data;
    // handle sign in logic
    const user = await signIn(body);
    return ApiResponse.success(user);
  } catch (error) {
    console.error(error);
    return ApiResponse.serverError();
  }
}
