"use client";

import type { ReactNode } from "react";
import { CandidateFormProvider } from "./candidateForm";
import { ContractFormProvider } from "./contractForm";
import { CustomerFormProvider } from "./customerForm";
import { DepartmentFormProvider } from "./departmentForm";
import { DisciplinaryActionFormProvider } from "./disciplinaryActionForm";
import { DocumentFormProvider } from "./documentForm";
import { EmployeeFormProvider } from "./employeeForm";
import { EmployeeTypeFormProvider } from "./employeeTypeForm";
import { ExchangeRateFormProvider } from "./exchangeRateForm";
import { ExpenseFormProvider } from "./expenseForm";
import { GrievanceFormProvider } from "./grievanceForm";
import { HardDeleteFormProvider } from "./hardDeleteForm";
import { HolidayFormProvider } from "./holidayForm";
import { IncomeFormProvider } from "./incomeForm";
import { InvoiceFormProvider } from "./invoiceForm";
import { UnifiedItemFormProvider } from "./item-dialog";
import { JobPositionFormProvider } from "./jobPositionForm";
import { JobPostingFormProvider } from "./jobPostingForm";
import { LeaveAllocateFormProvider } from "./leaveAllocateForm";
import { LeaveTypeFormProvider } from "./leaveTypeForm";
import { PaymentFormProvider } from "./paymentForm";
import { PayrollRunFormProvider } from "./payrollRunForm";
import { PerformanceReviewFormProvider } from "./performanceReviewForm";
import { POFormProvider } from "./poForm";
import { SalaryComponentFormProvider } from "./salaryComponentForm";
import { ShiftFormProvider } from "./shiftForm";
import { SupplierFormProvider } from "./supplierForm";
import { SupplierItemFormProvider } from "./supplierItemForm";
import { TimePunchFormProvider } from "./timePunchForm";
import { TrainingFormProvider } from "./trainingForm";
import { WarehouseFormProvider } from "./warehouseForm";

