"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    AlertTriangle,
    Archive,
    Bell,
    Check,
    Clock,
    Eye,
    EyeOff,
    Filter,
    Info,
    Laptop,
    Monitor,
    MoreVertical,
    Package,
    Printer,
    Search,
    Server,
    Shield,
    Trash2,
    User,
    Wifi,
} from "lucide-react"
import { useMemo, useState } from "react"

interface Notification {
  id: string
  type: "assignment" | "maintenance" | "alert" | "update" | "request"
  priority: "low" | "medium" | "high" | "critical"
  title: string
  message: string
  assetCode?: string
  assetName?: string
  assetType?: string
  assignedTo?: string
  assignedBy?: string
  location?: string
  department?: string
  timestamp: Date
  isRead: boolean
  isArchived: boolean
  actionRequired?: boolean
}

const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "assignment",
    priority: "medium",
    title: "PC Assigned to New Employee",
    message: "Dell OptiPlex 7090 has been assigned to John Smith in the Marketing department.",
    assetCode: "DT001",
    assetName: "Dell OptiPlex 7090",
    assetType: "Desktop",
    assignedTo: "John Smith",
    assignedBy: "IT Admin",
    location: "Floor 2",
    department: "Marketing",
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    isRead: false,
    isArchived: false,
    actionRequired: true,
  },
  {
    id: "2",
    type: "maintenance",
    priority: "high",
    title: "Printer Toner Replaced",
    message: "HP LaserJet Pro toner cartridge has been successfully replaced in the main office.",
    assetCode: "PR003",
    assetName: "HP LaserJet Pro 4025dn",
    assetType: "Printer",
    assignedBy: "Maintenance Team",
    location: "Main Office",
    department: "General",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    isRead: true,
    isArchived: false,
  },
  {
    id: "3",
    type: "alert",
    priority: "critical",
    title: "Server Maintenance Required",
    message: "HP ProLiant DL380 requires immediate attention due to high temperature alerts.",
    assetCode: "SV004",
    assetName: "HP ProLiant DL380",
    assetType: "Server",
    location: "Server Room",
    department: "Infrastructure",
    timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
    isRead: false,
    isArchived: false,
    actionRequired: true,
  },
  {
    id: "4",
    type: "update",
    priority: "low",
    title: "Asset Information Updated",
    message: "MacBook Pro specifications have been updated with new memory configuration.",
    assetCode: "LT002",
    assetName: 'MacBook Pro 16"',
    assetType: "Laptop",
    assignedTo: "Jane Doe",
    location: "Floor 3",
    department: "Design",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
    isRead: true,
    isArchived: false,
  },
  {
    id: "5",
    type: "request",
    priority: "medium",
    title: "New Equipment Request",
    message: "Development team has requested additional monitors for the new workspace setup.",
    department: "Development",
    location: "Floor 1",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 hours ago
    isRead: false,
    isArchived: false,
    actionRequired: true,
  },
  {
    id: "6",
    type: "assignment",
    priority: "low",
    title: "WiFi Access Point Deployed",
    message: "New Cisco WiFi access point has been installed and configured in Conference Room B.",
    assetCode: "WF007",
    assetName: "Cisco Aironet 2800",
    assetType: "Wifi Access Point",
    location: "Conference Room B",
    department: "General",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8), // 8 hours ago
    isRead: true,
    isArchived: false,
  },
]

const getNotificationIcon = (type: string, assetType?: string) => {
  if (assetType) {
    switch (assetType.toLowerCase()) {
      case "desktop":
      case "monitor":
        return Monitor
      case "laptop":
        return Laptop
      case "printer":
        return Printer
      case "server":
      case "blade server":
        return Server
      case "wifi access point":
        return Wifi
      case "firewall":
      case "cctv":
        return Shield
      default:
        return Package
    }
  }

  switch (type) {
    case "assignment":
      return User
    case "maintenance":
      return Package
    case "alert":
      return AlertTriangle
    case "update":
      return Info
    case "request":
      return Clock
    default:
      return Bell
  }
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "critical":
      return "bg-red-500 text-white"
    case "high":
      return "bg-orange-500 text-white"
    case "medium":
      return "bg-blue-500 text-white"
    case "low":
      return "bg-gray-500 text-white"
    default:
      return "bg-gray-500 text-white"
  }
}

const getTypeColor = (type: string) => {
  switch (type) {
    case "assignment":
      return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
    case "maintenance":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
    case "alert":
      return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
    case "update":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400"
    case "request":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400"
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
  }
}

