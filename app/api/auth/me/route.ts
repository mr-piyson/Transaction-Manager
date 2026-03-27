import { getCurrentUser } from '@/server/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, ctx: RouteContext<'/api/auth/me'>) {
  try {
    const user = await getCurrentUser();

    if (user === null) {
      return NextResponse.json({ error: 'User not found' }, { status: 400 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
