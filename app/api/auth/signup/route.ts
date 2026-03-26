import { ApiResponse } from '@/lib/server';
import { SignUpSchema } from '@/lib/validators/auth';
import { signUp } from '@/server/auth';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest, ctx: RouteContext<'/api/auth/signup'>) {
  try {
    // Validate Input
    const body = await req.json();
    const result = SignUpSchema.safeParse(body);
    if (!result.success) return ApiResponse.validationError(result.error);
    // handle sign up logic
    const user = await signUp(body);
    return ApiResponse.success(user);
  } catch (error) {
    console.error(error);
    return ApiResponse.serverError();
  }
}
