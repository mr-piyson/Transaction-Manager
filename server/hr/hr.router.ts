import { publicProcedure, router } from '@/lib/trpc/context';
import { departmentsRouter } from './departments.router';
import { jobPositionsRouter } from './job-positions.router';
import { employeeTypesRouter } from './employee-types.router';
import { shiftsRouter } from './shifts.router';
import { employeesRouter } from './employees.router';
import { attendanceRouter } from './attendance.router';
import { leaveRouter } from './leave.router';
import { salaryComponentsRouter } from './salary-components.router';
import { payrollRouter } from './payroll.router';
import { performanceRouter } from './performance.router';
import { documentsRouter } from './documents.router';
import { employeeRelationsRouter } from './employee-relations.router';
import { recruitmentRouter } from './recruitment.router';
import { trainingRouter } from './training.router';

export const hrRouter = router({
  health: publicProcedure.query(() => ({ status: 'ok', module: 'hr' })),

  departments: departmentsRouter,
  jobPositions: jobPositionsRouter,
  employeeTypes: employeeTypesRouter,
  shifts: shiftsRouter,
  employees: employeesRouter,
  attendance: attendanceRouter,
  leave: leaveRouter,
  salaryComponents: salaryComponentsRouter,
  payroll: payrollRouter,
  performance: performanceRouter,
  documents: documentsRouter,
  employeeRelations: employeeRelationsRouter,
  recruitment: recruitmentRouter,
  training: trainingRouter,
});

export type HrRouter = typeof hrRouter;
