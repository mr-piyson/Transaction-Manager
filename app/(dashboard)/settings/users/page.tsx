'use client';

import {
  ChevronLeft,
  ChevronRight,
  Crown,
  KeyRound,
  Loader2,
  Mail,
  MoreHorizontal,
  Pencil,
  Search,
  Shield,
  Trash2,
  UserPlus,
  Users,
  X,
  CheckCircle2,
  UserCheck,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { alert } from '@/components/Alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from '@/components/ui/table';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty';
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from '@/components/ui/hover-card';
import { trpc } from '@/lib/trpc/client';
import { cn } from '@/lib/utils';

// Helper component for role symbol indicator
function RoleIcon({ name, icon, color }: { name: string; icon: string | null; color: string | null }) {
  const bg = color ?? '#6b7280';
  const iconMap: Record<string, string> = {
    shield: '🛡', crown: '👑', eye: '👁', briefcase: '💼',
    calculator: '📊', package: '📦', 'trending-up': '📈',
  };
  return (
    <div className="size-6 rounded flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm transition-transform hover:scale-105" style={{ backgroundColor: bg }}>
      {icon ? iconMap[icon] ?? '⚙' : name.charAt(0).toUpperCase()}
    </div>
  );
}

// Subcomponent to fetch and render list of permissions inside HoverCard
function HoverCardPermissionsList({ roleId, t }: { roleId: string; t: any }) {
  const { data: perms, isLoading } = trpc.users.rolePermissions.list.useQuery({ roleId }, { enabled: !!roleId });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
        <Loader2 className="size-3 animate-spin" />
        {t('common.loading')}
      </div>
    );
  }

  if (!perms?.length) {
    return <span className="text-xs text-muted-foreground italic">{t('users.noPermissions')}</span>;
  }

  return (
    <div className="space-y-1">
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
        {t('users.permissions')} ({perms.length})
      </span>
      <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto pr-1">
        {perms.map((p) => (
          <Badge key={p.code} variant="outline" className="text-[9px] px-1 py-0.5 leading-none">
            {p.label}
          </Badge>
        ))}
      </div>
    </div>
  );
}

