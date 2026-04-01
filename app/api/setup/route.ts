import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { auth } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const {
      orgName,
      slug,
      website,
      adminFirstName,
      adminLastName,
      adminEmail,
      adminPassword,
      currency,
    } = await req.json();

    // 1. Check if organization already exists to prevent double-setup
    const existingOrg = await db.organization.findFirst();
    if (existingOrg) {
      return NextResponse.json({ error: 'System already configured' }, { status: 400 });
    }

    // 2. Create Organization
    const organization = await db.organization.create({
      data: {
        name: orgName,
        slug: slug,
        website: website,
        currency: currency,
      },
    });

    // 3. Create Super Admin User via Better Auth
    const userResult = await auth.api.signUpEmail({
      body: {
        email: adminEmail,
        password: adminPassword,
        name: `${adminFirstName} ${adminLastName}`,
        firstName: adminFirstName,
        lastName: adminLastName,
        role: 'SUPER_ADMIN',
        organizationId: organization.id,
      },
    });

    if (!userResult) {
      return NextResponse.json({ error: 'Failed to create admin user' }, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        message: 'System initialized successfully',
        orgId: organization.id,
        slug: organization.slug,
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
