import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import db from '@/lib/database';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, address, website } = body;

    const organization = await db.organization.create({
      data: { name, address, website },
    });

    return NextResponse.json(organization, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create organization' },
      { status: 500 },
    );
  }
}
