import { useCustomers } from "./data/use-customers";
import { useInventoryItems } from "./data/use-inventoryItems";
import { useInvoices } from "./data/use-invoices";

export const useAPI = () => {
  return {
    invoices: useInvoices,
    customers: useCustomers,
    inventoryItems: useInventoryItems,
  };
};
