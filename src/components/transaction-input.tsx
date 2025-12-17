"use client";

import { AlertCircle, CheckCircle, Send, TrendingDown, TrendingUp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";

interface Transaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  timestamp: Date;
}

interface TransactionInputProps {
  onAddTransaction: (transaction: Omit<Transaction, "id" | "timestamp">) => void;
  recentDescriptions: string[];
  quickActions: Array<{
    icon: any;
    label: string;
    amount: number;
    type: "income" | "expense";
  }>;
  [key: string]: any;
  onQuickAction: (action: any) => void;
}

export function TransactionInput({ onAddTransaction, recentDescriptions, quickActions, onQuickAction, ...props }: TransactionInputProps) {
  const [newTransaction, setNewTransaction] = useState("");
  const [inputMode, setInputMode] = useState<"simple" | "detailed">("simple");
  const [transactionType, setTransactionType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [parseError, setParseError] = useState("");
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const parseTransaction = (input: string): Omit<Transaction, "id" | "timestamp"> | null => {
    const patterns = [
      /^([+-]?)(\d+(?:\.\d{2})?)\s+(.+)$/,
      /^(income|expense|in|out|i|e)\s+(\d+(?:\.\d{2})?)\s+(.+)$/i,
      /^(\d+(?:\.\d{2})?)\s+(income|expense|in|out|i|e)\s+(.+)$/i,
      /^(\d+(?:\.\d{2})?)\s+(.+)$/,
    ];

    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) {
        let type: "income" | "expense";
        let amount: number;
        let description: string;

        if (pattern === patterns[0]) {
          const [, sign, amountStr, desc] = match;
          type = sign === "-" ? "expense" : "income";
          amount = Number.parseFloat(amountStr);
          description = desc.trim();
        } else if (pattern === patterns[1]) {
          const [, typeStr, amountStr, desc] = match;
          type = ["expense", "out", "e"].includes(typeStr.toLowerCase()) ? "expense" : "income";
          amount = Number.parseFloat(amountStr);
          description = desc.trim();
        } else if (pattern === patterns[2]) {
          const [, amountStr, typeStr, desc] = match;
          type = ["expense", "out", "e"].includes(typeStr.toLowerCase()) ? "expense" : "income";
          amount = Number.parseFloat(amountStr);
          description = desc.trim();
        } else {
          const [, amountStr, desc] = match;
          type = transactionType;
          amount = Number.parseFloat(amountStr);
          description = desc.trim();
        }

        if (isNaN(amount) || amount <= 0) return null;
        return { type, amount, description };
      }
    }
    return null;
  };

  const handleAddTransaction = () => {
    let parsed: Omit<Transaction, "id" | "timestamp"> | null = null;
    setParseError("");

    if (inputMode === "detailed") {
      if (!amount.trim() || !description.trim()) {
        setParseError("Please enter both amount and description");
        return;
      }
      const numAmount = Number.parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        setParseError("Please enter a valid amount");
        return;
      }
      parsed = {
        type: transactionType,
        amount: numAmount,
        description: description.trim(),
      };
    } else {
      if (!newTransaction.trim()) return;
      parsed = parseTransaction(newTransaction);
      if (!parsed) {
        setParseError("Invalid format. Try: +100 Coffee or -50 Gas");
        return;
      }
    }

    onAddTransaction(parsed);
    setNewTransaction("");
    setAmount("");
    setDescription("");
    setParseError("");
    setSuggestions([]);
  };

  const handleDescriptionChange = (value: string) => {
    setDescription(value);
    if (value.length > 0) {
      const filtered = recentDescriptions.filter(desc => desc.toLowerCase().includes(value.toLowerCase()));
      setSuggestions(filtered.slice(0, 5));
    } else {
      setSuggestions([]);
    }
  };

  return (
    <div className={cn(" bg-card border-t border-border", props.className)}>
      {/* Quick Actions Bar */}
      {showQuickActions && (
        <div className="p-3 border-b border-border">
          <div className="flex gap-2 overflow-x-auto">
            {quickActions.map(action => (
              <Button key={action.label} variant="outline" size="sm" onClick={() => onQuickAction(action)} className="flex items-center gap-1 whitespace-nowrap">
                <action.icon className="w-3 h-3" />${action.amount} {action.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="relative p-4">
        {/* Input Mode Toggle */}
        <div className="flex items-center gap-2 mb-3">
          <Toggle pressed={inputMode === "detailed"} onPressedChange={pressed => setInputMode(pressed ? "detailed" : "simple")} size="sm">
            Detailed
          </Toggle>
          <Toggle pressed={showQuickActions} onPressedChange={setShowQuickActions} size="sm">
            Quick Actions
          </Toggle>
          {inputMode === "detailed" && (
            <div className="flex gap-1 ml-auto">
              <Toggle
                pressed={transactionType === "income"}
                onPressedChange={pressed => setTransactionType(pressed ? "income" : "expense")}
                size="sm"
                className="data-[state=on]:bg-green-600 data-[state=on]:text-white"
              >
                <TrendingUp className="w-3 h-3 ps-1" />
                Income
              </Toggle>
              <Toggle
                pressed={transactionType === "expense"}
                onPressedChange={pressed => setTransactionType(pressed ? "expense" : "income")}
                size="sm"
                className="data-[state=on]:bg-red-600 data-[state=on]:text-white"
              >
                <TrendingDown className="w-3 h-3 ps-1" />
                Expense
              </Toggle>
            </div>
          )}
        </div>

        {inputMode === "simple" ? (
          /* Simple Input Mode */
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={newTransaction}
                onChange={e => {
                  setNewTransaction(e.target.value);
                  setParseError("");
                }}
                placeholder="e.g., +100 Coffee sales or -50 Office supplies"
                className={`flex-1 ${parseError ? "border-red-500" : ""}`}
                onKeyPress={e => e.key === "Enter" && handleAddTransaction()}
              />
              <Button onClick={handleAddTransaction} disabled={!newTransaction.trim()} className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Send className="w-4 h-4" />
              </Button>
            </div>
            {parseError ? (
              <div className="flex items-center gap-1 text-xs text-red-600">
                <AlertCircle className="w-3 h-3" />
                {parseError}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Format: +amount description (income) or -amount description (expense)</p>
            )}
          </div>
        ) : (
          /* Detailed Input Mode */
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  value={amount}
                  onChange={e => {
                    setAmount(e.target.value);
                    setParseError("");
                  }}
                  placeholder="Amount"
                  type="number"
                  step="0.01"
                  min="0"
                  className={parseError ? "border-red-500" : ""}
                />
              </div>
              <div className="flex-[2] relative">
                <Input
                  value={description}
                  onChange={e => handleDescriptionChange(e.target.value)}
                  placeholder="Description"
                  className={parseError ? "border-red-500" : ""}
                  onKeyPress={e => e.key === "Enter" && handleAddTransaction()}
                />
                {suggestions.length > 0 && (
                  <div className="absolute bottom-full left-0 right-0 bg-popover border border-border rounded-md shadow-md mb-1 max-h-32 overflow-y-auto">
                    {suggestions.map((suggestion, index) => (
                      <Button
                        key={index}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                        onClick={() => {
                          setDescription(suggestion);
                          setSuggestions([]);
                        }}
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
              <Button onClick={handleAddTransaction} disabled={!amount.trim() || !description.trim()} className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Send className="w-4 h-4" />
              </Button>
            </div>
            {parseError ? (
              <div className="flex items-center gap-1 text-xs text-red-600">
                <AlertCircle className="w-3 h-3" />
                {parseError}
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <CheckCircle className="w-3 h-3" />
                Enter amount and description separately
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
