"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Toggle } from "@/components/ui/toggle";
import {
  Plus,
  Send,
  User,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Edit2,
  Search,
  MoreVertical,
  Trash2,
  Copy,
  Filter,
  Coffee,
  Car,
  Home,
  ShoppingBag,
  Utensils,
  Zap,
  AlertCircle,
  CheckCircle,
  BarChart3,
  Download,
} from "lucide-react";

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface Transaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  timestamp: Date;
}

interface Note {
  id: string;
  title: string;
  customer?: Customer;
  transactions: Transaction[];
  createdAt: Date;
  updatedAt: Date;
}

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

export default function TransactionNotesApp() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([
    {
      id: "1",
      name: "John Doe",
      email: "john@example.com",
      phone: "+1234567890",
    },
    { id: "2", name: "Jane Smith", email: "jane@example.com" },
  ]);
  const [newTransaction, setNewTransaction] = useState("");
  const [showNewNote, setShowNewNote] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [showCustomerManager, setShowCustomerManager] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<
    "newest" | "oldest" | "title" | "balance"
  >("newest");
  const [filterBy, setFilterBy] = useState<
    "all" | "with-customer" | "without-customer"
  >("all");
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editNoteTitle, setEditNoteTitle] = useState("");
  const [inputMode, setInputMode] = useState<"simple" | "detailed">("simple");
  const [transactionType, setTransactionType] = useState<"income" | "expense">(
    "expense"
  );
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [parseError, setParseError] = useState("");
  const [recentDescriptions, setRecentDescriptions] = useState<string[]>([]);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [transactionSearchQuery, setTransactionSearchQuery] = useState("");
  const [transactionSortBy, setTransactionSortBy] = useState<
    "newest" | "oldest" | "amount" | "type"
  >("newest");
  const [transactionFilterBy, setTransactionFilterBy] = useState<
    "all" | "income" | "expense"
  >("all");
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [editTransactionAmount, setEditTransactionAmount] = useState("");
  const [editTransactionDescription, setEditTransactionDescription] =
    useState("");
  const [editTransactionType, setEditTransactionType] = useState<
    "income" | "expense"
  >("expense");
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>(
    []
  );
  const [showTransactionSummary, setShowTransactionSummary] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("recentDescriptions");
    if (saved) {
      setRecentDescriptions(JSON.parse(saved));
    }
  }, []);

  const parseTransaction = (
    input: string
  ): Omit<Transaction, "id" | "timestamp"> | null => {
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
          type = ["expense", "out", "e"].includes(typeStr.toLowerCase())
            ? "expense"
            : "income";
          amount = Number.parseFloat(amountStr);
          description = desc.trim();
        } else if (pattern === patterns[2]) {
          const [, amountStr, typeStr, desc] = match;
          type = ["expense", "out", "e"].includes(typeStr.toLowerCase())
            ? "expense"
            : "income";
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

  const addTransaction = () => {
    if (!activeNote) return;

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

    const transaction: Transaction = {
      id: Date.now().toString(),
      ...parsed,
      timestamp: new Date(),
    };

    const updatedNote = {
      ...activeNote,
      transactions: [...activeNote.transactions, transaction],
      updatedAt: new Date(),
    };

    setNotes(
      notes.map((note) => (note.id === activeNote.id ? updatedNote : note))
    );
    setActiveNote(updatedNote);

    const newRecentDescriptions = [
      parsed.description,
      ...recentDescriptions.filter((d) => d !== parsed.description),
    ].slice(0, 10);
    setRecentDescriptions(newRecentDescriptions);
    localStorage.setItem(
      "recentDescriptions",
      JSON.stringify(newRecentDescriptions)
    );

    setNewTransaction("");
    setAmount("");
    setDescription("");
    setParseError("");
    setSuggestions([]);
  };

  const addQuickTransaction = (action: (typeof quickActions)[0]) => {
    if (!activeNote) return;

    const transaction: Transaction = {
      id: Date.now().toString(),
      type: action.type,
      amount: action.amount,
      description: action.label,
      timestamp: new Date(),
    };

    const updatedNote = {
      ...activeNote,
      transactions: [...activeNote.transactions, transaction],
      updatedAt: new Date(),
    };

    setNotes(
      notes.map((note) => (note.id === activeNote.id ? updatedNote : note))
    );
    setActiveNote(updatedNote);
    setShowQuickActions(false);
  };

  const updateTransaction = () => {
    if (
      !editingTransaction ||
      !activeNote ||
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
      ...activeNote,
      transactions: activeNote.transactions.map((t) =>
        t.id === editingTransaction.id ? updatedTransaction : t
      ),
      updatedAt: new Date(),
    };

    setNotes(
      notes.map((note) => (note.id === activeNote.id ? updatedNote : note))
    );
    setActiveNote(updatedNote);
    setEditingTransaction(null);
    setEditTransactionAmount("");
    setEditTransactionDescription("");
  };

  const deleteTransaction = (transactionId: string) => {
    if (!activeNote) return;

    const updatedNote = {
      ...activeNote,
      transactions: activeNote.transactions.filter(
        (t) => t.id !== transactionId
      ),
      updatedAt: new Date(),
    };

    setNotes(
      notes.map((note) => (note.id === activeNote.id ? updatedNote : note))
    );
    setActiveNote(updatedNote);
    setSelectedTransactions(
      selectedTransactions.filter((id) => id !== transactionId)
    );
  };

  const duplicateTransaction = (transactionId: string) => {
    if (!activeNote) return;

    const originalTransaction = activeNote.transactions.find(
      (t) => t.id === transactionId
    );
    if (!originalTransaction) return;

    const duplicatedTransaction: Transaction = {
      ...originalTransaction,
      id: Date.now().toString(),
      timestamp: new Date(),
    };

    const updatedNote = {
      ...activeNote,
      transactions: [...activeNote.transactions, duplicatedTransaction],
      updatedAt: new Date(),
    };

    setNotes(
      notes.map((note) => (note.id === activeNote.id ? updatedNote : note))
    );
    setActiveNote(updatedNote);
  };

  const deleteSelectedTransactions = () => {
    if (!activeNote || selectedTransactions.length === 0) return;

    const updatedNote = {
      ...activeNote,
      transactions: activeNote.transactions.filter(
        (t) => !selectedTransactions.includes(t.id)
      ),
      updatedAt: new Date(),
    };

    setNotes(
      notes.map((note) => (note.id === activeNote.id ? updatedNote : note))
    );
    setActiveNote(updatedNote);
    setSelectedTransactions([]);
  };

  const exportTransactions = () => {
    if (!activeNote) return;

    const csvContent = [
      "Date,Type,Amount,Description",
      ...activeNote.transactions.map(
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
    a.download = `${activeNote.title}-transactions.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDescriptionChange = (value: string) => {
    setDescription(value);
    if (value.length > 0) {
      const filtered = recentDescriptions.filter((desc) =>
        desc.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filtered.slice(0, 5));
    } else {
      setSuggestions([]);
    }
  };

  const createNote = () => {
    if (!newNoteTitle.trim()) return;

    const selectedCustomer = selectedCustomerId
      ? customers.find((c) => c.id === selectedCustomerId)
      : undefined;

    const note: Note = {
      id: Date.now().toString(),
      title: newNoteTitle,
      customer: selectedCustomer,
      transactions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setNotes([...notes, note]);
    setActiveNote(note);
    setNewNoteTitle("");
    setSelectedCustomerId("");
    setShowNewNote(false);
  };

  const updateNote = () => {
    if (!editingNote || !editNoteTitle.trim()) return;

    const updatedNote = {
      ...editingNote,
      title: editNoteTitle,
      updatedAt: new Date(),
    };
    setNotes(
      notes.map((note) => (note.id === editingNote.id ? updatedNote : note))
    );

    if (activeNote?.id === editingNote.id) {
      setActiveNote(updatedNote);
    }

    setEditingNote(null);
    setEditNoteTitle("");
  };

  const duplicateNote = (noteId: string) => {
    const originalNote = notes.find((n) => n.id === noteId);
    if (!originalNote) return;

    const duplicatedNote: Note = {
      ...originalNote,
      id: Date.now().toString(),
      title: `${originalNote.title} (Copy)`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setNotes([...notes, duplicatedNote]);
  };

  const deleteNote = (noteId: string) => {
    setNotes(notes.filter((n) => n.id !== noteId));
    if (activeNote?.id === noteId) {
      setActiveNote(null);
    }
  };

  const createCustomer = () => {
    if (!newCustomer.name.trim()) return;

    const customer: Customer = {
      id: Date.now().toString(),
      name: newCustomer.name,
      email: newCustomer.email || undefined,
      phone: newCustomer.phone || undefined,
    };

    setCustomers([...customers, customer]);
    setNewCustomer({ name: "", email: "", phone: "" });
    setShowCustomerDialog(false);
  };

  const updateCustomer = () => {
    if (!editingCustomer || !newCustomer.name.trim()) return;

    setCustomers(
      customers.map((c) =>
        c.id === editingCustomer.id
          ? {
              ...c,
              name: newCustomer.name,
              email: newCustomer.email || undefined,
              phone: newCustomer.phone || undefined,
            }
          : c
      )
    );

    // Update notes that reference this customer
    setNotes(
      notes.map((note) =>
        note.customer?.id === editingCustomer.id
          ? {
              ...note,
              customer: {
                ...editingCustomer,
                name: newCustomer.name,
                email: newCustomer.email || undefined,
                phone: newCustomer.phone || undefined,
              },
            }
          : note
      )
    );

    setEditingCustomer(null);
    setNewCustomer({ name: "", email: "", phone: "" });
    setShowCustomerDialog(false);
  };

  const deleteCustomer = (customerId: string) => {
    setCustomers(customers.filter((c) => c.id !== customerId));
    // Remove customer from notes
    setNotes(
      notes.map((note) =>
        note.customer?.id === customerId
          ? { ...note, customer: undefined }
          : note
      )
    );
  };

  const getTotalBalance = (note: Note) => {
    return note.transactions.reduce(
      (sum, t) => sum + (t.type === "income" ? t.amount : -t.amount),
      0
    );
  };

  const getTransactionSummary = (transactions: Transaction[]) => {
    const income = transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
    return { income, expenses, balance: income - expenses };
  };

  const filteredAndSortedNotes = notes
    .filter((note) => {
      // Search filter
      const matchesSearch =
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.customer?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.transactions.some((t) =>
          t.description.toLowerCase().includes(searchQuery.toLowerCase())
        );

      // Customer filter
      const matchesFilter =
        filterBy === "all" ||
        (filterBy === "with-customer" && note.customer) ||
        (filterBy === "without-customer" && !note.customer);

      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return (
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
        case "oldest":
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        case "title":
          return a.title.localeCompare(b.title);
        case "balance":
          return getTotalBalance(b) - getTotalBalance(a);
        default:
          return 0;
      }
    });

  const filteredAndSortedTransactions = activeNote
    ? activeNote.transactions
        .filter((transaction) => {
          const matchesSearch =
            transaction.description
              .toLowerCase()
              .includes(transactionSearchQuery.toLowerCase()) ||
            transaction.amount.toString().includes(transactionSearchQuery);

          const matchesFilter =
            transactionFilterBy === "all" ||
            (transactionFilterBy === "income" &&
              transaction.type === "income") ||
            (transactionFilterBy === "expense" &&
              transaction.type === "expense");

          return matchesSearch && matchesFilter;
        })
        .sort((a, b) => {
          switch (transactionSortBy) {
            case "newest":
              return (
                new Date(b.timestamp).getTime() -
                new Date(a.timestamp).getTime()
              );
            case "oldest":
              return (
                new Date(a.timestamp).getTime() -
                new Date(b.timestamp).getTime()
              );
            case "amount":
              return b.amount - a.amount;
            case "type":
              return a.type.localeCompare(b.type);
            default:
              return 0;
          }
        })
    : [];

  return (
    <div className=" bg-background">
      {/* Header */}
      {/* <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button
              onClick={() => setShowCustomerManager(true)}
              size="sm"
              variant="outline"
            >
              <Users className="w-4 h-4 mr-1" />
              Customers
            </Button>
            <Button
              onClick={() => setShowNewNote(true)}
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-1" />
              New Note
            </Button>
          </div>
        </div>
      </div> */}

      {/* Main Content */}
      <div className="flex flex-col h-full">
        {/* Notes List or Active Note */}
        <div className="flex-1 overflow-y-auto p-4 pb-32">
          {!activeNote ? (
            <div>
              {notes.length > 0 && (
                <div className="mb-6 space-y-4">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search notes, customers, or transactions..."
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
                          All Notes {filterBy === "all" && "✓"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setFilterBy("with-customer")}
                        >
                          With Customer {filterBy === "with-customer" && "✓"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setFilterBy("without-customer")}
                        >
                          Without Customer{" "}
                          {filterBy === "without-customer" && "✓"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex gap-2">
                    <Label className="text-sm text-muted-foreground self-center">
                      Sort by:
                    </Label>
                    <Select
                      value={sortBy}
                      onValueChange={(value: any) => setSortBy(value)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">Newest</SelectItem>
                        <SelectItem value="oldest">Oldest</SelectItem>
                        <SelectItem value="title">Title</SelectItem>
                        <SelectItem value="balance">Balance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Notes Grid */}
              <div className="grid gap-4">
                {notes.length === 0 ? (
                  <div className="text-center py-12">
                    <DollarSign className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      No notes yet
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Create your first transaction note to get started
                    </p>
                    <Button onClick={() => setShowNewNote(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Note
                    </Button>
                  </div>
                ) : filteredAndSortedNotes.length === 0 ? (
                  <div className="text-center py-12">
                    <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      No notes found
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Try adjusting your search or filter criteria
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchQuery("");
                        setFilterBy("all");
                      }}
                    >
                      Clear Filters
                    </Button>
                  </div>
                ) : (
                  filteredAndSortedNotes.map((note) => (
                    <Card
                      key={note.id}
                      className="p-4 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => setActiveNote(note)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-medium text-foreground">
                              {note.title}
                            </h3>
                            <Badge
                              variant={
                                getTotalBalance(note) >= 0
                                  ? "success"
                                  : "destructive"
                              }
                            >
                              ${Math.abs(getTotalBalance(note)).toFixed(2)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{note.transactions.length} transactions</span>
                            {note.customer && (
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {note.customer.name}
                              </span>
                            )}
                            <span>
                              {new Date(note.updatedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingNote(note);
                                setEditNoteTitle(note.title);
                              }}
                            >
                              <Edit2 className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => duplicateNote(note.id)}
                            >
                              <Copy className="w-4 h-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => deleteNote(note.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          ) : (
            /* Active Note View */
            <div>
              <div className="flex items-center gap-2 mb-6">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveNote(null)}
                >
                  ← Back
                </Button>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-foreground">
                    {activeNote.title}
                  </h2>
                  {activeNote.customer && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                      <User className="w-3 h-3" />
                      <span>{activeNote.customer.name}</span>
                      {activeNote.customer.email && (
                        <span className="text-xs">
                          • {activeNote.customer.email}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setShowTransactionSummary(!showTransactionSummary)
                    }
                  >
                    <BarChart3 className="w-4 h-4 mr-1" />
                    Summary
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportTransactions}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Export
                  </Button>
                </div>
              </div>

              {/* Transaction Summary */}
              {showTransactionSummary && activeNote.transactions.length > 0 && (
                <Card className="p-4 mb-6">
                  <h3 className="font-medium text-foreground mb-3">
                    Transaction Summary
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    {(() => {
                      const summary = getTransactionSummary(
                        activeNote.transactions
                      );
                      return (
                        <>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">
                              ${summary.income.toFixed(2)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Income
                            </div>
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
                                summary.balance >= 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              ${Math.abs(summary.balance).toFixed(2)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Balance
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </Card>
              )}

              {/* Transaction Filters and Controls */}
              {activeNote.transactions.length > 0 && (
                <div className="mb-4 space-y-3">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search transactions..."
                        value={transactionSearchQuery}
                        onChange={(e) =>
                          setTransactionSearchQuery(e.target.value)
                        }
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
                        <DropdownMenuItem
                          onClick={() => setTransactionFilterBy("all")}
                        >
                          All {transactionFilterBy === "all" && "✓"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setTransactionFilterBy("income")}
                        >
                          Income {transactionFilterBy === "income" && "✓"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setTransactionFilterBy("expense")}
                        >
                          Expenses {transactionFilterBy === "expense" && "✓"}
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
                        value={transactionSortBy}
                        onValueChange={(value: any) =>
                          setTransactionSortBy(value)
                        }
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
                      {activeNote.transactions.length === 0
                        ? "No transactions yet. Add your first transaction below."
                        : "No transactions match your search criteria."}
                    </p>
                  </div>
                ) : (
                  filteredAndSortedTransactions.map((transaction) => (
                    <Card key={transaction.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectedTransactions.includes(
                              transaction.id
                            )}
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
                                onClick={() => {
                                  setEditingTransaction(transaction);
                                  setEditTransactionAmount(
                                    transaction.amount.toString()
                                  );
                                  setEditTransactionDescription(
                                    transaction.description
                                  );
                                  setEditTransactionType(transaction.type);
                                }}
                              >
                                <Edit2 className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  duplicateTransaction(transaction.id)
                                }
                              >
                                <Copy className="w-4 h-4 mr-2" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  deleteTransaction(transaction.id)
                                }
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
          )}
        </div>

        {/* Enhanced Transaction Input (only show when note is active) */}
        {activeNote && (
          <div className=" bottom-0 left-0 right-0 bg-card border-t border-border">
            {/* Quick Actions Bar */}
            {showQuickActions && (
              <div className="p-3 border-b border-border">
                <div className="flex gap-2 overflow-x-auto">
                  {quickActions.map((action) => (
                    <Button
                      key={action.label}
                      variant="outline"
                      size="sm"
                      onClick={() => addQuickTransaction(action)}
                      className="flex items-center gap-1 whitespace-nowrap"
                    >
                      <action.icon className="w-3 h-3" />${action.amount}{" "}
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4">
              {/* Input Mode Toggle */}
              <div className="flex items-center gap-2 mb-3">
                <Toggle
                  pressed={inputMode === "detailed"}
                  onPressedChange={(pressed) =>
                    setInputMode(pressed ? "detailed" : "simple")
                  }
                  size="sm"
                >
                  Detailed
                </Toggle>
                <Toggle
                  pressed={showQuickActions}
                  onPressedChange={setShowQuickActions}
                  size="sm"
                >
                  Quick Actions
                </Toggle>
                {inputMode === "detailed" && (
                  <div className="flex gap-1 ml-auto">
                    <Toggle
                      pressed={transactionType === "income"}
                      onPressedChange={(pressed) =>
                        setTransactionType(pressed ? "income" : "expense")
                      }
                      size="sm"
                      className="data-[state=on]:bg-green-600 data-[state=on]:text-white"
                    >
                      <TrendingUp className="w-3 h-3 mr-1" />
                      Income
                    </Toggle>
                    <Toggle
                      pressed={transactionType === "expense"}
                      onPressedChange={(pressed) =>
                        setTransactionType(pressed ? "expense" : "income")
                      }
                      size="sm"
                      className="data-[state=on]:bg-red-600 data-[state=on]:text-white"
                    >
                      <TrendingDown className="w-3 h-3 mr-1" />
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
                      onChange={(e) => {
                        setNewTransaction(e.target.value);
                        setParseError("");
                      }}
                      placeholder="e.g., +100 Coffee sales or -50 Office supplies"
                      className={`flex-1 ${parseError ? "border-red-500" : ""}`}
                      onKeyPress={(e) => e.key === "Enter" && addTransaction()}
                    />
                    <Button
                      onClick={addTransaction}
                      disabled={!newTransaction.trim()}
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                  {parseError ? (
                    <div className="flex items-center gap-1 text-xs text-red-600">
                      <AlertCircle className="w-3 h-3" />
                      {parseError}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Format: +amount description (income) or -amount
                      description (expense)
                    </p>
                  )}
                </div>
              ) : (
                /* Detailed Input Mode */
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        value={amount}
                        onChange={(e) => {
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
                        onChange={(e) =>
                          handleDescriptionChange(e.target.value)
                        }
                        placeholder="Description"
                        className={parseError ? "border-red-500" : ""}
                        onKeyPress={(e) =>
                          e.key === "Enter" && addTransaction()
                        }
                      />
                      {suggestions.length > 0 && (
                        <div className="absolute bottom-full left-0 right-0 bg-popover border border-border rounded-md shadow-md mb-1 max-h-32 overflow-y-auto">
                          {suggestions.map((suggestion, index) => (
                            <button
                              key={index}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                              onClick={() => {
                                setDescription(suggestion);
                                setSuggestions([]);
                              }}
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button
                      onClick={addTransaction}
                      disabled={!amount.trim() || !description.trim()}
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
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
        )}
      </div>

      {/* Transaction Edit Dialog */}
      {editingTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md p-6">
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
          </Card>
        </div>
      )}

      {editingNote && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Edit Note</h3>
            <div>
              <Label htmlFor="edit-note-title">Note Title</Label>
              <Input
                id="edit-note-title"
                value={editNoteTitle}
                onChange={(e) => setEditNoteTitle(e.target.value)}
                placeholder="Note title"
                onKeyPress={(e) => e.key === "Enter" && updateNote()}
              />
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingNote(null);
                  setEditNoteTitle("");
                }}
              >
                Cancel
              </Button>
              <Button onClick={updateNote} disabled={!editNoteTitle.trim()}>
                Update
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Customer Dialog */}
      {showCustomerDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
          <Card className="w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">
              {editingCustomer ? "Edit Customer" : "Add New Customer"}
            </h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="customer-name">Name *</Label>
                <Input
                  id="customer-name"
                  value={newCustomer.name}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, name: e.target.value })
                  }
                  placeholder="Customer name"
                />
              </div>
              <div>
                <Label htmlFor="customer-email">Email</Label>
                <Input
                  id="customer-email"
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, email: e.target.value })
                  }
                  placeholder="customer@example.com"
                />
              </div>
              <div>
                <Label htmlFor="customer-phone">Phone</Label>
                <Input
                  id="customer-phone"
                  value={newCustomer.phone}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, phone: e.target.value })
                  }
                  placeholder="+1234567890"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCustomerDialog(false);
                  setEditingCustomer(null);
                  setNewCustomer({ name: "", email: "", phone: "" });
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={editingCustomer ? updateCustomer : createCustomer}
                disabled={!newCustomer.name.trim()}
              >
                {editingCustomer ? "Update" : "Create"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Customer Manager */}
      {showCustomerManager && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Customer Management</h3>
                <div className="flex gap-2">
                  <Button onClick={() => setShowCustomerDialog(true)} size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    Add Customer
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowCustomerManager(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {customers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No customers yet. Add your first customer to get started.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {customers.map((customer) => (
                    <Card key={customer.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-foreground">
                            {customer.name}
                          </h4>
                          <div className="text-sm text-muted-foreground space-y-1">
                            {customer.email && <p>Email: {customer.email}</p>}
                            {customer.phone && <p>Phone: {customer.phone}</p>}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingCustomer(customer);
                              setNewCustomer({
                                name: customer.name,
                                email: customer.email || "",
                                phone: customer.phone || "",
                              });
                              setShowCustomerDialog(true);
                            }}
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteCustomer(customer.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* New Note Dialog */}
      {showNewNote && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Create New Note</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="note-title">Note Title</Label>
                <Input
                  id="note-title"
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  placeholder="Note title (e.g., Client Project, Personal Expenses)"
                  onKeyPress={(e) => e.key === "Enter" && createNote()}
                />
              </div>
              <div>
                <Label htmlFor="customer-select">
                  Assign to Customer (Optional)
                </Label>
                <div className="flex gap-2">
                  <Select
                    value={selectedCustomerId}
                    onValueChange={setSelectedCustomerId}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCustomerDialog(true)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <Button variant="outline" onClick={() => setShowNewNote(false)}>
                Cancel
              </Button>
              <Button onClick={createNote} disabled={!newNoteTitle.trim()}>
                Create
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
