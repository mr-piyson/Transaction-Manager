import { Invoice } from "@prisma/client";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export const useInvoices = () => {
  return {
    getAll: () =>
      useQuery<Invoice[]>({
        queryKey: ["invoices"],
        queryFn: async () => (await axios.get("/api/invoices")).data,
      }),
    getById: (id?: string) =>
      useQuery<Invoice>({
        queryKey: ["invoices", id],
        queryFn: async () => (await axios.get(`/api/invoices/${id}`)).data,
        enabled: !!id,
      }),
  };
};
