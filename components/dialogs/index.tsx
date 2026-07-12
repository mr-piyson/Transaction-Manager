'use client';

import type { ReactNode } from 'react';
import { CandidateFormProvider } from './candidateForm';
import { ContractFormProvider } from './contractForm';
import { CustomerFormProvider } from './customerForm';
import { DepartmentFormProvider } from './departmentForm';
import { DisciplinaryActionFormProvider } from './disciplinaryActionForm';
import { DocumentFormProvider } from './documentForm';
import { EmployeeFormProvider } from './employeeForm';
import { EmployeeTypeFormProvider } from './employeeTypeForm';
import { ExchangeRateFormProvider } from './exchangeRateForm';
import { GrievanceFormProvider } from './grievanceForm';
import { HolidayFormProvider } from './holidayForm';
import { InvoiceFormProvider } from './invoiceForm';
import { JobPositionFormProvider } from './jobPositionForm';
import { JobPostingFormProvider } from './jobPostingForm';
import { LeaveAllocateFormProvider } from './leaveAllocateForm';
import { LeaveTypeFormProvider } from './leaveTypeForm';
import { PayrollRunFormProvider } from './payrollRunForm';
import { PerformanceReviewFormProvider } from './performanceReviewForm';
import { POFormProvider } from './poForm';
import { SalaryComponentFormProvider } from './salaryComponentForm';
import { ShiftFormProvider } from './shiftForm';
import { SupplierFormProvider } from './supplierForm';
import { SupplierItemFormProvider } from './supplierItemForm';
import { TimePunchFormProvider } from './timePunchForm';
import { TrainingFormProvider } from './trainingForm';
import { UnifiedItemFormProvider } from './item-dialog';
import { WarehouseFormProvider } from './warehouseForm';

export { CustomerFormProvider, useCustomerForm, CustomerFormDialog } from './customerForm';
export type { CustomerFormValues } from './customerForm';

export { SupplierFormProvider, useSupplierForm, SupplierFormDialog } from './supplierForm';
export type { SupplierFormValues } from './supplierForm';

export {
  SupplierItemFormProvider,
  useSupplierItemForm,
  SupplierItemFormDialog,
} from './supplierItemForm';
export type { SupplierItemFormValues } from './supplierItemForm';

export { WarehouseFormProvider, useWarehouseForm, WarehouseFormDialog } from './warehouseForm';
export type { WarehouseFormValues } from './warehouseForm';

export type { ItemFormValues } from '@/lib/validations/item';

export { UnifiedItemFormProvider, useUnifiedItemForm, UnifiedItemDialog } from './item-dialog';

export { ContractFormProvider, useContractForm, ContractFormDialog } from './contractForm';
export type { ContractFormValues } from './contractForm';

export { POFormProvider, usePOForm, POFormDialog } from './poForm';
export type { POFormValues } from './poForm';

export { InvoiceFormProvider, useInvoiceForm, InvoiceFormDialog } from './invoiceForm';
export type { InvoiceFormValues } from './invoiceForm';

export { EmployeeFormProvider, useEmployeeForm, EmployeeFormDialog } from './employeeForm';
export type { EmployeeFormValues } from './employeeForm';

export { TimePunchFormProvider, useTimePunchForm, TimePunchFormDialog } from './timePunchForm';

export { DepartmentFormProvider, useDepartmentForm, DepartmentFormDialog } from './departmentForm';
export type { DepartmentFormValues } from './departmentForm';

export {
  JobPositionFormProvider,
  useJobPositionForm,
  JobPositionFormDialog,
} from './jobPositionForm';
export type { JobPositionFormValues } from './jobPositionForm';

export {
  EmployeeTypeFormProvider,
  useEmployeeTypeForm,
  EmployeeTypeFormDialog,
} from './employeeTypeForm';
export type { EmployeeTypeFormValues } from './employeeTypeForm';

export { LeaveTypeFormProvider, useLeaveTypeForm, LeaveTypeFormDialog } from './leaveTypeForm';
export type { LeaveTypeFormValues } from './leaveTypeForm';

export { HolidayFormProvider, useHolidayForm, HolidayFormDialog } from './holidayForm';
export type { HolidayFormValues } from './holidayForm';

export { ShiftFormProvider, useShiftForm, ShiftFormDialog } from './shiftForm';
export type { ShiftFormValues } from './shiftForm';

