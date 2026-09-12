"use client";

import type { ReactNode } from "react";
import { ContractFormProvider } from "./contractForm";
import { CustomerFormProvider } from "./customerForm";
import { ExchangeRateFormProvider } from "./exchangeRateForm";
import { ExpenseFormProvider } from "./expenseForm";
import { HardDeleteFormProvider } from "./hardDeleteForm";
import { IncomeFormProvider } from "./incomeForm";
import { UnifiedItemFormProvider } from "./item-dialog";
import { PaymentFormProvider } from "./paymentForm";
import { POFormProvider } from "./poForm";
import { RenewalFormProvider } from "./renewalForm";
import { StockAdjustmentFormProvider } from "./stockAdjustmentForm";
import { SubscriptionFormProvider } from "./subscriptionForm";
import { SupplierFormProvider } from "./supplierForm";
import { SupplierItemFormProvider } from "./supplierItemForm";
import { WarehouseFormProvider } from "./warehouseForm";

export type { InvoiceFormValues } from "@/lib/form/invoice/invoiceFormSchema";
export type { ItemFormValues } from "@/lib/validations/item";
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
export {
  HardDeleteDialog,
  HardDeleteFormProvider,
  useHardDeleteForm,
} from "./hardDeleteForm";
export type { IncomeFormRecord, IncomeFormValues } from "./incomeForm";
export {
  IncomeFormDialog,
  IncomeFormProvider,
  useIncomeForm,
} from "./incomeForm";
export {
  UnifiedItemDialog,
  UnifiedItemFormProvider,
  useUnifiedItemForm,
} from "./item-dialog";

export type { PaymentFormValues } from "./paymentForm";
export {
  PaymentFormDialog,
  PaymentFormProvider,
  usePaymentForm,
} from "./paymentForm";

export type { POFormValues } from "./poForm";
export { POFormDialog, POFormProvider, usePOForm } from "./poForm";

export type { RenewalFormValues } from "./renewalForm";
export {
  RenewalFormDialog,
  RenewalFormProvider,
  useRenewalForm,
} from "./renewalForm";
export type { StockAdjustmentFormValues } from "./stockAdjustmentForm";
export {
  StockAdjustmentFormDialog,
  StockAdjustmentFormProvider,
  useStockAdjustmentForm,
} from "./stockAdjustmentForm";
export type { SubscriptionFormValues } from "./subscriptionForm";
export {
  SubscriptionFormDialog,
  SubscriptionFormProvider,
  useSubscriptionForm,
} from "./subscriptionForm";
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
                    <ExchangeRateFormProvider>
                      <PaymentFormProvider>
                        <ExpenseFormProvider>
                          <IncomeFormProvider>
                            <SubscriptionFormProvider>
                              <RenewalFormProvider>
                                <StockAdjustmentFormProvider>
                                  <HardDeleteFormProvider>
                                    {children}
                                  </HardDeleteFormProvider>
                                </StockAdjustmentFormProvider>
                              </RenewalFormProvider>
                            </SubscriptionFormProvider>
                          </IncomeFormProvider>
                        </ExpenseFormProvider>
                      </PaymentFormProvider>
                    </ExchangeRateFormProvider>
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
