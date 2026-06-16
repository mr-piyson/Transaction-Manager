'use client';

import type { ReactNode } from 'react';
import { ContractFormProvider } from './contractForm';
import { CustomerFormProvider } from './customerForm';
import { ItemFormProvider } from './itemForm';
import { POFormProvider } from './poForm';
import { SupplierFormProvider } from './supplierForm';
import { WarehouseFormProvider } from './warehouseForm';

export { CustomerFormProvider, useCustomerForm, CustomerFormDialog } from './customerForm';
export type { CustomerFormValues } from './customerForm';

export { SupplierFormProvider, useSupplierForm, SupplierFormDialog } from './supplierForm';
export type { SupplierFormValues } from './supplierForm';

export { WarehouseFormProvider, useWarehouseForm, WarehouseFormDialog } from './warehouseForm';
export type { WarehouseFormValues } from './warehouseForm';

export { ItemFormProvider, useItemForm, ItemFormDialog } from './itemForm';
export type { ItemFormValues } from './itemForm';

export { ContractFormProvider, useContractForm, ContractFormDialog } from './contractForm';
export type { ContractFormValues } from './contractForm';

export { POFormProvider, usePOForm, POFormDialog } from './poForm';
export type { POFormValues } from './poForm';

/**
 * DialogsProvider — mount once in your app layout.
 * Nest all form providers so their hooks work anywhere in the tree.
 */
export function DialogsProvider({ children }: { children: ReactNode }) {
  return (
    <CustomerFormProvider>
      <SupplierFormProvider>
        <WarehouseFormProvider>
          <ItemFormProvider>
            <ContractFormProvider>
              <POFormProvider>
                {children}
              </POFormProvider>
            </ContractFormProvider>
          </ItemFormProvider>
        </WarehouseFormProvider>
      </SupplierFormProvider>
    </CustomerFormProvider>
  );
}
