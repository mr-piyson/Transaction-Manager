import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import db from '@/lib/db';

export async function GET() {
  try {
    const orgCount = await db.organization.count();
    return NextResponse.json({ hasOrganization: orgCount > 0 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to check organization status' }, { status: 500 });
  }
}
