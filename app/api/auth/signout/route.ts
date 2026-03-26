import { ApiResponse } from '@/lib/server';
import { signOut } from '@/server/auth';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest, ctx: RouteContext<'/api/auth/signup'>) {
  try {
    const user = await signOut();
    return ApiResponse.success(user);
  } catch (error) {
    console.error(error);
    return ApiResponse.serverError();
  }
}
