"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Users, Edit2 } from "lucide-react"

interface Customer {
  id: string
  name: string
  email?: string
  phone?: string
}

interface CustomerManagerProps {
  customers: Customer[]
  onCreateCustomer: (customer: Omit<Customer, "id">) => void
  onUpdateCustomer: (id: string, customer: Omit<Customer, "id">) => void
  onDeleteCustomer: (id: string) => void
  onClose: () => void
}

export function CustomerManager({
  customers,
  onCreateCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  onClose,
}: CustomerManagerProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [formData, setFormData] = useState({ name: "", email: "", phone: "" })

  const handleSubmit = () => {
    if (!formData.name.trim()) return

    if (editingCustomer) {
      onUpdateCustomer(editingCustomer.id, formData)
    } else {
      onCreateCustomer(formData)
    }

    setFormData({ name: "", email: "", phone: "" })
    setEditingCustomer(null)
    setShowDialog(false)
  }

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer)
    setFormData({
      name: customer.name,
      email: customer.email || "",
      phone: customer.phone || "",
    })
    setShowDialog(true)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden">
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Customer Management</h3>
              <div className="flex gap-2">
                <Button onClick={() => setShowDialog(true)} size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Customer
                </Button>
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          </div>
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {customers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No customers yet. Add your first customer to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {customers.map((customer) => (
                  <Card key={customer.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-foreground">{customer.name}</h4>
                        <div className="text-sm text-muted-foreground space-y-1">
                          {customer.email && <p>Email: {customer.email}</p>}
                          {customer.phone && <p>Phone: {customer.phone}</p>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(customer)}>
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => onDeleteCustomer(customer.id)}>
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

      {/* Customer Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
          <Card className="w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">{editingCustomer ? "Edit Customer" : "Add New Customer"}</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="customer-name">Name *</Label>
                <Input
                  id="customer-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Customer name"
                />
              </div>
              <div>
                <Label htmlFor="customer-email">Email</Label>
                <Input
                  id="customer-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="customer@example.com"
                />
              </div>
              <div>
                <Label htmlFor="customer-phone">Phone</Label>
                <Input
                  id="customer-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1234567890"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDialog(false)
                  setEditingCustomer(null)
                  setFormData({ name: "", email: "", phone: "" })
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
    </>
  )
}
