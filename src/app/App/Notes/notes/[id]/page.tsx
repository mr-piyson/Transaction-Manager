"use client";

import { useState, useEffect, use } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toggle } from "@/components/ui/toggle";
import { TransactionList } from "@/components/transaction-list";
import { TransactionInput } from "@/components/transaction-input";
import {
  User,
  TrendingUp,
  TrendingDown,
  Coffee,
  Car,
  Home,
  ShoppingBag,
  Utensils,
  Zap,
} from "lucide-react";
import type { Note, Transaction } from "@/lib/types";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { notFound } from "next/navigation";

const quickActions = [
  { icon: Coffee, label: "Coffee", amount: 5, type: "expense" as const },
  { icon: Utensils, label: "Lunch", amount: 15, type: "expense" as const },
  { icon: Car, label: "Gas", amount: 40, type: "expense" as const },
  {
    icon: ShoppingBag,
    label: "Shopping",
    amount: 50,
    type: "expense" as const,
  },
  { icon: Home, label: "Rent", amount: 1200, type: "expense" as const },
  { icon: Zap, label: "Utilities", amount: 100, type: "expense" as const },
];

export default function NotePage() {
  const params = useParams();
  const router = useRouter();
  const [note, setNote] = useState<Note | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [recentDescriptions, setRecentDescriptions] = useState<string[]>([]);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [editTransactionAmount, setEditTransactionAmount] = useState("");
  const [editTransactionDescription, setEditTransactionDescription] =
    useState("");
  const [editTransactionType, setEditTransactionType] = useState<
    "income" | "expense"
  >("expense");
  const [showTransactionSummary, setShowTransactionSummary] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load note data on mount
  useEffect(() => {
    const savedNotes = localStorage.getItem("transaction-notes");
    const savedDescriptions = localStorage.getItem("recentDescriptions");

    if (savedDescriptions) {
      setRecentDescriptions(JSON.parse(savedDescriptions));
    }

    if (savedNotes) {
      const parsedNotes = JSON.parse(savedNotes).map((note: any) => ({
        ...note,
        createdAt: new Date(note.createdAt),
        updatedAt: new Date(note.updatedAt),
        transactions: note.transactions.map((t: any) => ({
          ...t,
          timestamp: new Date(t.timestamp),
        })),
      }));

      setNotes(parsedNotes);
      const foundNote = parsedNotes.find((n: Note) => n.id === params.id);

      if (!foundNote) {
        notFound();
      }

      setNote(foundNote);
    }

    setLoading(false);
  }, [params.id]);

  // Save notes to localStorage whenever notes change
  useEffect(() => {
    if (notes.length > 0) {
      localStorage.setItem("transaction-notes", JSON.stringify(notes));
    }
  }, [notes]);

  if (loading) {
    return (
      <div className="h-full bg-background flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!note) {
    notFound();
  }

  const addTransaction = (
    transactionData: Omit<Transaction, "id" | "timestamp">
  ) => {
    const transaction: Transaction = {
      id: Date.now().toString(),
      ...transactionData,
      timestamp: new Date(),
    };

    const updatedNote = {
      ...note,
      transactions: [...note.transactions, transaction],
      updatedAt: new Date(),
    };

    const updatedNotes = notes.map((n) => (n.id === note.id ? updatedNote : n));
    setNotes(updatedNotes);
    setNote(updatedNote);

    // Update recent descriptions
    const newRecentDescriptions = [
      transactionData.description,
      ...recentDescriptions.filter((d) => d !== transactionData.description),
    ].slice(0, 10);
    setRecentDescriptions(newRecentDescriptions);
    localStorage.setItem(
      "recentDescriptions",
      JSON.stringify(newRecentDescriptions)
    );
  };

  const addQuickTransaction = (action: (typeof quickActions)[0]) => {
    const transaction: Transaction = {
      id: Date.now().toString(),
      type: action.type,
      amount: action.amount,
      description: action.label,
      timestamp: new Date(),
    };

    const updatedNote = {
      ...note,
      transactions: [...note.transactions, transaction],
      updatedAt: new Date(),
    };

    const updatedNotes = notes.map((n) => (n.id === note.id ? updatedNote : n));
    setNotes(updatedNotes);
    setNote(updatedNote);
  };

  const updateTransaction = () => {
    if (
      !editingTransaction ||
      !editTransactionAmount.trim() ||
      !editTransactionDescription.trim()
    )
      return;

    const numAmount = Number.parseFloat(editTransactionAmount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    const updatedTransaction = {
      ...editingTransaction,
      amount: numAmount,
      description: editTransactionDescription.trim(),
      type: editTransactionType,
    };

    const updatedNote = {
      ...note,
      transactions: note.transactions.map((t) =>
        t.id === editingTransaction.id ? updatedTransaction : t
      ),
      updatedAt: new Date(),
    };

    const updatedNotes = notes.map((n) => (n.id === note.id ? updatedNote : n));
    setNotes(updatedNotes);
    setNote(updatedNote);
    setEditingTransaction(null);
    setEditTransactionAmount("");
    setEditTransactionDescription("");
  };

  const deleteTransaction = (transactionId: string) => {
    const updatedNote = {
      ...note,
      transactions: note.transactions.filter((t) => t.id !== transactionId),
      updatedAt: new Date(),
    };

    const updatedNotes = notes.map((n) => (n.id === note.id ? updatedNote : n));
    setNotes(updatedNotes);
    setNote(updatedNote);
  };

  const duplicateTransaction = (transactionId: string) => {
    const originalTransaction = note.transactions.find(
      (t) => t.id === transactionId
    );
    if (!originalTransaction) return;

    const duplicatedTransaction: Transaction = {
      ...originalTransaction,
      id: Date.now().toString(),
      timestamp: new Date(),
    };

    const updatedNote = {
      ...note,
      transactions: [...note.transactions, duplicatedTransaction],
      updatedAt: new Date(),
    };

    const updatedNotes = notes.map((n) => (n.id === note.id ? updatedNote : n));
    setNotes(updatedNotes);
    setNote(updatedNote);
  };

  const exportTransactions = () => {
    const csvContent = [
      "Date,Type,Amount,Description",
      ...note.transactions.map(
        (t) =>
          `${t.timestamp.toLocaleDateString()},${t.type},${t.amount},${
            t.description
          }`
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${note.title}-transactions.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-background ">
      {/* Header */}
      <div className="sticky  top-0 z-10 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">•</span>
            <span className="text-lg font-medium text-foreground">
              {note.title}
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            ← Back
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-scroll">
        <TransactionList
          transactions={note.transactions}
          onEditTransaction={(transaction) => {
            setEditingTransaction(transaction);
            setEditTransactionAmount(transaction.amount.toString());
            setEditTransactionDescription(transaction.description);
            setEditTransactionType(transaction.type);
          }}
          onDeleteTransaction={deleteTransaction}
          onDuplicateTransaction={duplicateTransaction}
          onExportTransactions={exportTransactions}
          showSummary={showTransactionSummary}
          onToggleSummary={() =>
            setShowTransactionSummary(!showTransactionSummary)
          }
        />

        {/* Transaction Input */}
      </div>
      {/* Transaction Edit Dialog */}
      <TransactionInput
        onAddTransaction={addTransaction}
        recentDescriptions={recentDescriptions}
        quickActions={quickActions}
        onQuickAction={addQuickTransaction}
        className="w-full"
      />

      {/* {editingTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Edit Transaction</h3>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Toggle
                  pressed={editTransactionType === "income"}
                  onPressedChange={(pressed) =>
                    setEditTransactionType(pressed ? "income" : "expense")
                  }
                  className="data-[state=on]:bg-green-600 data-[state=on]:text-white"
                >
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Income
                </Toggle>
                <Toggle
                  pressed={editTransactionType === "expense"}
                  onPressedChange={(pressed) =>
                    setEditTransactionType(pressed ? "expense" : "income")
                  }
                  className="data-[state=on]:bg-red-600 data-[state=on]:text-white"
                >
                  <TrendingDown className="w-3 h-3 mr-1" />
                  Expense
                </Toggle>
              </div>
              <div>
                <Label htmlFor="edit-amount">Amount</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editTransactionAmount}
                  onChange={(e) => setEditTransactionAmount(e.target.value)}
                  placeholder="Amount"
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Input
                  id="edit-description"
                  value={editTransactionDescription}
                  onChange={(e) =>
                    setEditTransactionDescription(e.target.value)
                  }
                  placeholder="Description"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingTransaction(null);
                  setEditTransactionAmount("");
                  setEditTransactionDescription("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={updateTransaction}
                disabled={
                  !editTransactionAmount.trim() ||
                  !editTransactionDescription.trim()
                }
              >
                Update
              </Button>
            </div>
          </div>
        </div>
      )} */}
    </div>
  );
}
