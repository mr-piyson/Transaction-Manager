import { ApiResponse } from '@/lib/server';
import { SignUpSchema } from '@/lib/validators/auth';
import { signIn, signUp } from '@/server/auth';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest, ctx: RouteContext<'/api/auth/signout'>) {
  try {
    // Validate Input
    const result = SignUpSchema.safeParse(req.json());
    if (!result.success) return ApiResponse.validationError(result.error);
    const body = result.data;
    // handle sign up logic
    const user = await signUp(body);
    return ApiResponse.success(user);
  } catch (error) {
    console.error(error);
    return ApiResponse.serverError();
  }
}
