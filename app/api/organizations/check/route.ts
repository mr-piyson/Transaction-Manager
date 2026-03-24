import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import db from '@/lib/database';

export async function GET() {
  try {
    const orgCount = await db.organization.count();
    return NextResponse.json({ hasOrganization: orgCount > 0 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to check organization status' }, { status: 500 });
  }
}
