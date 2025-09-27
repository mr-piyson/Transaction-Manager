"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  Users,
  FileText,
  Plus,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from "lucide-react";
import type { Note, Customer } from "@/lib/types";
import Link from "next/link";

export default function DashboardPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState({
    totalNotes: 0,
    totalCustomers: 0,
    totalTransactions: 0,
    totalBalance: 0,
    totalIncome: 0,
    totalExpenses: 0,
  });

  // Load data on mount
  useEffect(() => {
    const savedNotes = localStorage.getItem("transaction-notes");
    const savedCustomers = localStorage.getItem("transaction-customers");

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
    }

    if (savedCustomers) {
      setCustomers(JSON.parse(savedCustomers));
    } else {
      // Set default customers if none exist
      const defaultCustomers = [
        {
          id: "1",
          name: "John Doe",
          email: "john@example.com",
          phone: "+1234567890",
        },
        { id: "2", name: "Jane Smith", email: "jane@example.com" },
      ];
      setCustomers(defaultCustomers);
      localStorage.setItem(
        "transaction-customers",
        JSON.stringify(defaultCustomers)
      );
    }
  }, []);

  // Calculate stats whenever notes change
  useEffect(() => {
    const totalTransactions = notes.reduce(
      (sum, note) => sum + note.transactions.length,
      0
    );
    const allTransactions = notes.flatMap((note) => note.transactions);

    const totalIncome = allTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = allTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    setStats({
      totalNotes: notes.length,
      totalCustomers: customers.length,
      totalTransactions,
      totalBalance: totalIncome - totalExpenses,
      totalIncome,
      totalExpenses,
    });
  }, [notes, customers]);

  const recentNotes = notes
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    .slice(0, 5);

  const getTotalBalance = (note: Note) => {
    return note.transactions.reduce(
      (sum, t) => sum + (t.type === "income" ? t.amount : -t.amount),
      0
    );
  };

  return (
    <div className="relative h-full bg-background">
      {/* Header */}
      <div className=" sticky top-0 z-10 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Link href="/App/Notes/customers">
              <Button size="sm" variant="outline">
                <Users className="w-4 h-4 mr-1" />
                Customers
              </Button>
            </Link>
            <Link href="/App/Notes/notes">
              <Button size="sm" variant="outline">
                <FileText className="w-4 h-4 mr-1" />
                All Notes
              </Button>
            </Link>
            <Link href="/App/Notes/notes">
              <Button
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="w-4 h-4 mr-1" />
                New Note
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className=" p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Notes</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats.totalNotes}
                </p>
              </div>
              <FileText className="w-8 h-8 text-primary" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Customers</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats.totalCustomers}
                </p>
              </div>
              <Users className="w-8 h-8 text-primary" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Transactions</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats.totalTransactions}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-primary" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Balance</p>
                <p
                  className={`text-2xl font-bold ${
                    stats.totalBalance >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  ${Math.abs(stats.totalBalance).toFixed(2)}
                </p>
              </div>
              {stats.totalBalance >= 0 ? (
                <TrendingUp className="w-8 h-8 text-green-600" />
              ) : (
                <TrendingDown className="w-8 h-8 text-red-600" />
              )}
            </div>
          </Card>
        </div>

        {/* Financial Overview */}
        {stats.totalTransactions > 0 && (
          <Card className="p-6 mb-8">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Financial Overview
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-1">
                  ${stats.totalIncome.toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total Income
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600 mb-1">
                  ${stats.totalExpenses.toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total Expenses
                </div>
              </div>
              <div className="text-center">
                <div
                  className={`text-3xl font-bold mb-1 ${
                    stats.totalBalance >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  ${Math.abs(stats.totalBalance).toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">Net Balance</div>
              </div>
            </div>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link href="/App/Notes/notes">
            <Card className="p-6 hover:bg-accent/50 transition-colors cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground mb-2">
                    Create New Note
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Start tracking transactions for a new project or customer
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </Card>
          </Link>

          <Link href="/App/Notes/customers">
            <Card className="p-6 hover:bg-accent/50 transition-colors cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground mb-2">
                    Manage Customers
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Add, edit, or view customer information and their notes
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </Card>
          </Link>

          <Link href="/App/Notes/notes">
            <Card className="p-6 hover:bg-accent/50 transition-colors cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground mb-2">
                    View All Notes
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Browse and search through all your transaction notes
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </Card>
          </Link>
        </div>

        {/* Recent Notes */}
        {recentNotes.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                Recent Notes
              </h3>
              <Link href="/App/Notes/notes">
                <Button variant="outline" size="sm">
                  View All
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="grid gap-4">
              {recentNotes.map((note) => (
                <Link key={note.id} href={`/App/Notes/notes/${note.id}`}>
                  <Card className="p-4 hover:bg-accent/50 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-foreground">
                            {note.title}
                          </h4>
                          <Badge
                            variant={
                              getTotalBalance(note) >= 0
                                ? "default"
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
                              <Users className="w-3 h-3" />
                              {note.customer.name}
                            </span>
                          )}
                          <span>
                            {new Date(note.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground ml-4" />
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {notes.length === 0 && (
          <Card className="p-12 text-center">
            <DollarSign className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Get Started with Transaction Notes
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Create your first transaction note to start tracking income and
              expenses. You can organize notes by customers and projects for
              better management.
            </p>
            <Link href="/App/Notes/notes">
              <Button size="lg">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Note
              </Button>
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
}
