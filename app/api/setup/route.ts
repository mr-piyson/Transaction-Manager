import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs'; // Install this: npm install bcryptjs @types/bcryptjs
import db from '@/lib/database';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      orgName,
      website,
      adminFirstName,
      adminLastName,
      adminEmail,
      adminPassword,
      currency,
      language,
    } = body;

    // 1. Check if organization already exists to prevent double-setup
    const existingOrg = await db.organization.findFirst();
    if (existingOrg) {
      return NextResponse.json({ error: 'System already configured' }, { status: 400 });
    }

    // 2. Hash the password
    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    // 3. Execute Transaction
    const result = await db.$transaction(async (tx) => {
      // Create Organization
      const organization = await tx.organization.create({
        data: {
          name: orgName,
          website: website,
          currency: currency,
        },
      });

      // Create Super Admin User linked to Org
      const admin = await tx.user.create({
        data: {
          email: adminEmail,
          firstName: adminFirstName,
          lastName: adminLastName,
          passwordHash: hashedPassword,
          role: 'SUPER_ADMIN',
          organizationId: organization.id,
        },
      });

      return { organization, admin };
    });

    return NextResponse.json(
      {
        success: true,
        message: 'System initialized successfully',
        orgId: result.organization.id,
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error('SETUP_ERROR:', error);
    return NextResponse.json(
      {
        error: 'Failed to complete setup',
        details: error.message,
      },
      { status: 500 },
    );
  }
}
