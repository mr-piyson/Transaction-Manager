import { z } from 'zod';
import { auth } from '@/auth/auth-server';
import { ConflictError } from '@/lib/error';
import { publicProcedure, t } from '@/lib/trpc/context';
import { currencyCodeSchema, validateEmail, validatePassword } from '@/lib/validations';
import { seedRoles, seedPermissions, seedCurrencies } from '../../prisma/seed/index';

// ─── Input schema ────────────────────────────────────────────────────────────

export const setupSchema = z.object({
  language: z.enum(['en', 'ar']).default('en'),
  currency: currencyCodeSchema,
  orgName: z.string().min(2, 'Organization name is required'),
  slug: z
    .string()
    .min(3, 'Slug must be at least 3 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  website: z.string().url().optional().or(z.literal('')),
  adminFirstName: z.string().min(2, 'First name is required'),
  adminLastName: z.string().optional().default(''),
  adminEmail: validateEmail(),
  adminPassword: validatePassword({ minLength: 6, requireUppercase: false, requireSpecialChar: false }),
});

export type SetupInput = z.infer<typeof setupSchema>;

// ─── Seed data ────────────────────────────────────────────────────────────────

const CHART_OF_ACCOUNTS = [
  { code: '1010', name: 'Cash & Cash Equivalents',               type: 'ASSET' as const,     normalBalance: 'DEBIT' as const, isSystemAccount: true },
  { code: '1020', name: 'Bank Account',                            type: 'ASSET' as const,     normalBalance: 'DEBIT' as const, isSystemAccount: true },
  { code: '1030', name: 'Petty Cash',                              type: 'ASSET' as const,     normalBalance: 'DEBIT' as const, isSystemAccount: false },
  { code: '1100', name: 'Accounts Receivable',                     type: 'ASSET' as const,     normalBalance: 'DEBIT' as const, isSystemAccount: true },
  { code: '1200', name: 'Inventory',                               type: 'ASSET' as const,     normalBalance: 'DEBIT' as const, isSystemAccount: true },
  { code: '1300', name: 'Prepaid Expenses',                        type: 'ASSET' as const,     normalBalance: 'DEBIT' as const, isSystemAccount: false },
  { code: '1400', name: 'Fixed Assets',                            type: 'ASSET' as const,     normalBalance: 'DEBIT' as const, isSystemAccount: false },
  { code: '1410', name: 'Accumulated Depreciation',                type: 'CONTRA_ASSET' as const, normalBalance: 'CREDIT' as const, isSystemAccount: false },
  { code: '2010', name: 'Accounts Payable',                        type: 'LIABILITY' as const, normalBalance: 'CREDIT' as const, isSystemAccount: true },
  { code: '2020', name: 'Accrued Liabilities',                     type: 'LIABILITY' as const, normalBalance: 'CREDIT' as const, isSystemAccount: false },
  { code: '2030', name: 'Tax Payable',                             type: 'LIABILITY' as const, normalBalance: 'CREDIT' as const, isSystemAccount: true },
  { code: '2100', name: 'VAT Payable',                             type: 'LIABILITY' as const, normalBalance: 'CREDIT' as const, isSystemAccount: true },
  { code: '2200', name: 'Wages Payable',                           type: 'LIABILITY' as const, normalBalance: 'CREDIT' as const, isSystemAccount: false },
  { code: '2300', name: 'Deferred Revenue',                        type: 'LIABILITY' as const, normalBalance: 'CREDIT' as const, isSystemAccount: false },
  { code: '2400', name: 'Short-term Loans',                        type: 'LIABILITY' as const, normalBalance: 'CREDIT' as const, isSystemAccount: false },
  { code: '2500', name: 'Long-term Loans',                         type: 'LIABILITY' as const, normalBalance: 'CREDIT' as const, isSystemAccount: false },
  { code: '3010', name: "Owner's Capital",                         type: 'EQUITY' as const,    normalBalance: 'CREDIT' as const, isSystemAccount: true },
  { code: '3020', name: 'Retained Earnings',                       type: 'EQUITY' as const,    normalBalance: 'CREDIT' as const, isSystemAccount: true },
  { code: '3030', name: 'Current Year Earnings',                   type: 'EQUITY' as const,    normalBalance: 'CREDIT' as const, isSystemAccount: true },
  { code: '3100', name: 'Drawings',                                type: 'EQUITY' as const,    normalBalance: 'DEBIT' as const, isSystemAccount: false },
  { code: '4010', name: 'Sales Revenue',                           type: 'REVENUE' as const,   normalBalance: 'CREDIT' as const, isSystemAccount: true },
  { code: '4020', name: 'Service Revenue',                         type: 'REVENUE' as const,   normalBalance: 'CREDIT' as const, isSystemAccount: true },
  { code: '4030', name: 'Sales Returns',                           type: 'CONTRA_REVENUE' as const, normalBalance: 'DEBIT' as const, isSystemAccount: false },
  { code: '4040', name: 'Discounts Allowed',                       type: 'CONTRA_REVENUE' as const, normalBalance: 'DEBIT' as const, isSystemAccount: false },
  { code: '4050', name: 'Other Income',                            type: 'REVENUE' as const,   normalBalance: 'CREDIT' as const, isSystemAccount: false },
  { code: '5010', name: 'Cost of Goods Sold',                      type: 'EXPENSE' as const,   normalBalance: 'DEBIT' as const, isSystemAccount: true },
  { code: '5020', name: 'Salaries & Wages',                        type: 'EXPENSE' as const,   normalBalance: 'DEBIT' as const, isSystemAccount: false },
  { code: '5030', name: 'Rent Expense',                            type: 'EXPENSE' as const,   normalBalance: 'DEBIT' as const, isSystemAccount: false },
  { code: '5040', name: 'Utilities Expense',                       type: 'EXPENSE' as const,   normalBalance: 'DEBIT' as const, isSystemAccount: false },
  { code: '5050', name: 'Office Supplies',                         type: 'EXPENSE' as const,   normalBalance: 'DEBIT' as const, isSystemAccount: false },
  { code: '5060', name: 'Marketing & Advertising',                 type: 'EXPENSE' as const,   normalBalance: 'DEBIT' as const, isSystemAccount: false },
  { code: '5070', name: 'Travel Expense',                          type: 'EXPENSE' as const,   normalBalance: 'DEBIT' as const, isSystemAccount: false },
  { code: '5080', name: 'Depreciation Expense',                    type: 'EXPENSE' as const,   normalBalance: 'DEBIT' as const, isSystemAccount: false },
  { code: '5090', name: 'Professional Fees',                       type: 'EXPENSE' as const,   normalBalance: 'DEBIT' as const, isSystemAccount: false },
  { code: '5100', name: 'Insurance Expense',                       type: 'EXPENSE' as const,   normalBalance: 'DEBIT' as const, isSystemAccount: false },
  { code: '5110', name: 'Maintenance & Repairs',                   type: 'EXPENSE' as const,   normalBalance: 'DEBIT' as const, isSystemAccount: false },
  { code: '5120', name: 'Bank Charges',                            type: 'EXPENSE' as const,   normalBalance: 'DEBIT' as const, isSystemAccount: false },
  { code: '5130', name: 'Telephone & Internet',                    type: 'EXPENSE' as const,   normalBalance: 'DEBIT' as const, isSystemAccount: false },
  { code: '5140', name: 'Tax Expense',                             type: 'EXPENSE' as const,   normalBalance: 'DEBIT' as const, isSystemAccount: false },
  { code: '5150', name: 'Miscellaneous Expense',                   type: 'EXPENSE' as const,   normalBalance: 'DEBIT' as const, isSystemAccount: false },
];

const DEFAULT_TAX_RATES = [
  { name: 'Zero Rated (0%)',  rate: 0,    isDefault: false },
  { name: 'Standard (10%)',   rate: 10,   isDefault: true  },
  { name: 'Exempt',           rate: 0,    isDefault: false },
];

const DEFAULT_UNITS = [
  { name: 'Pieces',  code: 'pcs' },
  { name: 'Box',     code: 'box' },
  { name: 'Kilogram',code: 'kg'  },
  { name: 'Gram',    code: 'g'   },
  { name: 'Liter',   code: 'L'   },
  { name: 'Meter',   code: 'm'   },
  { name: 'Hour',    code: 'hr'  },
  { name: 'Day',     code: 'day' },
  { name: 'Service', code: 'srv' },
  { name: 'Pack',    code: 'pk'  },
];

const DEFAULT_EMPLOYEE_TYPES = [
  { name: 'Full-Time',  code: 'FT'   },
  { name: 'Part-Time',  code: 'PT'   },
  { name: 'Contract',   code: 'CT'   },
  { name: 'Intern',     code: 'IN'   },
  { name: 'Temporary',  code: 'TEMP' },
  { name: 'Free Visa',  code: 'FV'   },
  { name: 'Outsourced', code: 'OS'   },
];

const DEFAULT_LEAVE_TYPES = [
  { name: 'Annual Leave',        code: 'ANNUAL',    daysPerYear: 30, isPaid: true  },
  { name: 'Sick Leave',          code: 'SICK',      daysPerYear: 15, isPaid: true  },
  { name: 'Emergency Leave',     code: 'EMERGENCY', daysPerYear: 5,  isPaid: true  },
  { name: 'Maternity Leave',     code: 'MATERNITY', daysPerYear: 60, isPaid: true  },
  { name: 'Personal Leave',      code: 'PERSONAL',  daysPerYear: 10, isPaid: false },
  { name: 'Hajj Leave',          code: 'HAJJ',      daysPerYear: 15, isPaid: true  },
  { name: 'Unpaid Leave',        code: 'UNPAID',    daysPerYear: 0,  isPaid: false },
];

const DEFAULT_SHIFTS = [
  { name: 'Morning',   startTime: '08:00', endTime: '16:00', color: '#3b82f6' },
  { name: 'Evening',   startTime: '16:00', endTime: '00:00', color: '#8b5cf6' },
  { name: 'Night',     startTime: '00:00', endTime: '08:00', color: '#1e293b' },
  { name: 'Flexible',  startTime: '09:00', endTime: '17:00', color: '#10b981' },
];

const DEFAULT_DEPARTMENTS = [
  { name: 'General Management',    code: 'MGMT' },
  { name: 'Human Resources',       code: 'HR'   },
  { name: 'Finance & Accounting',  code: 'FIN'  },
  { name: 'Sales & Marketing',     code: 'SALES'},
  { name: 'Operations',            code: 'OPS'  },
  { name: 'Information Technology',code: 'IT'   },
  { name: 'Warehouse & Logistics', code: 'WH'   },
];

const DOCUMENT_PREFIXES = ['INV', 'QTE', 'CN', 'PFI', 'DN', 'PO'];

const ORG_SETTINGS = [
  { key: 'feature.approvals',         value: 'true'   },
  { key: 'feature.multiCurrency',     value: 'true'   },
  { key: 'feature.inventoryTracking', value: 'true'   },
  { key: 'invoice.autoSendEmail',     value: 'false'  },
  { key: 'invoice.footerText',        value: ''       },
  { key: 'hrms.attendance.enabled',   value: 'true'   },
  { key: 'crm.enabled',               value: 'true'   },
  { key: 'date.inputFormat',          value: 'yyyy-MM-dd' },
  { key: 'date.displayFormat',        value: 'dd MMM yyyy' },
];

// ─── Seed helpers (shared with reset) ─────────────────────────────────────────

async function ensureSeedData(db: typeof import('@/lib/db').default) {
  await seedPermissions(db);
  await seedRoles(db);
  await seedCurrencies(db);
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const setupRouter = t.router({
  setup: publicProcedure.input(setupSchema).mutation(async ({ ctx, input }) => {
    // Ensure system roles and permissions exist (idempotent)
    await ensureSeedData(ctx.db);

    const existingOrg = await ctx.db.organization.findUnique({ where: { slug: input.slug } });
    if (existingOrg) {
      throw new ConflictError(`Organization slug "${input.slug}" is already taken.`);
    }

    const existingUser = await ctx.db.user.findUnique({ where: { email: input.adminEmail.toLowerCase() } });
    if (existingUser) {
      throw new ConflictError(`A user with email "${input.adminEmail}" already exists.`);
    }

    const fullName = `${input.adminFirstName} ${input.adminLastName}`.trim();
    const systemRoles = await ctx.db.role.findMany({ where: { isSystem: true } });
    const permissions = await ctx.db.permission.findMany();

    if (systemRoles.length === 0 || permissions.length === 0) {
      throw new Error(
        'Failed to ensure system roles and permissions. Check database connectivity.',
      );
    }

    // ── Step 1: Create user via better-auth (proper password hashing) ──────
    let authUser: { id: string };
    try {
      const result = await auth.api.signUpEmail({
        body: {
          name: fullName,
          email: input.adminEmail,
          password: input.adminPassword,
          firstName: input.adminFirstName,
          lastName: input.adminLastName ?? '',
          isActive: true,
        } as any,
        headers: ctx.req.headers,
      });
      authUser = result.user!;
    } catch (error: any) {
      throw new Error(error?.message ?? 'Failed to create admin account. Please try again.');
    }

    // ── Step 2: Create org + all seed data (atomic) ────────────────────────
    let org: { id: string };
    try {
      org = await ctx.db.$transaction(async (tx) => {
        const org = await tx.organization.create({
          data: {
            name: input.orgName,
            slug: input.slug,
            currency: input.currency,
            website: input.website || null,
            isActive: true,
          },
        });

        await tx.documentSequence.createMany({
          data: DOCUMENT_PREFIXES.map((prefix) => ({ prefix, organizationId: org.id })),
        });

        for (const acc of CHART_OF_ACCOUNTS) {
          await tx.ledgerAccount.create({
            data: { ...acc, organizationId: org.id },
          });
        }

        await tx.taxRate.createMany({
          data: DEFAULT_TAX_RATES.map((t) => ({ ...t, organizationId: org.id })),
        });

        await tx.unit.createMany({
          data: DEFAULT_UNITS.map((u) => ({ ...u, organizationId: org.id })),
        });

        await tx.warehouse.create({
          data: { name: 'Main Warehouse', code: 'WH-MAIN', isDefault: true, organizationId: org.id },
        });

        await tx.department.createMany({
          data: DEFAULT_DEPARTMENTS.map((d) => ({ ...d, organizationId: org.id })),
        });

        await tx.employeeType.createMany({
          data: DEFAULT_EMPLOYEE_TYPES.map((et) => ({ ...et, organizationId: org.id })),
        });

        await tx.leaveType.createMany({
          data: DEFAULT_LEAVE_TYPES.map((lt) => ({ ...lt, organizationId: org.id })),
        });

        await tx.shift.createMany({
          data: DEFAULT_SHIFTS.map((s) => ({ ...s, organizationId: org.id })),
        });

        await tx.organizationSetting.createMany({
          data: ORG_SETTINGS.map((s) => ({ key: s.key, value: s.value, organizationId: org.id })),
        });

        await tx.priceList.create({
          data: { name: 'Standard Pricing', currency: input.currency, isDefault: true, organizationId: org.id },
        });

        // Create org-scoped role copies with permissions
        for (const role of systemRoles) {
          const isOwner = role.systemKey === 'OWNER';
          const isViewer = role.systemKey === 'VIEWER';

          const roleCopy = await tx.role.create({
            data: {
              name: role.name,
              description: role.description,
              icon: role.icon,
              color: role.color,
              isSystem: true,
              systemKey: `${role.systemKey}_${org.id}`,
              organizationId: org.id,
            },
          });

          const permsForRole = isOwner
            ? permissions
            : isViewer
              ? []
              : permissions.filter((p) => !p.code.startsWith('org:') && !p.code.startsWith('user:'));

          if (permsForRole.length > 0) {
            await tx.rolePermission.createMany({
              data: permsForRole.map((perm) => ({
                role: role.systemKey as any,
                roleId: roleCopy.id,
                permissionId: perm.id,
              })),
            });
          }
        }

        return org;
      });
    } catch (error: any) {
      // Cleanup: remove the user if org creation failed
      await ctx.db.user.delete({ where: { id: authUser.id } }).catch(() => {});
      throw new Error(error?.message ?? 'Failed to create organization. Please try again.');
    }

    // ── Step 3: Promote to SUPER_ADMIN and link org ────────────────────────
    await ctx.db.user.update({
      where: { id: authUser.id },
      data: {
        platformRole: 'SUPER_ADMIN',
        organizationId: org.id,
        firstName: input.adminFirstName,
        lastName: input.adminLastName ?? '',
        locale: input.language,
      },
    });

    // ── Step 4: Assign OWNER role ──────────────────────────────────────────
    const ownerRole = systemRoles.find((r) => r.systemKey === 'OWNER')!;
    await ctx.db.userOrganizationRole.create({
      data: {
        userId: authUser.id,
        organizationId: org.id,
        roleId: ownerRole.id,
        role: 'OWNER',
        isActive: true,
      },
    });

    return {
      organizationId: org.id,
      userId: authUser.id,
    };
  }),

  reset: publicProcedure
    .input(z.object({ confirmation: z.literal('RESET') }))
    .mutation(async ({ ctx }) => {
      // Truncate all tables across all schemas using CASCADE
      await ctx.db.$executeRawUnsafe(`
        DO $$
        DECLARE
          r RECORD;
        BEGIN
          FOR r IN (
            SELECT schemaname, tablename
            FROM pg_tables
            WHERE schemaname IN ('public', 'hrms', 'crm')
          ) LOOP
            EXECUTE format('TRUNCATE TABLE %I.%I CASCADE', r.schemaname, r.tablename);
          END LOOP;
        END $$;
      `);
      // Re-seed system permissions and roles
      await ensureSeedData(ctx.db);
      return { success: true };
    }),
});
