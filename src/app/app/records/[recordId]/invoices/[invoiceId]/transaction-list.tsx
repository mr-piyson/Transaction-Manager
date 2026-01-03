"use client";

import React, { useCallback, useRef, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Transactions } from "@/types/prisma/client";
import { TransactionItem } from "./transaction-item";

interface TransactionListProps {
  transactions: Transactions[] | undefined;
  onEdit?: (transaction: Transactions) => void;
  onDelete?: (id: number) => void;
}

const ITEM_HEIGHT = 88;

const VirtualTransactionItem = React.memo(
  ({ transaction, onEdit, onDelete }: { transaction: Transactions; onEdit?: (transaction: Transactions) => void; onDelete?: (id: number) => void }) => {
    return (
      <div style={{ height: `${ITEM_HEIGHT}px` }}>
        <TransactionItem transaction={transaction} onEdit={onEdit} onDelete={onDelete} />
      </div>
    );
  },
  (prev, next) => prev.transaction.id === next.transaction.id
);
VirtualTransactionItem.displayName = "VirtualTransactionItem";

export function TransactionList({ transactions, onEdit, onDelete }: TransactionListProps) {
  transactions = transactions ?? [];
  const parentRef = useRef<HTMLDivElement>(null);

  const groupedTransactions = useMemo(() => {
    const groups: Array<{ type: "date"; date: string } | { type: "transaction"; transaction: Transactions }> = [];

    return groups;
  }, [transactions]);

  const count = groupedTransactions.length;

  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback(
      index => {
        const item = groupedTransactions[index];
        return item.type === "date" ? 40 : ITEM_HEIGHT;
      },
      [groupedTransactions]
    ),
    overscan: 10,
  });

  const virtualItems = virtualizer.getVirtualItems();

  if (transactions.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
        <div className="mb-4 text-6xl">💸</div>
        <p className="text-lg font-medium text-foreground">No transactions yet</p>
        <p className="text-sm text-muted-foreground">Add your first transaction below</p>
      </div>
    );
  }

  return (
    <main className="flex-1 min-h-0 relative">
      <div
        ref={parentRef}
        className="h-full overflow-y-auto overflow-x-hidden px-4"
        style={{
          contain: "strict",
          willChange: "scroll-position",
        }}
      >
        <div
          className="relative w-full"
          style={{
            height: `${virtualizer.getTotalSize()}px`,
          }}
        >
          {virtualItems.map(virtualItem => {
            const item = groupedTransactions[virtualItem.index];

            return (
              <div
                key={virtualItem.index}
                data-index={virtualItem.index}
                className="absolute top-0 left-0 w-full"
                style={{
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                  willChange: "transform",
                }}
              >
                {item.type === "date" ? (
                  <div className="py-3">
                    <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{item.date}</h3>
                  </div>
                ) : (
                  <VirtualTransactionItem transaction={item.transaction} onEdit={onEdit} onDelete={onDelete} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
