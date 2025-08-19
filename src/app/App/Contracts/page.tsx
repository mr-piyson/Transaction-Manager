"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
    Building,
    Calendar,
    DollarSign,
    Edit,
    ExternalLink,
    FileText,
    Filter,
    Plus,
    Search,
    Trash2,
} from "lucide-react"
import { useState } from "react"

// Mock data based on the PHP structure
const mockContracts = [
  {
    id: 1,
    productName: "Microsoft Office 365 Enterprise",
    vendorName: "Microsoft Corporation",
    startDate: "2024-01-01",
    endDate: "2024-12-31",
    currency: "USD",
    cost: "15000",
    bilingCycle: "annual",
    account: "IT-DEPT-001",
    notes: "Enterprise license for 500 users",
    support: "24/7 Premium Support",
    docslink: "https://docs.microsoft.com/office365",
  },
  {
    id: 2,
    productName: "Adobe Creative Cloud",
    vendorName: "Adobe Systems",
    startDate: "2024-03-15",
    endDate: "2025-03-14",
    currency: "USD",
    cost: "8500",
    bilingCycle: "annual",
    account: "DESIGN-TEAM",
    notes: "Creative suite for design team",
    support: "Business support plan",
    docslink: "https://helpx.adobe.com/creative-cloud",
  },
  {
    id: 3,
    productName: "Salesforce CRM",
    vendorName: "Salesforce Inc",
    startDate: "2023-06-01",
    endDate: "2024-05-31",
    currency: "USD",
    cost: "25000",
    bilingCycle: "annual",
    account: "SALES-CRM-001",
    notes: "CRM system for sales team",
    support: "Premier Success Plan",
    docslink: "https://help.salesforce.com",
  },
]