const formatTimeAgo = (date: Date) => {
  const now = new Date()
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

  if (diffInMinutes < 1) return "Just now"
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours}h ago`

  const diffInDays = Math.floor(diffInHours / 24)
  return `${diffInDays}d ago`
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(mockNotifications)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTab, setSelectedTab] = useState("all")
  const [selectedPriority, setSelectedPriority] = useState<string[]>([])

  const filteredNotifications = useMemo(() => {
    let filtered = notifications

    // Filter by tab
    if (selectedTab === "unread") {
      filtered = filtered.filter((n) => !n.isRead)
    } else if (selectedTab === "archived") {
      filtered = filtered.filter((n) => n.isArchived)
    } else if (selectedTab === "action-required") {
      filtered = filtered.filter((n) => n.actionRequired && !n.isArchived)
    } else {
      filtered = filtered.filter((n) => !n.isArchived)
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (n) =>
          n.title.toLowerCase().includes(query) ||
          n.message.toLowerCase().includes(query) ||
          n.assetCode?.toLowerCase().includes(query) ||
          n.assetName?.toLowerCase().includes(query) ||
          n.assignedTo?.toLowerCase().includes(query) ||
          n.department?.toLowerCase().includes(query),
      )
    }

    // Filter by priority
    if (selectedPriority.length > 0) {
      filtered = filtered.filter((n) => selectedPriority.includes(n.priority))
    }

    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }, [notifications, searchQuery, selectedTab, selectedPriority])

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)))
  }

  const markAsUnread = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: false } : n)))
  }

  const archiveNotification = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isArchived: true } : n)))
  }

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
  }

  const unreadCount = notifications.filter((n) => !n.isRead && !n.isArchived).length
  const actionRequiredCount = notifications.filter((n) => n.actionRequired && !n.isArchived).length

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bell className="h-8 w-8 text-primary" />
            {unreadCount > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs bg-red-500 text-white">
                {unreadCount}
              </Badge>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold">Notifications</h1>
            <p className="text-muted-foreground">IT Asset System updates and alerts</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" onClick={markAllAsRead}>
              <Check className="h-4 w-4 mr-2" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notifications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2 bg-transparent">
              <Filter className="h-4 w-4" />
              Priority
              {selectedPriority.length > 0 && (
                <Badge variant="secondary" className="h-5 w-5 p-0 text-xs">
                  {selectedPriority.length}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {["critical", "high", "medium", "low"].map((priority) => (
              <DropdownMenuItem
                key={priority}
                onClick={() => {
                  setSelectedPriority((prev) =>
                    prev.includes(priority) ? prev.filter((p) => p !== priority) : [...prev, priority],
                  )
                }}
              >
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${getPriorityColor(priority).split(" ")[0]}`} />
                  <span className="capitalize">{priority}</span>
                  {selectedPriority.includes(priority) && <Check className="h-4 w-4 ml-auto" />}
                </div>
              </DropdownMenuItem>
            ))}
            {selectedPriority.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSelectedPriority([])}>Clear filters</DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="mb-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All ({notifications.filter((n) => !n.isArchived).length})</TabsTrigger>
          <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
          <TabsTrigger value="action-required">Action Required ({actionRequiredCount})</TabsTrigger>
          <TabsTrigger value="archived">Archived ({notifications.filter((n) => n.isArchived).length})</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="mt-6">
          {filteredNotifications.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No notifications found</h3>
                <p className="text-muted-foreground text-center">
                  {searchQuery || selectedPriority.length > 0
                    ? "Try adjusting your search or filters"
                    : selectedTab === "unread"
                      ? "All caught up! No unread notifications."
                      : selectedTab === "archived"
                        ? "No archived notifications yet."
                        : selectedTab === "action-required"
                          ? "No actions required at the moment."
                          : "No notifications to display."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredNotifications.map((notification) => {
                const Icon = getNotificationIcon(notification.type, notification.assetType)

                return (
                  <Card
                    key={notification.id}
                    className={`transition-all duration-200 hover:shadow-md ${
                      !notification.isRead ? "border-l-4 border-l-primary bg-primary/5" : ""
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={`p-2 rounded-lg ${getTypeColor(notification.type)}`}>
                            <Icon className="h-5 w-5" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3
                                className={`font-semibold ${!notification.isRead ? "text-foreground" : "text-muted-foreground"}`}
                              >
                                {notification.title}
                              </h3>
                              <Badge className={`text-xs ${getPriorityColor(notification.priority)}`}>
                                {notification.priority}
                              </Badge>
                              {notification.actionRequired && (
                                <Badge variant="outline" className="text-xs border-orange-500 text-orange-600">
                                  Action Required
                                </Badge>
                              )}
                            </div>

                            <p className="text-sm text-muted-foreground mb-3">{notification.message}</p>

                            {/* Asset Details */}
                            {notification.assetCode && (
                              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mb-2">
                                <div className="flex items-center gap-1">
                                  <span className="font-medium">Asset:</span>
                                  <Badge variant="secondary" className="text-xs">
                                    {notification.assetCode}
                                  </Badge>
                                </div>
                                {notification.assetName && <span>{notification.assetName}</span>}
                                {notification.location && <span>📍 {notification.location}</span>}
                                {notification.department && <span>🏢 {notification.department}</span>}
                              </div>
                            )}

                            {/* Assignment Details */}
                            {(notification.assignedTo || notification.assignedBy) && (
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                {notification.assignedTo && (
                                  <div className="flex items-center gap-1">
                                    <span>Assigned to:</span>
                                    <span className="font-medium">{notification.assignedTo}</span>
                                  </div>
                                )}
                                {notification.assignedBy && (
                                  <div className="flex items-center gap-1">
                                    <span>By:</span>
                                    <span className="font-medium">{notification.assignedBy}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatTimeAgo(notification.timestamp)}
                          </span>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {notification.isRead ? (
                                <DropdownMenuItem onClick={() => markAsUnread(notification.id)}>
                                  <EyeOff className="h-4 w-4 mr-2" />
                                  Mark as unread
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => markAsRead(notification.id)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Mark as read
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => archiveNotification(notification.id)}>
                                <Archive className="h-4 w-4 mr-2" />
                                Archive
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => deleteNotification(notification.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