export type { ItemFormValues } from "@/lib/validations/item";
export type { CandidateFormValues } from "./candidateForm";
export {
	CandidateFormDialog,
	CandidateFormProvider,
	useCandidateForm,
} from "./candidateForm";
export type { ContractFormValues } from "./contractForm";
export {
	ContractFormDialog,
	ContractFormProvider,
	useContractForm,
} from "./contractForm";
export type { CustomerFormValues } from "./customerForm";
export {
	CustomerFormDialog,
	CustomerFormProvider,
	useCustomerForm,
} from "./customerForm";
export type { DepartmentFormValues } from "./departmentForm";
export {
	DepartmentFormDialog,
	DepartmentFormProvider,
	useDepartmentForm,
} from "./departmentForm";
export type { DisciplinaryActionFormValues } from "./disciplinaryActionForm";
export {
	DisciplinaryActionFormDialog,
	DisciplinaryActionFormProvider,
	useDisciplinaryActionForm,
} from "./disciplinaryActionForm";
export type { DocumentFormValues } from "./documentForm";
export {
	DocumentFormDialog,
	DocumentFormProvider,
	useDocumentForm,
} from "./documentForm";
export type { EmployeeFormValues } from "./employeeForm";
export {
	EmployeeFormDialog,
	EmployeeFormProvider,
	useEmployeeForm,
} from "./employeeForm";
export type { EmployeeTypeFormValues } from "./employeeTypeForm";
export {
	EmployeeTypeFormDialog,
	EmployeeTypeFormProvider,
	useEmployeeTypeForm,
} from "./employeeTypeForm";
export {
	ExchangeRateDialog,
	ExchangeRateFormProvider,
	useExchangeRateForm,
} from "./exchangeRateForm";
export type { ExpenseFormRecord, ExpenseFormValues } from "./expenseForm";
export {
	ExpenseFormDialog,
	ExpenseFormProvider,
	useExpenseForm,
} from "./expenseForm";
export type { GrievanceFormValues } from "./grievanceForm";
export {
	GrievanceFormDialog,
	GrievanceFormProvider,
	useGrievanceForm,
} from "./grievanceForm";
export {
	HardDeleteDialog,
	HardDeleteFormProvider,
	useHardDeleteForm,
} from "./hardDeleteForm";
export type { HolidayFormValues } from "./holidayForm";
export {
	HolidayFormDialog,
	HolidayFormProvider,
	useHolidayForm,
} from "./holidayForm";
export type { IncomeFormRecord, IncomeFormValues } from "./incomeForm";
export {
	IncomeFormDialog,
	IncomeFormProvider,
	useIncomeForm,
} from "./incomeForm";
export type { InvoiceFormValues } from "./invoiceForm";
export {
	InvoiceFormDialog,
	InvoiceFormProvider,
	useInvoiceForm,
} from "./invoiceForm";
export {
	UnifiedItemDialog,
	UnifiedItemFormProvider,
	useUnifiedItemForm,
} from "./item-dialog";
export type { JobPositionFormValues } from "./jobPositionForm";
export {
	JobPositionFormDialog,
	JobPositionFormProvider,
	useJobPositionForm,
} from "./jobPositionForm";
export type { JobPostingFormValues } from "./jobPostingForm";
export {
	JobPostingFormDialog,
	JobPostingFormProvider,
	useJobPostingForm,
} from "./jobPostingForm";
export type { LeaveAllocateFormValues } from "./leaveAllocateForm";
export {
	LeaveAllocateFormDialog,
	LeaveAllocateFormProvider,
	useLeaveAllocateForm,
} from "./leaveAllocateForm";
export type { LeaveTypeFormValues } from "./leaveTypeForm";
export {
	LeaveTypeFormDialog,
	LeaveTypeFormProvider,
	useLeaveTypeForm,
} from "./leaveTypeForm";
export type { PaymentFormValues } from "./paymentForm";
export {
	PaymentFormDialog,
	PaymentFormProvider,
	usePaymentForm,
} from "./paymentForm";
export type { PayrollRunFormValues } from "./payrollRunForm";
export {
	PayrollRunFormDialog,
	PayrollRunFormProvider,
	usePayrollRunForm,
} from "./payrollRunForm";
export type { PerformanceReviewFormValues } from "./performanceReviewForm";
export {
	PerformanceReviewFormDialog,
	PerformanceReviewFormProvider,
	usePerformanceReviewForm,
} from "./performanceReviewForm";
export type { POFormValues } from "./poForm";
export { POFormDialog, POFormProvider, usePOForm } from "./poForm";
export type { SalaryComponentFormValues } from "./salaryComponentForm";
export {
	SalaryComponentFormDialog,
	SalaryComponentFormProvider,
	useSalaryComponentForm,
} from "./salaryComponentForm";
export type { ShiftFormValues } from "./shiftForm";
export { ShiftFormDialog, ShiftFormProvider, useShiftForm } from "./shiftForm";
export type { SupplierFormValues } from "./supplierForm";
export {
	SupplierFormDialog,
	SupplierFormProvider,
	useSupplierForm,
} from "./supplierForm";
export type { SupplierItemFormValues } from "./supplierItemForm";
export {
	SupplierItemFormDialog,
	SupplierItemFormProvider,
	useSupplierItemForm,
} from "./supplierItemForm";
export {
	TimePunchFormDialog,
	TimePunchFormProvider,
	useTimePunchForm,
} from "./timePunchForm";
export type { TrainingFormValues } from "./trainingForm";
export {
	TrainingFormDialog,
	TrainingFormProvider,
	useTrainingForm,
} from "./trainingForm";
export type { WarehouseFormValues } from "./warehouseForm";
export {
	useWarehouseForm,
	WarehouseFormDialog,
	WarehouseFormProvider,
} from "./warehouseForm";

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
																														<PaymentFormProvider>
																															<ExpenseFormProvider>
																																<IncomeFormProvider>
																																	<HardDeleteFormProvider>
																																		{children}
																																	</HardDeleteFormProvider>
																																</IncomeFormProvider>
																															</ExpenseFormProvider>
																														</PaymentFormProvider>
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
