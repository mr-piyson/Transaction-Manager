"use client";

import { useState, useMemo } from "react";
import { InputGroup, InputGroupInput } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search } from "lucide-react";
import useDebounce from "@/hooks/use-debounce";
import { Transactions } from "@/types/prisma/client";
import { TransactionList } from "./transaction-list";
import { Button } from "@/components/ui/button";
import NewTransactionDialog from "./new-transaction-dialog";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export default function TransactionPage() {
  const [editingTransaction, setEditingTransaction] = useState<Transactions | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const debouncedSearch = useDebounce(search, 200);

  const { data: transactions } = useQuery<Transactions[]>({
    queryKey: ["invoices"],
    queryFn: async () => await axios.get(`/api/records/${""}/invoices/${""}`),
  });

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-sm">
        <NewTransactionDialog>
          <Button>
            <Plus />
            Add new Transaction
          </Button>
        </NewTransactionDialog>
        <div className="flex items-center gap-3 p-2">
          <InputGroup className="flex-1 w-full bg-background">
            <Label>
              <Search className="size-4 ms-3 text-foreground/60" />
              <InputGroupInput placeholder="Search transactions..." value={search} onChange={e => setSearch(e.target.value)} autoComplete="off" spellCheck="false" />
            </Label>
          </InputGroup>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-36 bg-background">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      <TransactionList transactions={transactions} onEdit={setEditingTransaction} />
    </div>
  );
}
