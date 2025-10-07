"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  MoreVertical,
  Edit2,
  Copy,
  Trash2,
  BarChart3,
  Download,
} from "lucide-react";

interface Transaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  timestamp: Date;
}

interface TransactionListProps {
  transactions: Transaction[];
  onEditTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onDuplicateTransaction: (id: string) => void;
  onExportTransactions: () => void;
  showSummary: boolean;
  onToggleSummary: () => void;
}

export function TransactionList({
  transactions,
  onEditTransaction,
  onDeleteTransaction,
  onDuplicateTransaction,
  onExportTransactions,
  showSummary,
  onToggleSummary,
}: TransactionListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "amount" | "type">(
    "newest"
  );
  const [filterBy, setFilterBy] = useState<"all" | "income" | "expense">("all");
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>(
    []
  );

  const getTransactionSummary = (transactions: Transaction[]) => {
    const income = transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
    return { income, expenses, balance: income - expenses };
  };

  const filteredAndSortedTransactions = transactions
    .filter((transaction) => {
      const matchesSearch =
        transaction.description
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        transaction.amount.toString().includes(searchQuery);

      const matchesFilter =
        filterBy === "all" ||
        (filterBy === "income" && transaction.type === "income") ||
        (filterBy === "expense" && transaction.type === "expense");

      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return (
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
        case "oldest":
          return (
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
        case "amount":
          return b.amount - a.amount;
        case "type":
          return a.type.localeCompare(b.type);
        default:
          return 0;
      }
    });

  const deleteSelectedTransactions = () => {
    selectedTransactions.forEach((id) => onDeleteTransaction(id));
    setSelectedTransactions([]);
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onToggleSummary}>
          <BarChart3 className="w-4 h-4 mr-1" />
          Summary
        </Button>
        <Button variant="outline" size="sm" onClick={onExportTransactions}>
          <Download className="w-4 h-4 mr-1" />
          Export
        </Button>
      </div>

      {/* Transaction Summary */}
      {showSummary && transactions.length > 0 && (
        <Card className="p-4">
          <h3 className="font-medium text-foreground mb-3">
            Transaction Summary
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {(() => {
              const summary = getTransactionSummary(transactions);
              return (
                <>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      ${summary.income.toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">Income</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      ${summary.expenses.toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Expenses
                    </div>
                  </div>
                  <div className="text-center">
                    <div
                      className={`text-2xl font-bold ${
                        summary.balance >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      ${Math.abs(summary.balance).toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">Balance</div>
                  </div>
                </>
              );
            })()}
          </div>
        </Card>
      )}

      {/* Transaction Filters and Controls */}
      {transactions.length > 0 && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-1" />
                  Filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setFilterBy("all")}>
                  All {filterBy === "all" && "✓"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterBy("income")}>
                  Income {filterBy === "income" && "✓"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterBy("expense")}>
                  Expenses {filterBy === "expense" && "✓"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Label className="text-sm text-muted-foreground self-center">
                Sort by:
              </Label>
              <Select
                value={sortBy}
                onValueChange={(value: any) => setSortBy(value)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                  <SelectItem value="amount">Amount</SelectItem>
                  <SelectItem value="type">Type</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {selectedTransactions.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={deleteSelectedTransactions}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete Selected ({selectedTransactions.length})
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Transactions */}
      <div className="space-y-3">
        {filteredAndSortedTransactions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              {transactions.length === 0
                ? "No transactions yet. Add your first transaction below."
                : "No transactions match your search criteria."}
            </p>
          </div>
        ) : (
          filteredAndSortedTransactions.map((transaction) => (
            <Card key={transaction.id} className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Input
                    type="checkbox"
                    checked={selectedTransactions.includes(transaction.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTransactions([
                          ...selectedTransactions,
                          transaction.id,
                        ]);
                      } else {
                        setSelectedTransactions(
                          selectedTransactions.filter(
                            (id) => id !== transaction.id
                          )
                        );
                      }
                    }}
                    className="rounded"
                  />
                  {transaction.type === "income" ? (
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  )}
                  <div>
                    <p className="font-medium text-foreground">
                      {transaction.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {transaction.timestamp.toLocaleDateString()}{" "}
                      {transaction.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`font-semibold ${
                      transaction.type === "income"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {transaction.type === "income" ? "+" : "-"}$
                    {transaction.amount.toFixed(2)}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => onEditTransaction(transaction)}
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDuplicateTransaction(transaction.id)}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDeleteTransaction(transaction.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
