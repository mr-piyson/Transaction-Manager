'use client';

import {
  ChevronDown,
  ChevronUp,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Shield,
  Trash2,
  UserPlus,
  Users,
  Search,
  X,
  CheckCircle2,
  Crown,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { alert } from '@/components/Alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { trpc } from '@/lib/trpc/client';
import { cn } from '@/lib/utils';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/empty';

// Available role symbols
const AVAILABLE_ICONS = [
  { name: 'shield', label: 'Shield', symbol: '🛡' },
  { name: 'crown', label: 'Crown', symbol: '👑' },
  { name: 'eye', label: 'Eye', symbol: '👁' },
  { name: 'briefcase', label: 'Briefcase', symbol: '💼' },
  { name: 'calculator', label: 'Calculator', symbol: '📊' },
  { name: 'package', label: 'Package', symbol: '📦' },
  { name: 'trending-up', label: 'Trending Up', symbol: '📈' },
  { name: 'gear', label: 'Gear', symbol: '⚙' },
];

// Curated colors for premium visual palettes
const CURATED_COLORS = [
  { value: '#6366f1', label: 'Indigo' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#10b981', label: 'Emerald' },
  { value: '#8b5cf6', label: 'Violet' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#ef4444', label: 'Rose' },
  { value: '#6b7280', label: 'Slate' },
];

function RoleIcon({ name, icon, color, size = 'md' }: { name: string; icon: string | null; color: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const bg = color ?? '#6b7280';
  const iconMap: Record<string, string> = {
    shield: '🛡', crown: '👑', eye: '👁', briefcase: '💼',
    calculator: '📊', package: '📦', 'trending-up': '📈',
  };
  const sizeClasses = {
    sm: 'size-6 text-xs rounded',
    md: 'size-10 text-base rounded-lg shadow-sm',
    lg: 'size-14 text-2xl rounded-xl shadow-md',
  };
  return (
    <div className={cn("flex items-center justify-center text-white font-bold shrink-0 shadow-sm transition-transform hover:scale-105", sizeClasses[size])} style={{ backgroundColor: bg }}>
      {icon ? iconMap[icon] ?? '⚙' : name.charAt(0).toUpperCase()}
    </div>
  );
}

type RoleRow = {
  id: string;
  name: string;
  systemKey: string | null;
  description: string | null;
  icon: string | null;
  color: string | null;
  isSystem: boolean;
};

export default function PermissionsPage() {
  const t = useTranslations();
  const utils = trpc.useUtils();

  // ── Data Queries ───────────────────────────────────────
  const { data: allPermissions, isLoading: permsLoading } = trpc.users.permissions.listAll.useQuery();
  const { data: permissionsByModule } = trpc.users.permissions.list.useQuery();
  const { data: roleCounts } = trpc.users.countByRole.useQuery();
  const { data: users } = trpc.users.list.useQuery();
  const { data: roles = [], isLoading: rolesLoading } = trpc.users.orgRoles.useQuery();

  // ── Role Search State ─────────────────────────────────
  const [roleSearchQuery, setRoleSearchQuery] = useState('');

  // ── Mutations ──────────────────────────────────────────
  const createRole = trpc.users.roles.create.useMutation({
    onSuccess: () => {
      utils.users.orgRoles.invalidate();
      toast.success(t('users.roleCreated'));
    },
    onError: (e) => toast.error(e.message),
  });

  const updateRole = trpc.users.roles.update.useMutation({
    onSuccess: () => {
      utils.users.orgRoles.invalidate();
      toast.success(t('users.roleUpdated'));
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteRole = trpc.users.roles.delete.useMutation({
    onSuccess: () => {
      utils.users.orgRoles.invalidate();
      utils.users.rolePermissions.list.invalidate();
      utils.users.permissions.list.invalidate();
      toast.success(t('users.roleDeleted'));
    },
    onError: (e) => toast.error(e.message),
  });

  const rolePermsUpdateMutation = trpc.users.rolePermissions.update.useMutation({
    onSuccess: () => {
      utils.users.rolePermissions.list.invalidate();
      utils.users.permissions.list.invalidate();
      toast.success(t('users.rolePermissionsUpdated'));
      setRolePermsDirty(false);
    },
    onError: (e) => toast.error(e.message),
  });

  // ── Create Role Dialog ─────────────────────────────────
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState({ name: '', description: '', icon: 'shield', color: '#6366f1' });

  const openCreateDialog = () => {
    setNewRole({ name: '', description: '', icon: 'shield', color: '#6366f1' });
    setCreateDialogOpen(true);
  };

  const handleCreateRole = () => {
    if (!newRole.name.trim()) return;
    createRole.mutate({
      name: newRole.name.trim(),
      description: newRole.description || undefined,
      icon: newRole.icon || undefined,
      color: newRole.color || undefined,
    });
    setCreateDialogOpen(false);
  };

  // ── Edit Role Dialog ───────────────────────────────────
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRoleMeta, setEditingRoleMeta] = useState<RoleRow | null>(null);
  const [editRoleForm, setEditRoleForm] = useState({ name: '', description: '', icon: 'shield', color: '#6366f1' });

  const openEditRoleDialog = (role: RoleRow) => {
    setEditingRoleMeta(role);
    setEditRoleForm({
      name: role.name,
      description: role.description ?? '',
      icon: role.icon ?? 'shield',
      color: role.color ?? '#6366f1',
    });
    setEditDialogOpen(true);
  };

  const handleEditRole = () => {
    if (!editingRoleMeta || !editRoleForm.name.trim()) return;
    updateRole.mutate({
      id: editingRoleMeta.id,
      name: editRoleForm.name.trim(),
      description: editRoleForm.description || undefined,
      icon: editRoleForm.icon || undefined,
      color: editRoleForm.color || undefined,
    });
    setEditDialogOpen(false);
  };

  const handleDeleteRole = (role: RoleRow) => {
    alert.delete({
      title: t('users.deleteRole'),
      description: t('users.deleteRoleConfirm', { name: role.name }),
      confirmText: t('common.delete'),
      onConfirm: async () => {
        await deleteRole.mutateAsync({ id: role.id });
      },
    });
  };

  // ── Role Permissions Editor State ────────────────────────
  const [rolePermsDialogOpen, setRolePermsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleRow | null>(null);
  const [selectedPermIds, setSelectedPermIds] = useState<string[]>([]);
  const [rolePermsDirty, setRolePermsDirty] = useState(false);
  const [permissionSearch, setPermissionSearch] = useState('');

  const { data: editingRolePerms, isLoading: permsForRoleLoading } = trpc.users.rolePermissions.list.useQuery(
    { roleId: editingRole?.id ?? '' },
    { enabled: rolePermsDialogOpen && !!editingRole },
  );

  const prevRoleRef = useRef<string | null>(null);
  if (rolePermsDialogOpen && editingRolePerms && editingRole && editingRole.id !== prevRoleRef.current) {
    prevRoleRef.current = editingRole.id;
    setSelectedPermIds(editingRolePerms.map((p) => p.id));
    setRolePermsDirty(false);
  }

  if (!rolePermsDialogOpen && prevRoleRef.current) {
    prevRoleRef.current = null;
  }

  const openRolePermsDialog = (role: RoleRow) => {
    setEditingRole(role);
    setPermissionSearch('');
    setRolePermsDialogOpen(true);
  };

  const closeRolePermsDialog = () => {
    setRolePermsDialogOpen(false);
    setEditingRole(null);
    setSelectedPermIds([]);
    setRolePermsDirty(false);
    setPermissionSearch('');
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

  const toggleSelectAllModule = (perms: any[]) => {
    const permIds = perms.map((p) => allPermissions?.find((ap) => ap.code === p.code)?.id).filter(Boolean) as string[];
    const allSelected = permIds.every((id) => selectedPermIds.includes(id));

    if (allSelected) {
      setSelectedPermIds((prev) => prev.filter((id) => !permIds.includes(id)));
    } else {
      setSelectedPermIds((prev) => {
        const next = [...prev];
        for (const id of permIds) {
          if (!next.includes(id)) next.push(id);
        }
        return next;
      });
    }
    setRolePermsDirty(true);
  };

  const handleSaveRolePerms = () => {
    if (!editingRole) return;
    rolePermsUpdateMutation.mutate({ roleId: editingRole.id, permissionIds: selectedPermIds });
  };

  // ── Stats Calculations ──────────────────────────────────
  const totalPermissions = allPermissions?.length ?? 0;
  const totalUsers = users?.length ?? 0;
  const systemRolesCount = roles.filter((r) => r.isSystem).length;
  const customRolesCount = roles.length - systemRolesCount;

  // ── Filter Roles ────────────────────────────────────────
  const filteredRoles = useMemo(() => {
    return roles.filter(
      (role) =>
        role.name.toLowerCase().includes(roleSearchQuery.toLowerCase()) ||
        (role.description && role.description.toLowerCase().includes(roleSearchQuery.toLowerCase()))
    );
  }, [roles, roleSearchQuery]);

  const rows: RoleRow[] = useMemo(
    () => filteredRoles.map((role) => ({
      id: role.id, name: role.name, systemKey: role.systemKey,
      description: role.description, icon: role.icon, color: role.color, isSystem: role.isSystem,
    })),
    [filteredRoles],
  );

  // ── Searchable Permissions Mapping ───────────────────────
  const filteredPermissionsByModule = useMemo(() => {
    if (!permissionsByModule) return {};
    if (!permissionSearch.trim()) return permissionsByModule;

    const query = permissionSearch.toLowerCase();
    const result: typeof permissionsByModule = {};

    for (const [module, perms] of Object.entries(permissionsByModule)) {
      const matched = (perms as any[]).filter(
        (p) =>
          p.label.toLowerCase().includes(query) ||
          p.code.toLowerCase().includes(query) ||
          (p.description && p.description.toLowerCase().includes(query))
      );
      if (matched.length > 0) {
        result[module] = matched;
      }
    }
    return result;
  }, [permissionsByModule, permissionSearch]);

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Header Banner */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="size-6 text-primary animate-pulse" />
            <span>{t('users.permissionsPageTitle')}</span>
          </h2>
          <p className="text-sm text-muted-foreground">{t('users.permissionsPageDesc')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2 shrink-0 shadow-sm" onClick={openCreateDialog}>
            <Plus className="size-4" />
            <span>{t('users.createRole')}</span>
          </Button>
          <Button className="gap-2 shrink-0 shadow-md hover:shadow-lg transition-all duration-200" asChild>
            <Link href="/app/settings/users">
              <UserPlus className="size-4" />
              <span>Manage Members</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('users.totalRoles')}</CardTitle>
            <Shield className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-baseline gap-2">
              <span>{roles.length}</span>
              <span className="text-xs text-muted-foreground font-normal">
                ({systemRolesCount} system, {customRolesCount} custom)
              </span>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('users.totalPermissions')}</CardTitle>
            <Shield className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{totalPermissions}</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('users.totalUsers')}</CardTitle>
            <Users className="size-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{totalUsers}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search roles bar */}
      <div className="relative w-full">
        <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search roles by name or description..."
          value={roleSearchQuery}
          onChange={(e) => setRoleSearchQuery(e.target.value)}
          className="pl-9 pr-8"
        />
        {roleSearchQuery && (
          <button
            onClick={() => setRoleSearchQuery('')}
            className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Roles Grid List */}
      {rolesLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Spinner />
          <p className="text-xs text-muted-foreground">Loading organization roles...</p>
        </div>
      ) : rows.length === 0 ? (
        <Empty className="py-12 border-dashed bg-card">
          <EmptyHeader>
            <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2 mx-auto">
              <Search className="size-6" />
            </div>
            <EmptyTitle>No Roles Found</EmptyTitle>
            <EmptyDescription>
              {roleSearchQuery
                ? "No roles matched your search criteria. Try modifying your filter term."
                : "No roles created yet. Get started by creating a new organization role."}
            </EmptyDescription>
          </EmptyHeader>
          {roleSearchQuery && (
            <Button variant="outline" size="sm" onClick={() => setRoleSearchQuery('')}>
              Clear Search Query
            </Button>
          )}
        </Empty>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rows.map((role) => {
            const key = role.systemKey ?? role.name;
            const userCount = roleCounts?.[key] ?? 0;
            return (
              <Card key={role.id} className="hover:shadow-md transition-all duration-200 flex flex-col justify-between border bg-card">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <RoleIcon name={role.name} icon={role.icon} color={role.color} />
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-sm font-semibold truncate max-w-[130px]">{role.name}</h3>
                          {role.isSystem ? (
                            <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-muted text-muted-foreground border-0 font-bold uppercase tracking-wider">
                              System
                            </Badge>
                          ) : (
                            <Badge className="text-[9px] px-1 py-0 bg-primary/10 text-primary border-0 font-bold uppercase tracking-wider">
                              Custom
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Users className="size-3" />
                          <span>{userCount} members assigned</span>
                        </div>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8 hover:bg-muted/80">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-44">
                        <DropdownMenuItem onClick={() => openRolePermsDialog(role)}>
                          <Shield className="size-4 mr-2" />
                          {t('users.editPermissions')}
                        </DropdownMenuItem>
                        {!role.isSystem && (
                          <>
                            <DropdownMenuItem onClick={() => openEditRoleDialog(role)}>
                              <Pencil className="size-4 mr-2" />
                              {t('common.edit')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteRole(role)}
                              className="text-rose-600 hover:text-rose-700 focus:text-rose-700 focus:bg-rose-500/10"
                            >
                              <Trash2 className="size-4 mr-2" />
                              {t('common.delete')}
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardDescription className="text-xs line-clamp-2 mt-2 leading-normal min-h-[32px]">
                    {role.description ?? "No description provided for this role."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="border-t pt-3 mt-auto bg-muted/5 rounded-b-xl space-y-3">
                  <RoleCardPermissionsPreview roleId={role.id} t={t} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Role Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="size-5 text-primary" />
              <span>{t('users.createRole')}</span>
            </DialogTitle>
            <DialogDescription>{t('users.createRoleDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="role-name">{t('users.roleName')} *</Label>
              <Input id="role-name" value={newRole.name} onChange={(e) => setNewRole({ ...newRole, name: e.target.value })} placeholder={t('users.roleNamePlaceholder')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role-desc">{t('users.roleDescription')}</Label>
              <Input id="role-desc" value={newRole.description} onChange={(e) => setNewRole({ ...newRole, description: e.target.value })} placeholder={t('users.roleDescriptionPlaceholder')} />
            </div>

            {/* Icon Picker swatch */}
            <div className="space-y-2">
              <Label>{t('users.roleIcon')}</Label>
              <div className="grid grid-cols-8 gap-2">
                {AVAILABLE_ICONS.map((icon) => (
                  <button
                    key={icon.name}
                    type="button"
                    onClick={() => setNewRole({ ...newRole, icon: icon.name })}
                    className={cn(
                      "size-8 rounded-lg flex items-center justify-center text-sm font-semibold border hover:bg-muted/80 transition-colors shadow-sm",
                      newRole.icon === icon.name ? "border-primary bg-primary/10 ring-2 ring-primary/20 scale-105" : "border-input"
                    )}
                    title={icon.label}
                  >
                    {icon.symbol}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Swatch Picker */}
            <div className="space-y-2">
              <Label>{t('users.roleColor')}</Label>
              <div className="flex items-center gap-3 flex-wrap">
                {CURATED_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setNewRole({ ...newRole, color: color.value })}
                    className={cn(
                      "size-6 rounded-full border border-black/10 shadow-sm relative flex items-center justify-center transition-all hover:scale-110",
                      newRole.color === color.value ? "ring-2 ring-primary/40 ring-offset-1 scale-105" : ""
                    )}
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                  >
                    {newRole.color === color.value && (
                      <CheckCircle2 className="size-3 text-white drop-shadow-sm font-bold" />
                    )}
                  </button>
                ))}
                {/* Custom Color Input */}
                <div className="flex items-center gap-1.5 ml-2 border pl-2.5 rounded-lg py-0.5 pr-1 hover:bg-muted/10">
                  <span className="text-[10px] font-semibold text-muted-foreground">Custom:</span>
                  <input
                    type="color"
                    value={newRole.color}
                    onChange={(e) => setNewRole({ ...newRole, color: e.target.value })}
                    className="size-5 rounded-md border-0 bg-transparent cursor-pointer shadow-xs"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleCreateRole} disabled={!newRole.name.trim() || createRole.isPending}>
              {createRole.isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
              {t('users.createRole')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="size-5 text-primary" />
              <span>{t('users.editRole')}</span>
            </DialogTitle>
            <DialogDescription>{t('users.editRoleDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-role-name">{t('users.roleName')} *</Label>
              <Input id="edit-role-name" value={editRoleForm.name} onChange={(e) => setEditRoleForm({ ...editRoleForm, name: e.target.value })} placeholder={t('users.roleNamePlaceholder')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-role-desc">{t('users.roleDescription')}</Label>
              <Input id="edit-role-desc" value={editRoleForm.description} onChange={(e) => setEditRoleForm({ ...editRoleForm, description: e.target.value })} placeholder={t('users.roleDescriptionPlaceholder')} />
            </div>

            {/* Edit Icon Picker swatch */}
            <div className="space-y-2">
              <Label>{t('users.roleIcon')}</Label>
              <div className="grid grid-cols-8 gap-2">
                {AVAILABLE_ICONS.map((icon) => (
                  <button
                    key={icon.name}
                    type="button"
                    onClick={() => setEditRoleForm({ ...editRoleForm, icon: icon.name })}
                    className={cn(
                      "size-8 rounded-lg flex items-center justify-center text-sm font-semibold border hover:bg-muted/80 transition-colors shadow-sm",
                      editRoleForm.icon === icon.name ? "border-primary bg-primary/10 ring-2 ring-primary/20 scale-105" : "border-input"
                    )}
                    title={icon.label}
                  >
                    {icon.symbol}
                  </button>
                ))}
              </div>
            </div>

            {/* Edit Color Swatch Picker */}
            <div className="space-y-2">
              <Label>{t('users.roleColor')}</Label>
              <div className="flex items-center gap-3 flex-wrap">
                {CURATED_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setEditRoleForm({ ...editRoleForm, color: color.value })}
                    className={cn(
                      "size-6 rounded-full border border-black/10 shadow-sm relative flex items-center justify-center transition-all hover:scale-110",
                      editRoleForm.color === color.value ? "ring-2 ring-primary/40 ring-offset-1 scale-105" : ""
                    )}
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                  >
                    {editRoleForm.color === color.value && (
                      <CheckCircle2 className="size-3 text-white drop-shadow-sm font-bold" />
                    )}
                  </button>
                ))}
                {/* Custom Color Input */}
                <div className="flex items-center gap-1.5 ml-2 border pl-2.5 rounded-lg py-0.5 pr-1 hover:bg-muted/10">
                  <span className="text-[10px] font-semibold text-muted-foreground">Custom:</span>
                  <input
                    type="color"
                    value={editRoleForm.color}
                    onChange={(e) => setEditRoleForm({ ...editRoleForm, color: e.target.value })}
                    className="size-5 rounded-md border-0 bg-transparent cursor-pointer shadow-xs"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleEditRole} disabled={!editRoleForm.name.trim() || updateRole.isPending}>
              {updateRole.isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Role Permissions Editor Dialog ────────────────────────────────── */}
      <Dialog open={rolePermsDialogOpen} onOpenChange={(v) => { if (!v) closeRolePermsDialog(); }}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2">
              <Shield className="size-5 text-primary" />
              {editingRole && t('users.permissionsForRole', { role: editingRole.name })}
            </DialogTitle>
            <DialogDescription>{t('users.permissionsByModule')}</DialogDescription>
          </DialogHeader>

          {/* Search bar inside the permissions checklist */}
          <div className="relative w-full mb-2 px-1">
            <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search specific privilege (e.g. create, invoice)..."
              value={permissionSearch}
              onChange={(e) => setPermissionSearch(e.target.value)}
              className="pl-8 h-9 text-xs"
            />
            {permissionSearch && (
              <button
                onClick={() => setPermissionSearch('')}
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1 py-2">
            {permsForRoleLoading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : Object.keys(filteredPermissionsByModule).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Shield className="size-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">
                  No permissions found
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Try refining your search keyword.
                </p>
              </div>
            ) : (
              Object.entries(filteredPermissionsByModule).map(([module, perms]) => {
                const permIds = (perms as any[]).map((p) => allPermissions?.find((ap) => ap.code === p.code)?.id).filter(Boolean) as string[];
                const allSelected = permIds.every((id) => selectedPermIds.includes(id));
                const countSelected = permIds.filter((id) => selectedPermIds.includes(id)).length;

                return (
                  <div key={module} className="space-y-1.5 border rounded-xl p-3 bg-muted/5">
                    <div className="flex items-center justify-between px-1 border-b pb-1.5">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <span>{module}</span>
                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.2 rounded font-bold">
                          {countSelected}/{perms.length}
                        </span>
                      </h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] hover:bg-muted font-bold text-primary"
                        onClick={() => toggleSelectAllModule(perms)}
                      >
                        {allSelected ? "Deselect All" : "Select All"}
                      </Button>
                    </div>
                    <div className="space-y-1 pt-1">
                      {(perms as any[]).map((perm: any) => {
                        const permId = allPermissions?.find((p) => p.code === perm.code)?.id ?? '';
                        return (
                          <label
                            key={perm.code}
                            className="flex items-start gap-3 rounded-lg px-2.5 py-1.5 hover:bg-muted/50 cursor-pointer transition-colors"
                          >
                            <Checkbox
                              checked={selectedPermIds.includes(permId)}
                              onCheckedChange={() => handlePermissionToggle(permId)}
                              className="mt-0.5 scale-90"
                            />
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                <span>{perm.label}</span>
                                <code className="text-[9px] bg-muted/80 text-muted-foreground px-1 py-0.2 rounded font-mono font-normal">
                                  {perm.code}
                                </code>
                              </div>
                              {perm.description && (
                                <div className="text-[10px] text-muted-foreground mt-0.5 leading-normal">
                                  {perm.description}
                                </div>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter className="border-t pt-4 mt-2">
            <Button variant="outline" onClick={closeRolePermsDialog}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSaveRolePerms}
              disabled={!rolePermsDirty || rolePermsUpdateMutation.isPending}
            >
              {rolePermsUpdateMutation.isPending && (
                <Loader2 className="size-4 mr-2 animate-spin" />
              )}
              {t('users.saveRolePermissions')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Permission Badges ────────────────────────────────────────────────────────
function RoleCardPermissionsPreview({ roleId, t }: { roleId: string; t: any }) {
  const { data: perms, isLoading } = trpc.users.rolePermissions.list.useQuery({ roleId }, { enabled: !!roleId });
  const [expanded, setExpanded] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 py-1">
        <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{t('common.loading')}</span>
      </div>
    );
  }

  if (!perms?.length) {
    return <span className="text-xs text-muted-foreground italic">{t('users.noPermissions')}</span>;
  }

  const grouped = perms.reduce<Record<string, typeof perms>>((acc, p) => {
    const module = p.module || 'Other';
    if (!acc[module]) acc[module] = [];
    acc[module].push(p);
    return acc;
  }, {});

  const moduleKeys = Object.keys(grouped);
  const visibleModules = expanded ? moduleKeys : moduleKeys.slice(0, 2);
  const hasMore = moduleKeys.length > 2;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          Active Privileges ({perms.length})
        </span>
      </div>
      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
        {visibleModules.map((module) => (
          <div key={module} className="flex items-start gap-1.5 flex-wrap">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase whitespace-nowrap mt-0.5">
              {module}:
            </span>
            <div className="flex flex-wrap gap-1 flex-1">
              {grouped[module].map((perm: any) => (
                <Badge key={perm.code} variant="outline" className="text-[9px] px-1 py-0.5 leading-none">
                  {perm.label}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-0.5 text-[10px] text-primary hover:underline font-bold focus:outline-hidden mt-1"
        >
          {expanded ? (
            <><ChevronUp className="size-3" />Show less</>
          ) : (
            <><ChevronDown className="size-3" />Show {moduleKeys.length - 2} more groups</>
          )}
        </button>
      )}
    </div>
  );
}
