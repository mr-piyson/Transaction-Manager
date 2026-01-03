"use client";

import { ArrowDownRight, ArrowUpRight, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Transactions } from "@/types/prisma/client";

interface TransactionItemProps {
  transaction: Transactions;
  onEdit?: (transaction: Transactions) => void;
  onDelete?: (id: number) => void;
}

export function TransactionItem({ transaction, onEdit, onDelete }: TransactionItemProps) {
  const isIncome = transaction.type === "income";
  const time = transaction.date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const totalAmount = transaction.amount * (transaction.qty ? transaction.qty : 1);

  return (
    <div className="flex items-center gap-3 rounded-lg bg-card p-4 shadow-sm transition-all hover:shadow-md mb-2">
      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${isIncome ? "bg-accent/10" : "bg-destructive/10"}`}>
        {isIncome ? <ArrowDownRight className="h-5 w-5 text-accent" /> : <ArrowUpRight className="h-5 w-5 text-destructive" />}
      </div>
      <div className="flex-1">
        <p className="font-medium text-foreground">{transaction.description}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>•</span>
          {(transaction.qty ? transaction.qty : 1) > 1 && (
            <>
              <span>Qty: {transaction.qty}</span>
              <span>•</span>
            </>
          )}
          <span>{time}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-right">
          <p className={`text-lg font-semibold ${isIncome ? "text-accent" : "text-destructive"}`}>
            {isIncome ? "+" : "-"}${totalAmount.toFixed(2)}
          </p>
          {transaction.qty && transaction.qty > 1 && <p className="text-xs text-muted-foreground">${transaction.amount && transaction.amount.toFixed(2)} each</p>}
        </div>
        <div className="flex flex-col gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit?.(transaction)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete?.(transaction.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