export default function UsersSettingsPage() {
  const t = useTranslations();
  const utils = trpc.useUtils();

  // ── Data Query ───────────────────────────────────────────────────────────
  const { data: users, isLoading } = trpc.users.list.useQuery();
  const { data: roles = [] } = trpc.users.orgRoles.useQuery();

  // ── Search & Filter State ────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');

  // ── Mutations ───────────────────────────────────────────────────────────
  const createMutation = trpc.users.create.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate();
      closeUserDialog();
      toast.success(t('users.userCreated'));
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.users.update.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate();
      closeUserDialog();
      toast.success(t('users.userUpdated'));
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.users.delete.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate();
      toast.success(t('users.userDeleted'));
    },
    onError: (e) => toast.error(e.message),
  });

  const setPasswordMutation = trpc.users.setPassword.useMutation({
    onSuccess: () => {
      closeSetPasswordDialog();
      toast.success(t('users.passwordSet'));
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleActiveMutation = trpc.users.toggleActive.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate();
      toast.success(t('common.itemSaved'));
    },
    onError: (e) => toast.error(e.message),
  });

  const sendPasswordResetMutation = trpc.users.sendPasswordReset.useMutation({
    onSuccess: () => toast.success(t('users.passwordResetSent')),
    onError: (e) => toast.error(e.message),
  });

  const isUserPending = createMutation.isPending || updateMutation.isPending;

  // ── User Dialog State ───────────────────────────────────────────────────
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    firstName: '',
    lastName: '',
    email: '',
    roleId: '',
    password: '',
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState<Partial<Record<string, string>>>({});

  const isEditing = !!editingUserId;

  // ── Set Password Dialog State ────────────────────────────────────────────
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordUserId, setPasswordUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // ── Role Permissions Editor State ────────────────────────────────────────
  const [rolePermsDialogOpen, setRolePermsDialogOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [selectedPermIds, setSelectedPermIds] = useState<string[]>([]);
  const [rolePermsDirty, setRolePermsDirty] = useState(false);

  const { data: editingRolePerms, isLoading: permsLoading } = trpc.users.rolePermissions.list.useQuery(
    { roleId: editingRoleId ?? '' },
    { enabled: rolePermsDialogOpen && !!editingRoleId },
  );

  const prevRoleRef = useRef<string | null>(null);
  if (rolePermsDialogOpen && editingRolePerms && editingRoleId !== prevRoleRef.current) {
    prevRoleRef.current = editingRoleId;
    setSelectedPermIds(editingRolePerms.map((p) => p.id));
    setRolePermsDirty(false);
  }

  if (!rolePermsDialogOpen && prevRoleRef.current) {
    prevRoleRef.current = null;
  }

  // ── User Dialog Actions ─────────────────────────────────────────────────
  const openCreateDialog = () => {
    setEditingUserId(null);
    setForm({ name: '', firstName: '', lastName: '', email: '', roleId: '', password: '', isActive: true });
    setFormErrors({});
    setUserDialogOpen(true);
  };

  const openEditDialog = (user: NonNullable<typeof users>[number]) => {
    const roleId = user.userOrganizationRoles?.[0]?.roleId ?? '';
    setEditingUserId(user.id);
    setForm({
      name: user.name,
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      email: user.email,
      roleId,
      password: '',
      isActive: user.isActive ?? true,
    });
    setFormErrors({});
    setUserDialogOpen(true);
  };

  const closeUserDialog = () => {
    setUserDialogOpen(false);
    setEditingUserId(null);
    setForm({ name: '', firstName: '', lastName: '', email: '', roleId: '', password: '', isActive: true });
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<string, string>> = {};
    if (!form.name.trim()) errors.name = t('errors.requiredField', { field: t('users.name') });
    if (!form.email.trim()) errors.email = t('errors.requiredField', { field: t('users.email') });
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = t('errors.invalidEmail');
    if (!form.roleId) errors.roleId = t('errors.requiredField', { field: t('users.role') });
    if (!isEditing && form.password && form.password.length < 6) {
      errors.password = t('errors.minLength', { field: t('users.password'), min: 6 });
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUserSubmit = () => {
    if (!validateForm()) return;
    const payload = {
      name: form.name.trim(),
      firstName: form.firstName.trim() || undefined,
      lastName: form.lastName.trim() || undefined,
      email: form.email.trim(),
      roleId: form.roleId,
      isActive: form.isActive,
    };
    if (isEditing) {
      updateMutation.mutate({ id: editingUserId, ...payload });
    } else {
      createMutation.mutate({ ...payload, password: form.password || undefined });
    }
  };

  const handleDelete = (userId: string) => {
    alert.delete({
      title: t('users.confirmDelete'),
      description: t('users.userDeleteConfirm'),
      confirmText: t('common.delete'),
      onConfirm: async () => {
        await deleteMutation.mutateAsync({ id: userId });
      },
    });
  };

  // ── Set Password Actions ────────────────────────────────────────────────
  const openSetPasswordDialog = (userId: string) => {
    setPasswordUserId(userId);
    setNewPassword('');
    setPasswordError('');
    setPasswordDialogOpen(true);
  };

  const closeSetPasswordDialog = () => {
    setPasswordDialogOpen(false);
    setPasswordUserId(null);
    setNewPassword('');
    setPasswordError('');
  };

  const handleSetPassword = () => {
    if (!newPassword || newPassword.length < 6) {
      setPasswordError(t('errors.minLength', { field: t('users.password'), min: 6 }));
      return;
    }
    if (!passwordUserId) return;
    setPasswordMutation.mutate({ id: passwordUserId, newPassword });
  };

  // ── Role Editor Actions ─────────────────────────────────────────────────
  const openRolePermsDialog = (roleId: string) => {
    setEditingRoleId(roleId);
    setRolePermsDialogOpen(true);
  };

  const closeRolePermsDialog = () => {
    setRolePermsDialogOpen(false);
    setEditingRoleId(null);
    setSelectedPermIds([]);
    setRolePermsDirty(false);
  };

  const handlePermissionToggle = (permId: string) => {
    setSelectedPermIds((prev) => {
      const next = prev.includes(permId)
        ? prev.filter((id) => id !== permId)
        : [...prev, permId];
      setRolePermsDirty(true);
      return next;
    });
  };

  const rolePermsUpdateMutation = trpc.users.rolePermissions.update.useMutation({
    onSuccess: () => {
      utils.users.rolePermissions.list.invalidate();
      utils.users.permissions.list.invalidate();
      toast.success(t('users.rolePermissionsUpdated'));
      setRolePermsDirty(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSaveRolePerms = () => {
    if (!editingRoleId) return;
    rolePermsUpdateMutation.mutate({ roleId: editingRoleId, permissionIds: selectedPermIds });
  };

  // ── Role Map ─────────────────────────────────────────────────────────────
  const roleMap = useMemo(() => {
    const m = new Map<string, typeof roles[number]>();
    for (const r of roles) {
      m.set(r.id, r);
    }
    return m;
  }, [roles]);


  const selectedRoleName = form.roleId ? roleMap.get(form.roleId)?.name ?? '' : '';

  // ── Stats Calculations ──────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!users) return { total: 0, active: 0, inactive: 0, roles: 0 };
    const total = users.length;
    const active = users.filter((u) => u.isActive !== false).length;
    const inactive = total - active;

    const uniqueRoleIds = new Set(
      users.map((u) => u.userOrganizationRoles?.[0]?.roleId).filter(Boolean)
    );
    const rolesCount = uniqueRoleIds.size;

    return { total, active, inactive, roles: rolesCount };
  }, [users]);

  // ── Filter Logics ────────────────────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter((user) => {
      const matchesSearch =
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.firstName && user.firstName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (user.lastName && user.lastName.toLowerCase().includes(searchQuery.toLowerCase()));

      const userRoleId = user.userOrganizationRoles?.[0]?.roleId ?? 'none';
      const matchesRole =
        selectedRoleFilter === 'all' || userRoleId === selectedRoleFilter;

      const userStatus = user.isActive !== false ? 'active' : 'inactive';
      const matchesStatus =
        selectedStatusFilter === 'all' || userStatus === selectedStatusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, selectedRoleFilter, selectedStatusFilter]);

  // ── Pagination State & Calculations ──────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, currentPage]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedRoleFilter, selectedStatusFilter]);

  // Password score indicators
  const getPasswordStrength = (pass: string) => {
    if (!pass) return null;
    if (pass.length < 6) return { score: 1, label: 'Weak', color: 'bg-red-500' };
    if (pass.length < 10) return { score: 2, label: 'Fair', color: 'bg-amber-500' };
    return { score: 3, label: 'Strong', color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength(form.password);

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Header Banner */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="size-6 text-primary" />
            <span>{t('users.title')}</span>
          </h2>
          <p className="text-sm text-muted-foreground">{t('users.manageUsers')}</p>
        </div>
        <Button className="gap-2 shrink-0 shadow-md hover:shadow-lg transition-all duration-200" onClick={openCreateDialog}>
          <UserPlus className="size-4" />
          <span>{t('users.createUser')}</span>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('users.title')}</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Total registered users</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active Users</CardTitle>
            <UserCheck className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.active}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Users with active access</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Inactive Users</CardTitle>
            <X className="size-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{stats.inactive}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Deactivated user profiles</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assigned Roles</CardTitle>
            <Shield className="size-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.roles}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Active role profiles assigned</p>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Filters Panel */}
      <div className="flex flex-col sm:flex-row gap-3 items-center bg-card border rounded-xl p-4 shadow-sm">
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search users by name, email, initials..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <div className="flex gap-3 w-full sm:w-auto shrink-0 flex-wrap sm:flex-nowrap">
          {/* Filter by Role */}
          <Select value={selectedRoleFilter} onValueChange={setSelectedRoleFilter}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {roles.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filter by Status */}
          <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="inactive">Inactive Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Custom Table Container */}
      <div className="flex-1 border rounded-xl bg-card shadow-sm overflow-hidden flex flex-col min-h-[400px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center flex-1 py-12 gap-3">
            <Spinner />
            <p className="text-xs text-muted-foreground animate-pulse">Loading members directory...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <Empty className="max-w-md border-0">
              <EmptyHeader>
                <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2 mx-auto">
                  <Search className="size-6" />
                </div>
                <EmptyTitle>{t('users.noUsers')}</EmptyTitle>
                <EmptyDescription>
                  {searchQuery || selectedRoleFilter !== 'all' || selectedStatusFilter !== 'all'
                    ? "No users matched your search criteria. Try modifying your filter options."
                    : t('users.noUsersDesc')}
                </EmptyDescription>
              </EmptyHeader>
              {(searchQuery || selectedRoleFilter !== 'all' || selectedStatusFilter !== 'all') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedRoleFilter('all');
                    setSelectedStatusFilter('all');
                  }}
                >
                  Clear All Filters
                </Button>
              )}
            </Empty>
          </div>
        ) : (
          <div className="flex flex-col flex-1 justify-between">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/10 hover:bg-muted/10">
                    <TableHead className="w-[280px] font-semibold">{t('users.name')}</TableHead>
                    <TableHead className="w-[180px] font-semibold">{t('users.role')}</TableHead>
                    <TableHead className="w-[120px] font-semibold">{t('users.status')}</TableHead>
                    <TableHead className="w-[150px] font-semibold">{t('users.createdAt')}</TableHead>
                    <TableHead className="w-[80px] text-right font-semibold pr-4">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers.map((user) => {
                    const uor = user.userOrganizationRoles?.[0];
                    const roleId = uor?.roleId ?? '';
                    const role = roleId ? roleMap.get(roleId) : null;
                    const roleName = role?.name ?? uor?.role ?? 'None';
                    const roleColor = role?.color ?? '#6b7280';
                    const roleIcon = role?.icon ?? null;
                    const systemKey = role?.systemKey ?? null;

                    return (
                      <TableRow key={user.id} className="group hover:bg-muted/30 transition-colors duration-150">
                        {/* Member Identity */}
                        <TableCell>
                          <div className="flex items-center gap-3.5 py-1">
                            <div
                              className={cn(
                                'size-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-sm transition-opacity duration-200',
                                user.isActive === false && 'opacity-65'
                              )}
                              style={{ backgroundColor: roleColor }}
                            >
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 space-y-0.5">
                              <div className="text-sm font-semibold flex items-center gap-1.5">
                                <span className={cn(user.isActive === false && "line-through text-muted-foreground")}>{user.name}</span>
                                {user.platformRole === 'SUPER_ADMIN' && (
                                  <Badge className="text-[9px] px-1.5 py-0 bg-violet-600/10 text-violet-700 hover:bg-violet-600/10 dark:bg-violet-500/20 dark:text-violet-300 border-0 font-bold uppercase tracking-wider">
                                    Root
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Interactive Role Cell with HoverCard */}
                        <TableCell>
                          {roleId ? (
                            <HoverCard openDelay={200}>
                              <HoverCardTrigger asChild>
                                <div className="flex items-center gap-2 cursor-pointer hover:underline decoration-dotted underline-offset-4 decoration-muted-foreground w-fit py-1">
                                  <RoleIcon name={roleName} icon={roleIcon} color={roleColor} />
                                  <span className="text-sm font-medium">{roleName}</span>
                                </div>
                              </HoverCardTrigger>
                              <HoverCardContent className="w-80 p-4 border bg-popover text-popover-foreground rounded-xl shadow-xl z-50">
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2.5">
                                    <div className="size-8 rounded-lg flex items-center justify-center text-white text-base font-bold" style={{ backgroundColor: roleColor }}>
                                      {(() => {
                                        const iconMap: Record<string, string> = {
                                          shield: '🛡', crown: '👑', eye: '👁', briefcase: '💼',
                                          calculator: '📊', package: '📦', 'trending-up': '📈',
                                        };
                                        if (systemKey === 'OWNER') return '👑';
                                        if (systemKey === 'ADMIN') return '🛡';
                                        return roleIcon ? iconMap[roleIcon] ?? '⚙' : '👤';
                                      })()}
                                    </div>
                                    <div>
                                      <h4 className="text-sm font-semibold">{roleName}</h4>
                                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{systemKey ? 'System Role' : 'Custom Role'}</p>
                                    </div>
                                  </div>
                                  <p className="text-xs text-muted-foreground leading-relaxed">
                                    {role?.description ?? (
                                      systemKey === 'OWNER'
                                        ? 'Owner of the organization. Full unrestricted access to all resources.'
                                        : systemKey === 'ADMIN'
                                        ? 'Administrator role. Full access to manage resources and settings.'
                                        : 'Custom role with specific access privileges.'
                                    )}
                                  </p>
                                  <div className="border-t pt-2.5">
                                    <HoverCardPermissionsList roleId={roleId} t={t} />
                                  </div>
                                </div>
                              </HoverCardContent>
                            </HoverCard>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">{t('common.none')}</span>
                          )}
                        </TableCell>

                        {/* Status Toggle Switch */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={user.isActive !== false}
                              disabled={toggleActiveMutation.isPending && toggleActiveMutation.variables?.id === user.id}
                              onCheckedChange={() => toggleActiveMutation.mutate({ id: user.id })}
                              className="scale-90"
                            />
                            <span className={cn(
                              "text-xs font-semibold px-2 py-0.5 rounded-full",
                              user.isActive === false
                                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            )}>
                              {user.isActive === false ? t('users.inactive') : t('users.active')}
                            </span>
                          </div>
                        </TableCell>

                        {/* Joined Date */}
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(user.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </TableCell>

                        {/* Action Operations */}
                        <TableCell className="text-right pr-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8 hover:bg-muted/80">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-44">
                              <DropdownMenuItem onClick={() => openEditDialog(user)}>
                                <Pencil className="size-4 mr-2" />
                                {t('common.edit')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openSetPasswordDialog(user.id)}>
                                <KeyRound className="size-4 mr-2" />
                                {t('users.setPassword')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => sendPasswordResetMutation.mutate({ id: user.id })}
                                disabled={sendPasswordResetMutation.isPending && sendPasswordResetMutation.variables?.id === user.id}
                              >
                                {sendPasswordResetMutation.isPending && sendPasswordResetMutation.variables?.id === user.id ? (
                                  <Loader2 className="size-4 mr-2 animate-spin" />
                                ) : (
                                  <Mail className="size-4 mr-2" />
                                )}
                                {t('users.sendReset')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(user.id)}
                                className="text-rose-600 hover:text-rose-700 dark:text-rose-400 focus:text-rose-700 focus:bg-rose-500/10"
                              >
                                <Trash2 className="size-4 mr-2" />
                                {t('common.delete')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t p-4 flex-wrap gap-3">
                <p className="text-xs text-muted-foreground">
                  Showing <strong className="font-semibold text-foreground">{(currentPage - 1) * itemsPerPage + 1}</strong> to{" "}
                  <strong className="font-semibold text-foreground">
                    {Math.min(currentPage * itemsPerPage, filteredUsers.length)}
                  </strong>{" "}
                  of <strong className="font-semibold text-foreground">{filteredUsers.length}</strong> members
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }).map((_, idx) => (
                      <Button
                        key={idx}
                        variant={currentPage === idx + 1 ? 'default' : 'outline'}
                        className="size-8 text-xs font-semibold"
                        onClick={() => setCurrentPage(idx + 1)}
                      >
                        {idx + 1}
                      </Button>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── User Create/Edit Dialog ───────────────────────── */}
      <Dialog open={userDialogOpen} onOpenChange={(v) => { if (!v) closeUserDialog(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="size-5 text-primary" />
              <span>{isEditing ? t('users.editUser') : t('users.createUser')}</span>
            </DialogTitle>
            <DialogDescription>{t('users.userDetails')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={form.firstName}
                  onChange={(e) => {
                    const newFn = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      firstName: newFn,
                      name: prev.name === `${prev.firstName} ${prev.lastName}`.trim() || !prev.name
                        ? `${newFn} ${prev.lastName}`.trim()
                        : prev.name,
                    }));
                  }}
                  placeholder="John"
                />
              </Field>
              <Field>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={form.lastName}
                  onChange={(e) => {
                    const newLn = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      lastName: newLn,
                      name: prev.name === `${prev.firstName} ${prev.lastName}`.trim() || !prev.name
                        ? `${prev.firstName} ${newLn}`.trim()
                        : prev.name,
                    }));
                  }}
                  placeholder="Doe"
                />
              </Field>
            </div>

            <Field>
              <Label htmlFor="name">{t('users.name')} *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="John Doe"
              />
              {formErrors.name && <p className="text-xs text-destructive">{formErrors.name}</p>}
            </Field>

            <Field>
              <Label htmlFor="email">{t('users.email')} *</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="john.doe@company.com"
              />
              {formErrors.email && <p className="text-xs text-destructive">{formErrors.email}</p>}
            </Field>

            {!isEditing && (
              <Field>
                <Label htmlFor="password">{t('users.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="At least 6 characters"
                />
                {form.password && strength && (
                  <div className="space-y-1.5 mt-1.5">
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all duration-300",
                          strength.color,
                          strength.score === 1 && "w-1/3",
                          strength.score === 2 && "w-2/3",
                          strength.score === 3 && "w-full"
                        )}
                      />
                    </div>
                    <div className="text-[10px] text-muted-foreground flex justify-between">
                      <span>Password strength: <strong>{strength.label}</strong></span>
                      <span>{form.password.length} chars</span>
                    </div>
                  </div>
                )}
                {formErrors.password && <p className="text-xs text-destructive">{formErrors.password}</p>}
              </Field>
            )}

            <Field>
              <Label htmlFor="role">{t('users.role')} *</Label>
              <Select
                value={form.roleId}
                onValueChange={(v) => setForm({ ...form, roleId: v })}
              >
                <SelectTrigger id="role" className="w-full">
                  <SelectValue placeholder={t('users.selectRole')} />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.roleId && <p className="text-xs text-destructive">{formErrors.roleId}</p>}
            </Field>

            {form.roleId && (
              <div className="rounded-xl border bg-muted/10 p-3 mt-1">
                <RolePermissionsPreview
                  roleId={form.roleId}
                  roleName={selectedRoleName}
                  t={t}
                  onEdit={() => openRolePermsDialog(form.roleId)}
                />
              </div>
            )}

            {isEditing && (
              <Field>
                <Label htmlFor="isActive">{t('users.isActive')}</Label>
                <div className="flex items-center gap-2">
                  <Switch
                    id="isActive"
                    checked={form.isActive}
                    onCheckedChange={(v) => setForm({ ...form, isActive: v })}
                  />
                  <span className="text-sm text-muted-foreground">
                    {form.isActive ? t('common.active') : t('common.inactive')}
                  </span>
                </div>
              </Field>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeUserDialog} disabled={isUserPending}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleUserSubmit} disabled={isUserPending}>
              {isUserPending && <Loader2 className="size-4 mr-2 animate-spin" />}
              {isEditing ? t('common.save') : t('users.createUser')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Set Password Dialog ───────────────────────────── */}
      <Dialog open={passwordDialogOpen} onOpenChange={(v) => { if (!v) closeSetPasswordDialog(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="size-5 text-primary" />
              {t('users.setPassword')}
            </DialogTitle>
            <DialogDescription>{t('users.setPasswordDesc')}</DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <Field>
              <Label htmlFor="new-password">{t('users.newPassword')}</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setPasswordError('');
                }}
                placeholder="••••••••"
              />
              {passwordError && <p className="text-xs text-destructive">{passwordError}</p>}
            </Field>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeSetPasswordDialog}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSetPassword} disabled={setPasswordMutation.isPending}>
              {setPasswordMutation.isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
              {t('users.setPassword')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Role Permissions Editor Dialog ─────────────────── */}
      <Dialog open={rolePermsDialogOpen} onOpenChange={(v) => { if (!v) closeRolePermsDialog(); }}>
        <DialogContent className="sm:max-w-xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="size-5 text-primary" />
              {editingRoleId && t('users.permissionsForRole', { role: roleMap.get(editingRoleId)?.name ?? '' })}
            </DialogTitle>
            <DialogDescription>{t('users.permissionsByModule')}</DialogDescription>
          </DialogHeader>

          <RolePermissionsEditor
            roleId={editingRoleId ?? ''}
            open={rolePermsDialogOpen}
            permsLoading={permsLoading}
            editingRolePerms={editingRolePerms}
            selectedPermIds={selectedPermIds}
            onToggle={handlePermissionToggle}
            onClose={closeRolePermsDialog}
            onSave={handleSaveRolePerms}
            isPending={rolePermsUpdateMutation.isPending}
            dirty={rolePermsDirty}
            t={t}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Role Permissions Preview (inline in user form) ──────────────────────────
function RolePermissionsPreview({ roleId, roleName, t, onEdit }: {
  roleId: string;
  roleName: string;
  t: any;
  onEdit: () => void;
}) {
  const { data: perms, isLoading } = trpc.users.rolePermissions.list.useQuery({ roleId });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
        <Loader2 className="size-3 animate-spin" />
        {t('common.loading')}
      </div>
    );
  }

  if (!perms?.length) {
    return (
      <div className="flex items-center justify-between py-1">
        <span className="text-xs text-muted-foreground italic">{t('users.noPermissions')}</span>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onEdit}>
          <Shield className="size-3 mr-1" />
          {t('users.configurePermissions')}
        </Button>
      </div>
    );
  }

  const maxPreview = 4;
  const visible = perms.slice(0, maxPreview);
  const remaining = perms.length - maxPreview;

  return (
    <div className="space-y-1.5 py-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">
          {t('users.rolePermissions')} ({perms.length})
        </span>
        <Button variant="ghost" size="sm" className="h-7 text-xs hover:bg-muted" onClick={onEdit}>
          <Shield className="size-3 mr-1" />
          {t('users.configurePermissions')}
        </Button>
      </div>
      <div className="flex flex-wrap gap-1">
        {visible.map((perm: any) => (
          <Badge key={perm.code} variant="outline" className="text-[10px]">
            {perm.label}
          </Badge>
        ))}
        {remaining > 0 && (
          <Badge variant="secondary" className="text-[10px]">
            +{remaining} {t('common.more')}
          </Badge>
        )}
      </div>
    </div>
  );
}

// ── Role Permissions Editor (dialog body) ───────────────────────────────────
function RolePermissionsEditor({ roleId, open, permsLoading, editingRolePerms, selectedPermIds, onToggle, onClose, onSave, isPending, dirty, t }: {
  roleId: string;
  open: boolean;
  permsLoading: boolean;
  editingRolePerms: any;
  selectedPermIds: string[];
  onToggle: (id: string) => void;
  onClose: () => void;
  onSave: () => void;
  isPending: boolean;
  dirty: boolean;
  t: any;
}) {
  const { data: permissionsByModule } = trpc.users.permissions.list.useQuery();
  const { data: allPermissions } = trpc.users.permissions.listAll.useQuery();

  return (
    <>
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 py-2">
        {permsLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : Object.keys(permissionsByModule ?? {}).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Shield className="size-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              {t('users.noPermissions')}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {t('users.noPermissionsDesc')}
            </p>
          </div>
        ) : (
          Object.entries(permissionsByModule ?? {}).map(([module, perms]) => (
            <div key={module} className="space-y-1">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
                {module}
              </h4>
              <div className="space-y-0.5">
                {(perms as any[]).map((perm: any) => {
                  const permId = allPermissions?.find((p: any) => p.code === perm.code)?.id ?? '';
                  return (
                    <label
                      key={perm.code}
                      className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <Checkbox
                        checked={selectedPermIds.includes(permId)}
                        onCheckedChange={() => onToggle(permId)}
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{perm.label}</div>
                        {perm.description && (
                          <div className="text-xs text-muted-foreground truncate">
                            {perm.description}
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      <DialogFooter className="border-t pt-4 mt-2">
        <Button variant="outline" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button onClick={onSave} disabled={!dirty || isPending}>
          {isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
          {t('users.saveRolePermissions')}
        </Button>
      </DialogFooter>
    </>
  );
}