export {
  SalaryComponentFormProvider,
  useSalaryComponentForm,
  SalaryComponentFormDialog,
} from './salaryComponentForm';
export type { SalaryComponentFormValues } from './salaryComponentForm';

export { PayrollRunFormProvider, usePayrollRunForm, PayrollRunFormDialog } from './payrollRunForm';
export type { PayrollRunFormValues } from './payrollRunForm';

export {
  PerformanceReviewFormProvider,
  usePerformanceReviewForm,
  PerformanceReviewFormDialog,
} from './performanceReviewForm';
export type { PerformanceReviewFormValues } from './performanceReviewForm';

export { DocumentFormProvider, useDocumentForm, DocumentFormDialog } from './documentForm';
export type { DocumentFormValues } from './documentForm';

export { GrievanceFormProvider, useGrievanceForm, GrievanceFormDialog } from './grievanceForm';
export type { GrievanceFormValues } from './grievanceForm';

export {
  DisciplinaryActionFormProvider,
  useDisciplinaryActionForm,
  DisciplinaryActionFormDialog,
} from './disciplinaryActionForm';
export type { DisciplinaryActionFormValues } from './disciplinaryActionForm';

export { JobPostingFormProvider, useJobPostingForm, JobPostingFormDialog } from './jobPostingForm';
export type { JobPostingFormValues } from './jobPostingForm';

export { CandidateFormProvider, useCandidateForm, CandidateFormDialog } from './candidateForm';
export type { CandidateFormValues } from './candidateForm';

export { TrainingFormProvider, useTrainingForm, TrainingFormDialog } from './trainingForm';
export type { TrainingFormValues } from './trainingForm';

export {
  LeaveAllocateFormProvider,
  useLeaveAllocateForm,
  LeaveAllocateFormDialog,
} from './leaveAllocateForm';
export type { LeaveAllocateFormValues } from './leaveAllocateForm';

export {
  ExchangeRateFormProvider,
  useExchangeRateForm,
  ExchangeRateDialog,
} from './exchangeRateForm';

/**
 * DialogsProvider — mount once in your app layout.
 * Nest all form providers so their hooks work anywhere in the tree.
 */
export function DialogsProvider({ children }: { children: ReactNode }) {
  return (
    <CustomerFormProvider>
      <SupplierFormProvider>
        <SupplierItemFormProvider>
          <WarehouseFormProvider>
            <UnifiedItemFormProvider>
              <UnifiedItemFormProvider>
                <ContractFormProvider>
                  <POFormProvider>
                    <InvoiceFormProvider>
                      <EmployeeFormProvider>
                        <TimePunchFormProvider>
                          <DepartmentFormProvider>
                            <JobPositionFormProvider>
                              <EmployeeTypeFormProvider>
                                <LeaveTypeFormProvider>
                                  <HolidayFormProvider>
                                    <ShiftFormProvider>
                                      <SalaryComponentFormProvider>
                                        <PayrollRunFormProvider>
                                          <PerformanceReviewFormProvider>
                                            <DocumentFormProvider>
                                              <GrievanceFormProvider>
                                                <DisciplinaryActionFormProvider>
                                                  <JobPostingFormProvider>
                                                    <CandidateFormProvider>
                                                      <TrainingFormProvider>
                                                        <LeaveAllocateFormProvider>
                                                          <ExchangeRateFormProvider>
                                                            {children}
                                                          </ExchangeRateFormProvider>
                                                        </LeaveAllocateFormProvider>
                                                      </TrainingFormProvider>
                                                    </CandidateFormProvider>
                                                  </JobPostingFormProvider>
                                                </DisciplinaryActionFormProvider>
                                              </GrievanceFormProvider>
                                            </DocumentFormProvider>
                                          </PerformanceReviewFormProvider>
                                        </PayrollRunFormProvider>
                                      </SalaryComponentFormProvider>
                                    </ShiftFormProvider>
                                  </HolidayFormProvider>
                                </LeaveTypeFormProvider>
                              </EmployeeTypeFormProvider>
                            </JobPositionFormProvider>
                          </DepartmentFormProvider>
                        </TimePunchFormProvider>
                      </EmployeeFormProvider>
                    </InvoiceFormProvider>
                  </POFormProvider>
                </ContractFormProvider>
              </UnifiedItemFormProvider>
            </UnifiedItemFormProvider>
          </WarehouseFormProvider>
        </SupplierItemFormProvider>
      </SupplierFormProvider>
    </CustomerFormProvider>
  );
}
