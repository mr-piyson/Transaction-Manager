/**
 * Permission definitions — single source of truth.
 * Used by: prisma/seed.ts, setup.router.ts
 *
 * IMPORTANT: These codes MUST match the `Action` type in lib/abilities.ts exactly.
 * CASL authorization depends on exact string matching.
 */

export interface PermissionDefinition {
  code: string;
  label: string;
  module: string;
}

export const PERMISSIONS: readonly PermissionDefinition[] = [
  // ── Users & Roles ─────────────────────────────────────────
  { code: 'user:manage', label: 'Manage Users', module: 'Users & Roles' },
  { code: 'role:manage', label: 'Manage Roles', module: 'Users & Roles' },

  // ── Organization Settings ─────────────────────────────────
  { code: 'org:settings:read', label: 'View Organization Settings', module: 'Organization' },
  { code: 'org:settings:update', label: 'Update Organization Settings', module: 'Organization' },

  // ── Exchange Rates ────────────────────────────────────────
  { code: 'exchange-rate:read', label: 'View Exchange Rates', module: 'Exchange Rates' },
  { code: 'exchange-rate:update', label: 'Manage Exchange Rates', module: 'Exchange Rates' },
  { code: 'exchange-rate:sync', label: 'Sync Exchange Rates', module: 'Exchange Rates' },

  // ── Invoicing ─────────────────────────────────────────────
  { code: 'invoice:create', label: 'Create Invoices', module: 'Invoicing' },
  { code: 'invoice:read', label: 'View Invoices', module: 'Invoicing' },
  { code: 'invoice:update', label: 'Edit Invoices', module: 'Invoicing' },
  { code: 'invoice:delete', label: 'Delete Invoices', module: 'Invoicing' },
  { code: 'invoice:send', label: 'Send Invoices', module: 'Invoicing' },
  { code: 'invoice:cancel', label: 'Cancel Invoices', module: 'Invoicing' },
  { code: 'invoice:approve', label: 'Approve Invoices', module: 'Invoicing' },
  { code: 'invoice:payment:create', label: 'Record Invoice Payments', module: 'Invoicing' },
  { code: 'invoice:payment:delete', label: 'Delete Invoice Payments', module: 'Invoicing' },

  // ── Purchasing ────────────────────────────────────────────
  { code: 'po:create', label: 'Create Purchase Orders', module: 'Purchasing' },
  { code: 'po:read', label: 'View Purchase Orders', module: 'Purchasing' },
  { code: 'po:update', label: 'Edit Purchase Orders', module: 'Purchasing' },
  { code: 'po:delete', label: 'Delete Purchase Orders', module: 'Purchasing' },
  { code: 'po:approve', label: 'Approve Purchase Orders', module: 'Purchasing' },
  { code: 'po:receive', label: 'Receive Purchase Orders', module: 'Purchasing' },

  // ── Inventory ─────────────────────────────────────────────
  { code: 'stock:read', label: 'View Stock', module: 'Inventory' },
  { code: 'stock:adjust', label: 'Adjust Stock', module: 'Inventory' },
  { code: 'stock:transfer', label: 'Transfer Stock', module: 'Inventory' },
  { code: 'item:create', label: 'Create Items', module: 'Inventory' },
  { code: 'item:read', label: 'View Items', module: 'Inventory' },
  { code: 'item:update', label: 'Edit Items', module: 'Inventory' },
  { code: 'item:delete', label: 'Delete Items', module: 'Inventory' },

  // ── Customers ─────────────────────────────────────────────
  { code: 'customer:create', label: 'Create Customers', module: 'Customers' },
  { code: 'customer:read', label: 'View Customers', module: 'Customers' },
  { code: 'customer:update', label: 'Edit Customers', module: 'Customers' },
  { code: 'customer:delete', label: 'Delete Customers', module: 'Customers' },

  // ── Expenses ──────────────────────────────────────────────
  { code: 'expense:create', label: 'Create Expenses', module: 'Expenses' },
  { code: 'expense:read', label: 'View Expenses', module: 'Expenses' },
  { code: 'expense:update', label: 'Edit Expenses', module: 'Expenses' },
  { code: 'expense:delete', label: 'Delete Expenses', module: 'Expenses' },

  // ── Incomes ───────────────────────────────────────────────
  { code: 'income:create', label: 'Create Incomes', module: 'Incomes' },
  { code: 'income:read', label: 'View Incomes', module: 'Incomes' },
  { code: 'income:update', label: 'Edit Incomes', module: 'Incomes' },
  { code: 'income:delete', label: 'Delete Incomes', module: 'Incomes' },

  // ── Reports ───────────────────────────────────────────────
  { code: 'report:financial', label: 'Financial Reports', module: 'Reports' },
  { code: 'report:inventory', label: 'Inventory Reports', module: 'Reports' },
  { code: 'report:sales', label: 'Sales Reports', module: 'Reports' },

  // ── Categories ────────────────────────────────────────────
  { code: 'category:read', label: 'View Categories', module: 'Categories' },
  { code: 'category:create', label: 'Create Categories', module: 'Categories' },
  { code: 'category:update', label: 'Edit Categories', module: 'Categories' },
  { code: 'category:delete', label: 'Delete Categories', module: 'Categories' },

  // ── Units ─────────────────────────────────────────────────
  { code: 'unit:read', label: 'View Units', module: 'Units' },
  { code: 'unit:create', label: 'Create Units', module: 'Units' },
  { code: 'unit:update', label: 'Edit Units', module: 'Units' },
  { code: 'unit:delete', label: 'Delete Units', module: 'Units' },

  // ── Accounting ────────────────────────────────────────────
  { code: 'journal:entry', label: 'Journal Entries', module: 'Accounting' },

  // ── HRMS — Organizational Structure ───────────────────────
  { code: 'department:read', label: 'View Departments', module: 'HRMS' },
  { code: 'department:create', label: 'Create Departments', module: 'HRMS' },
  { code: 'department:update', label: 'Edit Departments', module: 'HRMS' },
  { code: 'department:delete', label: 'Delete Departments', module: 'HRMS' },
  { code: 'employee:read', label: 'View Employees', module: 'HRMS' },
  { code: 'employee:create', label: 'Create Employees', module: 'HRMS' },
  { code: 'employee:update', label: 'Edit Employees', module: 'HRMS' },
  { code: 'employee:delete', label: 'Delete Employees', module: 'HRMS' },
  { code: 'employee:status:update', label: 'Update Employee Status', module: 'HRMS' },
  { code: 'employee-type:read', label: 'View Employee Types', module: 'HRMS' },
  { code: 'employee-type:create', label: 'Create Employee Types', module: 'HRMS' },
  { code: 'employee-type:update', label: 'Edit Employee Types', module: 'HRMS' },
  { code: 'employee-type:delete', label: 'Delete Employee Types', module: 'HRMS' },
  { code: 'job-position:read', label: 'View Job Positions', module: 'HRMS' },
  { code: 'job-position:create', label: 'Create Job Positions', module: 'HRMS' },
  { code: 'job-position:update', label: 'Edit Job Positions', module: 'HRMS' },
  { code: 'job-position:delete', label: 'Delete Job Positions', module: 'HRMS' },

  // ── HRMS — Leave ──────────────────────────────────────────
  { code: 'leave-type:read', label: 'View Leave Types', module: 'HRMS' },
  { code: 'leave-type:create', label: 'Create Leave Types', module: 'HRMS' },
  { code: 'leave-type:update', label: 'Edit Leave Types', module: 'HRMS' },
  { code: 'leave-type:delete', label: 'Delete Leave Types', module: 'HRMS' },
  { code: 'leave:request:create', label: 'Create Leave Requests', module: 'HRMS' },
  { code: 'leave:request:read', label: 'View Leave Requests', module: 'HRMS' },
  { code: 'leave:request:update', label: 'Edit Leave Requests', module: 'HRMS' },
  { code: 'leave:request:approve', label: 'Approve Leave Requests', module: 'HRMS' },
  { code: 'leave:balance:read', label: 'View Leave Balances', module: 'HRMS' },
  { code: 'leave:balance:adjust', label: 'Adjust Leave Balances', module: 'HRMS' },
  { code: 'holiday:read', label: 'View Holidays', module: 'HRMS' },
  { code: 'holiday:create', label: 'Create Holidays', module: 'HRMS' },
  { code: 'holiday:update', label: 'Edit Holidays', module: 'HRMS' },
  { code: 'holiday:delete', label: 'Delete Holidays', module: 'HRMS' },

  // ── HRMS — Attendance ─────────────────────────────────────
  { code: 'attendance:read', label: 'View Attendance', module: 'HRMS' },
  { code: 'attendance:create', label: 'Create Attendance Records', module: 'HRMS' },
  { code: 'attendance:update', label: 'Edit Attendance Records', module: 'HRMS' },
  { code: 'shift:read', label: 'View Shifts', module: 'HRMS' },
  { code: 'shift:create', label: 'Create Shifts', module: 'HRMS' },
  { code: 'shift:update', label: 'Edit Shifts', module: 'HRMS' },
  { code: 'shift:delete', label: 'Delete Shifts', module: 'HRMS' },

  // ── HRMS — Payroll ────────────────────────────────────────
  { code: 'payroll:read', label: 'View Payroll', module: 'HRMS' },
  { code: 'payroll:create', label: 'Create Payroll Runs', module: 'HRMS' },
  { code: 'payroll:process', label: 'Process Payroll', module: 'HRMS' },
  { code: 'payroll:complete', label: 'Complete Payroll', module: 'HRMS' },
  { code: 'payroll:cancel', label: 'Cancel Payroll', module: 'HRMS' },
  { code: 'salary-component:read', label: 'View Salary Components', module: 'HRMS' },
  { code: 'salary-component:create', label: 'Create Salary Components', module: 'HRMS' },
  { code: 'salary-component:update', label: 'Edit Salary Components', module: 'HRMS' },
  { code: 'salary-component:delete', label: 'Delete Salary Components', module: 'HRMS' },

  // ── HRMS — Performance ────────────────────────────────────
  { code: 'performance:read', label: 'View Performance Reviews', module: 'HRMS' },
  { code: 'performance:create', label: 'Create Performance Reviews', module: 'HRMS' },
  { code: 'performance:update', label: 'Edit Performance Reviews', module: 'HRMS' },
  { code: 'performance:delete', label: 'Delete Performance Reviews', module: 'HRMS' },
  { code: 'performance:submit', label: 'Submit Performance Reviews', module: 'HRMS' },
  { code: 'performance:acknowledge', label: 'Acknowledge Performance Reviews', module: 'HRMS' },

  // ── HRMS — Recruitment ────────────────────────────────────
  { code: 'job-posting:read', label: 'View Job Postings', module: 'HRMS' },
  { code: 'job-posting:create', label: 'Create Job Postings', module: 'HRMS' },
  { code: 'job-posting:update', label: 'Edit Job Postings', module: 'HRMS' },
  { code: 'job-posting:delete', label: 'Delete Job Postings', module: 'HRMS' },
  { code: 'candidate:read', label: 'View Candidates', module: 'HRMS' },
  { code: 'candidate:create', label: 'Create Candidates', module: 'HRMS' },
  { code: 'candidate:update', label: 'Edit Candidates', module: 'HRMS' },
  { code: 'candidate:delete', label: 'Delete Candidates', module: 'HRMS' },
  { code: 'candidate:status:update', label: 'Update Candidate Status', module: 'HRMS' },
  { code: 'interview:read', label: 'View Interviews', module: 'HRMS' },
  { code: 'interview:create', label: 'Create Interviews', module: 'HRMS' },
  { code: 'interview:update', label: 'Edit Interviews', module: 'HRMS' },
  { code: 'offer:read', label: 'View Offers', module: 'HRMS' },
  { code: 'offer:create', label: 'Create Offers', module: 'HRMS' },
  { code: 'offer:update', label: 'Edit Offers', module: 'HRMS' },
  { code: 'offer:respond', label: 'Respond to Offers', module: 'HRMS' },

  // ── HRMS — Training ───────────────────────────────────────
  { code: 'training:read', label: 'View Trainings', module: 'HRMS' },
  { code: 'training:create', label: 'Create Trainings', module: 'HRMS' },
  { code: 'training:update', label: 'Edit Trainings', module: 'HRMS' },
  { code: 'training:delete', label: 'Delete Trainings', module: 'HRMS' },
  { code: 'training:enroll', label: 'Enroll in Trainings', module: 'HRMS' },

  // ── HRMS — Documents & Relations ─────────────────────────
  { code: 'employee-document:read', label: 'View Employee Documents', module: 'HRMS' },
  { code: 'employee-document:create', label: 'Upload Employee Documents', module: 'HRMS' },
  { code: 'employee-document:delete', label: 'Delete Employee Documents', module: 'HRMS' },
  { code: 'grievance:read', label: 'View Grievances', module: 'HRMS' },
  { code: 'grievance:create', label: 'Create Grievances', module: 'HRMS' },
  { code: 'grievance:update', label: 'Edit Grievances', module: 'HRMS' },
  { code: 'grievance:resolve', label: 'Resolve Grievances', module: 'HRMS' },
  { code: 'disciplinary:read', label: 'View Disciplinary Actions', module: 'HRMS' },
  { code: 'disciplinary:create', label: 'Create Disciplinary Actions', module: 'HRMS' },
  { code: 'disciplinary:update', label: 'Edit Disciplinary Actions', module: 'HRMS' },

  // ── HRMS — Reports ────────────────────────────────────────
  { code: 'report:hr', label: 'HR Reports', module: 'HRMS' },
] as const;