export default function ContractsPage() {
  const [contracts, setContracts] = useState(mockContracts)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [selectedContract, setSelectedContract] = useState<any>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newContract, setNewContract] = useState({
    productName: "",
    vendorName: "",
    startDate: "",
    endDate: "",
    currency: "USD",
    cost: "",
    bilingCycle: "annual",
    account: "",
    notes: "",
    support: "",
    docslink: "",
  })

  // Calculate days remaining
  const getDaysRemaining = (endDate: string) => {
    const today = new Date()
    const end = new Date(endDate)
    const diffTime = end.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  // Get status badge
  const getStatusBadge = (endDate: string) => {
    const daysRemaining = getDaysRemaining(endDate)
    if (daysRemaining < 0) {
      return <Badge variant="destructive">Expired</Badge>
    } else if (daysRemaining <= 30) {
      return <Badge className="bg-orange-500 hover:bg-orange-600">Expiring Soon</Badge>
    } else {
      return <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>
    }
  }

  // Filter contracts
  const filteredContracts = contracts.filter((contract) => {
    const matchesSearch =
      contract.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.vendorName.toLowerCase().includes(searchTerm.toLowerCase())

    if (filterStatus === "all") return matchesSearch
    if (filterStatus === "active") return matchesSearch && getDaysRemaining(contract.endDate) > 0
    if (filterStatus === "expired") return matchesSearch && getDaysRemaining(contract.endDate) < 0
    if (filterStatus === "expiring")
      return matchesSearch && getDaysRemaining(contract.endDate) <= 30 && getDaysRemaining(contract.endDate) > 0

    return matchesSearch
  })

  const handleEditContract = (contract: any) => {
    setSelectedContract(contract)
    setIsEditModalOpen(true)
  }

  const handleDeleteContract = (contractId: number) => {
    if (confirm("Are you sure you want to delete this contract?")) {
      setContracts(contracts.filter((c) => c.id !== contractId))
    }
  }

  const handleAddContract = () => {
    const contractToAdd = {
      ...newContract,
      id: Math.max(...contracts.map((c) => c.id)) + 1,
    }
    setContracts([...contracts, contractToAdd])
    setIsAddModalOpen(false)
    // Reset form
    setNewContract({
      productName: "",
      vendorName: "",
      startDate: "",
      endDate: "",
      currency: "USD",
      cost: "",
      bilingCycle: "annual",
      account: "",
      notes: "",
      support: "",
      docslink: "",
    })
  }

  const handleUpdateContract = () => {
    setContracts(contracts.map((c) => (c.id === selectedContract.id ? selectedContract : c)))
    setIsEditModalOpen(false)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Contracts Management</h1>
          <p className="text-muted-foreground">Track and manage your business contracts</p>
        </div>
        <Button className="gap-2" onClick={() => setIsAddModalOpen(true)}>
          <Plus className="h-4 w-4" />
          Add New Contract
        </Button>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contracts by name or vendor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Contracts</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="expiring">Expiring Soon</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Contracts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredContracts.map((contract) => (
          <Card key={contract.id} className="hover:shadow-lg transition-shadow flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg font-semibold line-clamp-2">{contract.productName}</CardTitle>
                {getStatusBadge(contract.endDate)}
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                {/* Vendor */}
                <div className="flex items-center gap-2 text-sm">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{contract.vendorName}</span>
                </div>

                {/* Dates */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Start: {new Date(contract.startDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">End: {new Date(contract.endDate).toLocaleDateString()}</span>
                  </div>
                  {getDaysRemaining(contract.endDate) > 0 && (
                    <div className="flex items-center gap-2">
                      <div
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          getDaysRemaining(contract.endDate) <= 30
                            ? "bg-orange-100 text-orange-800 border border-orange-200"
                            : getDaysRemaining(contract.endDate) <= 90
                              ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
                              : "bg-green-100 text-green-800 border border-green-200"
                        }`}
                      >
                        {getDaysRemaining(contract.endDate)} days remaining
                      </div>
                    </div>
                  )}
                  {getDaysRemaining(contract.endDate) < 0 && (
                    <div className="flex items-center gap-2">
                      <div className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
                        Expired {Math.abs(getDaysRemaining(contract.endDate))} days ago
                      </div>
                    </div>
                  )}
                </div>

                {/* Cost */}
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold text-lg">
                    {contract.currency} {Number.parseInt(contract.cost).toLocaleString()}
                  </span>
                  <span className="text-xs text-muted-foreground capitalize">/ {contract.bilingCycle}</span>
                </div>

                {/* Account */}
                {contract.account && <div className="text-xs text-muted-foreground">Account: {contract.account}</div>}
              </div>

              <div className="flex gap-2 pt-4 mt-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditContract(contract)}
                  className="flex-1 gap-1"
                >
                  <Edit className="h-3 w-3" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteContract(contract.id)}
                  className="text-destructive hover:text-destructive-foreground hover:bg-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
                {contract.docslink && (
                  <Button variant="outline" size="sm" onClick={() => window.open(contract.docslink, "_blank")}>
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Contract Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Contract</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="add-productName">Product Name *</Label>
                <Input
                  id="add-productName"
                  value={newContract.productName}
                  onChange={(e) => setNewContract({ ...newContract, productName: e.target.value })}
                  placeholder="Enter product name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="add-vendorName">Vendor Name *</Label>
                <Input
                  id="add-vendorName"
                  value={newContract.vendorName}
                  onChange={(e) => setNewContract({ ...newContract, vendorName: e.target.value })}
                  placeholder="Enter vendor name"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="add-startDate">Start Date *</Label>
                <Input
                  id="add-startDate"
                  type="date"
                  value={newContract.startDate}
                  onChange={(e) => setNewContract({ ...newContract, startDate: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="add-endDate">End Date *</Label>
                <Input
                  id="add-endDate"
                  type="date"
                  value={newContract.endDate}
                  onChange={(e) => setNewContract({ ...newContract, endDate: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="add-currency">Currency & Cost *</Label>
                <div className="flex gap-2">
                  <Select
                    value={newContract.currency}
                    onValueChange={(value) => setNewContract({ ...newContract, currency: value })}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="BHD">BHD</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Enter cost"
                    value={newContract.cost}
                    onChange={(e) => setNewContract({ ...newContract, cost: e.target.value })}
                    className="flex-1"
                    type="number"
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="add-billingCycle">Billing Cycle</Label>
                <Select
                  value={newContract.bilingCycle}
                  onValueChange={(value) => setNewContract({ ...newContract, bilingCycle: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                    <SelectItem value="biannual">Bi-Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="add-account">Account Reference</Label>
              <Input
                id="add-account"
                value={newContract.account}
                onChange={(e) => setNewContract({ ...newContract, account: e.target.value })}
                placeholder="Enter account reference"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="add-notes">Notes</Label>
                <Textarea
                  id="add-notes"
                  value={newContract.notes}
                  onChange={(e) => setNewContract({ ...newContract, notes: e.target.value })}
                  rows={4}
                  placeholder="Contract notes and details..."
                />
              </div>
              <div>
                <Label htmlFor="add-support">Support Details</Label>
                <Textarea
                  id="add-support"
                  value={newContract.support}
                  onChange={(e) => setNewContract({ ...newContract, support: e.target.value })}
                  rows={4}
                  placeholder="Support plan and contact details..."
                />
              </div>
            </div>

            <div>
              <Label htmlFor="add-docslink">Documentation Link</Label>
              <Input
                id="add-docslink"
                value={newContract.docslink}
                onChange={(e) => setNewContract({ ...newContract, docslink: e.target.value })}
                placeholder="https://docs.example.com"
                type="url"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                className="flex-1"
                onClick={handleAddContract}
                disabled={
                  !newContract.productName ||
                  !newContract.vendorName ||
                  !newContract.startDate ||
                  !newContract.endDate ||
                  !newContract.cost
                }
              >
                Add Contract
              </Button>
              <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Contract Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Update Contract Details</DialogTitle>
          </DialogHeader>
          {selectedContract && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-productName">Product Name *</Label>
                  <Input
                    id="edit-productName"
                    value={selectedContract.productName}
                    onChange={(e) => setSelectedContract({ ...selectedContract, productName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-vendorName">Vendor Name *</Label>
                  <Input
                    id="edit-vendorName"
                    value={selectedContract.vendorName}
                    onChange={(e) => setSelectedContract({ ...selectedContract, vendorName: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-startDate">Start Date</Label>
                  <Input
                    id="edit-startDate"
                    type="date"
                    value={selectedContract.startDate}
                    onChange={(e) => setSelectedContract({ ...selectedContract, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-endDate">End Date</Label>
                  <Input
                    id="edit-endDate"
                    type="date"
                    value={selectedContract.endDate}
                    onChange={(e) => setSelectedContract({ ...selectedContract, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-currency">Currency & Cost</Label>
                  <div className="flex gap-2">
                    <Select
                      value={selectedContract.currency}
                      onValueChange={(value) => setSelectedContract({ ...selectedContract, currency: value })}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="BHD">BHD</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Cost"
                      value={selectedContract.cost}
                      onChange={(e) => setSelectedContract({ ...selectedContract, cost: e.target.value })}
                      className="flex-1"
                      type="number"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-billingCycle">Billing Cycle</Label>
                  <Select
                    value={selectedContract.bilingCycle}
                    onValueChange={(value) => setSelectedContract({ ...selectedContract, bilingCycle: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="annual">Annual</SelectItem>
                      <SelectItem value="biannual">Bi-Annual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="edit-account">Account</Label>
                <Input
                  id="edit-account"
                  value={selectedContract.account}
                  onChange={(e) => setSelectedContract({ ...selectedContract, account: e.target.value })}
                  placeholder="Account reference"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-notes">Notes</Label>
                  <Textarea
                    id="edit-notes"
                    value={selectedContract.notes}
                    onChange={(e) => setSelectedContract({ ...selectedContract, notes: e.target.value })}
                    rows={4}
                    placeholder="Contract notes..."
                  />
                </div>
                <div>
                  <Label htmlFor="edit-support">Support</Label>
                  <Textarea
                    id="edit-support"
                    value={selectedContract.support}
                    onChange={(e) => setSelectedContract({ ...selectedContract, support: e.target.value })}
                    rows={4}
                    placeholder="Support details..."
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit-docslink">Documents Link</Label>
                <Input
                  id="edit-docslink"
                  value={selectedContract.docslink}
                  onChange={(e) => setSelectedContract({ ...selectedContract, docslink: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button className="flex-1" onClick={handleUpdateContract}>
                  Update Contract
                </Button>
                <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    handleDeleteContract(selectedContract.id)
                    setIsEditModalOpen(false)
                  }}
                >
                  Delete Contract
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Empty State */}
      {filteredContracts.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No contracts found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || filterStatus !== "all"
              ? "Try adjusting your search or filter criteria"
              : "Get started by adding your first contract"}
          </p>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add New Contract
          </Button>
        </div>
      )}
    </div>
  )
}
