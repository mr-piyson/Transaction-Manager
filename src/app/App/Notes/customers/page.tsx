"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Users,
  Edit2,
  Trash2,
  Search,
  User,
  Mail,
  Phone,
} from "lucide-react";
import type { Customer, Note } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([
    {
      id: "1",
      name: "John Doe",
      email: "john@example.com",
      phone: "+1234567890",
    },
    { id: "2", name: "Jane Smith", email: "jane@example.com" },
  ]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "" });

  // Load customers and notes from localStorage on mount
  useEffect(() => {
    const savedCustomers = localStorage.getItem("transaction-customers");
    if (savedCustomers) {
      setCustomers(JSON.parse(savedCustomers));
    }

    const savedNotes = localStorage.getItem("transaction-notes");
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
  }, []);

  // Save customers to localStorage whenever customers change
  useEffect(() => {
    localStorage.setItem("transaction-customers", JSON.stringify(customers));
  }, [customers]);

  const getCustomerNotes = (customerId: string) => {
    return notes.filter((note) => note.customer?.id === customerId);
  };

  const getCustomerTotalBalance = (customerId: string) => {
    const customerNotes = getCustomerNotes(customerId);
    return customerNotes.reduce((total, note) => {
      const noteBalance = note.transactions.reduce(
        (sum, t) => sum + (t.type === "income" ? t.amount : -t.amount),
        0
      );
      return total + noteBalance;
    }, 0);
  };

  const createCustomer = () => {
    if (!formData.name.trim()) return;

    const customer: Customer = {
      id: Date.now().toString(),
      name: formData.name,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
    };

    setCustomers([...customers, customer]);
    setFormData({ name: "", email: "", phone: "" });
    setShowDialog(false);
  };

  const updateCustomer = () => {
    if (!editingCustomer || !formData.name.trim()) return;

    const updatedCustomers = customers.map((c) =>
      c.id === editingCustomer.id
        ? {
            ...c,
            name: formData.name,
            email: formData.email || undefined,
            phone: formData.phone || undefined,
          }
        : c
    );

    setCustomers(updatedCustomers);

    // Update notes that reference this customer
    const updatedNotes = notes.map((note) =>
      note.customer?.id === editingCustomer.id
        ? {
            ...note,
            customer: {
              ...editingCustomer,
              name: formData.name,
              email: formData.email || undefined,
              phone: formData.phone || undefined,
            },
          }
        : note
    );

    localStorage.setItem("transaction-notes", JSON.stringify(updatedNotes));

    setEditingCustomer(null);
    setFormData({ name: "", email: "", phone: "" });
    setShowDialog(false);
  };

  const deleteCustomer = (customerId: string) => {
    setCustomers(customers.filter((c) => c.id !== customerId));

    // Remove customer from notes
    const updatedNotes = notes.map((note) =>
      note.customer?.id === customerId ? { ...note, customer: undefined } : note
    );
    localStorage.setItem("transaction-notes", JSON.stringify(updatedNotes));
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      email: customer.email || "",
      phone: customer.phone || "",
    });
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (editingCustomer) {
      updateCustomer();
    } else {
      createCustomer();
    }
  };

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone?.includes(searchQuery)
  );

  return (
    <div className="h-full bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">•</span>
            <span className="text-lg font-medium text-foreground">
              Customers
            </span>
          </div>
          <div className="flex gap-2">
            <Link href="/App/Notes/notes">
              <Button size="sm" variant="outline">
                All Notes
              </Button>
            </Link>
            <Button
              onClick={() => setShowDialog(true)}
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Customer
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4">
        {customers.length > 0 && (
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search customers by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        )}

        {/* Customers Grid */}
        <div className="grid gap-4">
          {customers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No customers yet
              </h3>
              <p className="text-muted-foreground mb-4">
                Add your first customer to get started
              </p>
              <Button onClick={() => setShowDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Customer
              </Button>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-12">
              <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No customers found
              </h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search criteria
              </p>
              <Button variant="outline" onClick={() => setSearchQuery("")}>
                Clear Search
              </Button>
            </div>
          ) : (
            filteredCustomers.map((customer) => {
              const customerNotes = getCustomerNotes(customer.id);
              const totalBalance = getCustomerTotalBalance(customer.id);

              return (
                <Card
                  key={customer.id}
                  className="p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-foreground flex items-center gap-2">
                          <User className="w-4 h-4" />
                          {customer.name}
                        </h3>
                        {customerNotes.length > 0 && (
                          <Badge
                            variant={
                              totalBalance >= 0 ? "default" : "destructive"
                            }
                          >
                            ${Math.abs(totalBalance).toFixed(2)}
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-1 text-sm text-muted-foreground mb-3">
                        {customer.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-3 h-3" />
                            <span>{customer.email}</span>
                          </div>
                        )}
                        {customer.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-3 h-3" />
                            <span>{customer.phone}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{customerNotes.length} notes</span>
                        {customerNotes.length > 0 && (
                          <span>
                            {customerNotes.reduce(
                              (total, note) => total + note.transactions.length,
                              0
                            )}{" "}
                            transactions
                          </span>
                        )}
                      </div>

                      {customerNotes.length > 0 && (
                        <div className="mt-2">
                          <div className="flex flex-wrap gap-1">
                            {customerNotes.slice(0, 3).map((note) => (
                              <Link
                                key={note.id}
                                href={`/App/Notes/notes/${note.id}`}
                              >
                                <Badge
                                  variant="outline"
                                  className="text-xs hover:bg-accent cursor-pointer"
                                >
                                  {note.title}
                                </Badge>
                              </Link>
                            ))}
                            {customerNotes.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{customerNotes.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(customer)}
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteCustomer(customer.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Customer Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">
              {editingCustomer ? "Edit Customer" : "Add New Customer"}
            </h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="customer-name">Name *</Label>
                <Input
                  id="customer-name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Customer name"
                />
              </div>
              <div>
                <Label htmlFor="customer-email">Email</Label>
                <Input
                  id="customer-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="customer@example.com"
                />
              </div>
              <div>
                <Label htmlFor="customer-phone">Phone</Label>
                <Input
                  id="customer-phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="+1234567890"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDialog(false);
                  setEditingCustomer(null);
                  setFormData({ name: "", email: "", phone: "" });
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!formData.name.trim()}>
                {editingCustomer ? "Update" : "Create"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
