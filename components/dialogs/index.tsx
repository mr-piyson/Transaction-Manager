'use client';

import type { ReactNode } from 'react';
import { ContractFormProvider } from './contractForm';
import { CustomerFormProvider } from './customerForm';
import { EmployeeFormProvider } from './employeeForm';
import { InvoiceFormProvider } from './invoiceForm';
import { ItemFormProvider } from './itemForm';
import { POFormProvider } from './poForm';
import { SupplierFormProvider } from './supplierForm';
import { SupplierItemFormProvider } from './supplierItemForm';
import { TimePunchFormProvider } from './timePunchForm';
import { WarehouseFormProvider } from './warehouseForm';

export { CustomerFormProvider, useCustomerForm, CustomerFormDialog } from './customerForm';
export type { CustomerFormValues } from './customerForm';

export { SupplierFormProvider, useSupplierForm, SupplierFormDialog } from './supplierForm';
export type { SupplierFormValues } from './supplierForm';

export { SupplierItemFormProvider, useSupplierItemForm, SupplierItemFormDialog } from './supplierItemForm';
export type { SupplierItemFormValues } from './supplierItemForm';

export { WarehouseFormProvider, useWarehouseForm, WarehouseFormDialog } from './warehouseForm';
export type { WarehouseFormValues } from './warehouseForm';

export { ItemFormProvider, useItemForm, ItemFormDialog } from './itemForm';
export type { ItemFormValues } from '@/lib/validations/item';

export { ContractFormProvider, useContractForm, ContractFormDialog } from './contractForm';
export type { ContractFormValues } from './contractForm';

export { POFormProvider, usePOForm, POFormDialog } from './poForm';
export type { POFormValues } from './poForm';

export { InvoiceFormProvider, useInvoiceForm, InvoiceFormDialog } from './invoiceForm';
export type { InvoiceFormValues } from './invoiceForm';

export { EmployeeFormProvider, useEmployeeForm, EmployeeFormDialog } from './employeeForm';
export type { EmployeeFormValues } from './employeeForm';

export { TimePunchFormProvider, useTimePunchForm, TimePunchFormDialog } from './timePunchForm';

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
            <ItemFormProvider>
              <ContractFormProvider>
                <POFormProvider>
                  <InvoiceFormProvider>
                    <EmployeeFormProvider>
                      <TimePunchFormProvider>
                        {children}
                      </TimePunchFormProvider>
                    </EmployeeFormProvider>
                  </InvoiceFormProvider>
                </POFormProvider>
              </ContractFormProvider>
            </ItemFormProvider>
          </WarehouseFormProvider>
        </SupplierItemFormProvider>
      </SupplierFormProvider>
    </CustomerFormProvider>
  );
}
