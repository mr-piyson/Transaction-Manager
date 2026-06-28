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
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { alert } from '@/components/Alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { trpc } from '@/lib/trpc/client';

function RoleIcon({ name, icon, color }: { name: string; icon: string | null; color: string | null }) {
  const bg = color ?? '#6b7280';
  const iconMap: Record<string, string> = {
    shield: '🛡', crown: '👑', eye: '👁', briefcase: '💼',
    calculator: '📊', package: '📦', 'trending-up': '📈',
  };
  return (
    <div className="size-8 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ backgroundColor: bg }}>
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

  const { data: allPermissions, isLoading: permsLoading } = trpc.users.permissions.listAll.useQuery();
  const { data: permissionsByModule } = trpc.users.permissions.list.useQuery();
  const { data: roleCounts } = trpc.users.countByRole.useQuery();
  const { data: users } = trpc.users.list.useQuery();
  const { data: roles = [], isLoading: rolesLoading } = trpc.users.orgRoles.useQuery();

  const createRole = trpc.users.roles.create.useMutation({
    onSuccess: () => { utils.users.orgRoles.invalidate(); toast.success(t('users.roleCreated')); },
    onError: (e) => toast.error(e.message),
  });
  const updateRole = trpc.users.roles.update.useMutation({
    onSuccess: () => { utils.users.orgRoles.invalidate(); toast.success(t('users.roleUpdated')); },
    onError: (e) => toast.error(e.message),
  });
  const deleteRole = trpc.users.roles.delete.useMutation({
    onSuccess: () => { utils.users.orgRoles.invalidate(); utils.users.rolePermissions.list.invalidate(); utils.users.permissions.list.invalidate(); toast.success(t('users.roleDeleted')); },
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
  const [newRole, setNewRole] = useState({ name: '', description: '', icon: '', color: '#6366f1' });

  const openCreateDialog = () => {
    setNewRole({ name: '', description: '', icon: '', color: '#6366f1' });
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
  const [editRoleForm, setEditRoleForm] = useState({ name: '', description: '', icon: '', color: '#6366f1' });

  const openEditRoleDialog = (role: RoleRow) => {
    setEditingRoleMeta(role);
    setEditRoleForm({
      name: role.name,
      description: role.description ?? '',
      icon: role.icon ?? '',
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
      onConfirm: async () => { await deleteRole.mutateAsync({ id: role.id }); },
    });
  };

  // ── Role Permissions Editor State ────────────────────────
  const [rolePermsDialogOpen, setRolePermsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleRow | null>(null);
  const [selectedPermIds, setSelectedPermIds] = useState<string[]>([]);
  const [rolePermsDirty, setRolePermsDirty] = useState(false);

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
    setRolePermsDialogOpen(true);
  };

  const closeRolePermsDialog = () => {
    setRolePermsDialogOpen(false);
    setEditingRole(null);
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

  const handleSaveRolePerms = () => {
    if (!editingRole) return;
    rolePermsUpdateMutation.mutate({ roleId: editingRole.id, permissionIds: selectedPermIds });
  };

  // ── Stats ────────────────────────────────────────────────
  const totalPermissions = allPermissions?.length ?? 0;
  const totalUsers = users?.length ?? 0;

  const rows: RoleRow[] = useMemo(
    () => roles.map((role) => ({
      id: role.id, name: role.name, systemKey: role.systemKey,
      description: role.description, icon: role.icon, color: role.color, isSystem: role.isSystem,
    })),
    [roles],
  );

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{t('users.permissionsPageTitle')}</h2>
          <p className="text-sm text-muted-foreground">{t('users.permissionsPageDesc')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2 shrink-0" onClick={openCreateDialog}>
            <Plus className="size-4" />
            <span className="hidden sm:inline">{t('users.createRole')}</span>
            <span className="sm:hidden">{t('common.new')}</span>
          </Button>
          <Button className="gap-2 shrink-0" asChild>
            <Link href="/app/settings/users">
              <UserPlus className="size-4" />
              <span className="hidden sm:inline">{t('users.createUser')}</span>
              <span className="sm:hidden">{t('common.new')}</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('users.totalRoles')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Shield className="size-5 text-primary" />
              <span className="text-2xl font-bold tabular-nums">{roles.length}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('users.totalPermissions')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Shield className="size-5 text-primary" />
              <span className="text-2xl font-bold tabular-nums">{totalPermissions}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('users.totalUsers')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="size-5 text-primary" />
              <span className="text-2xl font-bold tabular-nums">{totalUsers}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Role Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('users.createRole')}</DialogTitle>
            <DialogDescription>{t('users.createRoleDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="role-name">{t('users.roleName')}</Label>
              <Input id="role-name" value={newRole.name} onChange={(e) => setNewRole({ ...newRole, name: e.target.value })} placeholder={t('users.roleNamePlaceholder')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role-desc">{t('users.roleDescription')}</Label>
              <Input id="role-desc" value={newRole.description} onChange={(e) => setNewRole({ ...newRole, description: e.target.value })} placeholder={t('users.roleDescriptionPlaceholder')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="role-icon">{t('users.roleIcon')}</Label>
                <Input id="role-icon" value={newRole.icon} onChange={(e) => setNewRole({ ...newRole, icon: e.target.value })} placeholder="briefcase" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="role-color">{t('users.roleColor')}</Label>
                <input id="role-color" type="color" value={newRole.color} onChange={(e) => setNewRole({ ...newRole, color: e.target.value })} className="h-9 w-full rounded-md border border-input bg-background px-2" />
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
            <DialogTitle>{t('users.editRole')}</DialogTitle>
            <DialogDescription>{t('users.editRoleDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-role-name">{t('users.roleName')}</Label>
              <Input id="edit-role-name" value={editRoleForm.name} onChange={(e) => setEditRoleForm({ ...editRoleForm, name: e.target.value })} placeholder={t('users.roleNamePlaceholder')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-role-desc">{t('users.roleDescription')}</Label>
              <Input id="edit-role-desc" value={editRoleForm.description} onChange={(e) => setEditRoleForm({ ...editRoleForm, description: e.target.value })} placeholder={t('users.roleDescriptionPlaceholder')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-role-icon">{t('users.roleIcon')}</Label>
                <Input id="edit-role-icon" value={editRoleForm.icon} onChange={(e) => setEditRoleForm({ ...editRoleForm, icon: e.target.value })} placeholder="briefcase" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-role-color">{t('users.roleColor')}</Label>
                <input id="edit-role-color" type="color" value={editRoleForm.color} onChange={(e) => setEditRoleForm({ ...editRoleForm, color: e.target.value })} className="h-9 w-full rounded-md border border-input bg-background px-2" />
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

      {/* Roles Table (shadcn/ui) */}
      <div className="rounded-lg border overflow-hidden">
        {permsLoading || rolesLoading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[220px]">{t('users.role')}</TableHead>
                <TableHead className="w-[100px]">{t('users.totalUsers')}</TableHead>
                <TableHead>{t('users.permissions')}</TableHead>
                <TableHead className="w-[180px] text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                    {t('common.noResults')}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((role) => {
                  const key = role.systemKey ?? role.name;
                  const userCount = roleCounts?.[key] ?? 0;
                  return (
                    <TableRow key={role.id}>
                      {/* Role name + icon */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <RoleIcon name={role.name} icon={role.icon} color={role.color} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{role.name}</span>
                              {role.isSystem && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 leading-4">{t('common.system')}</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* User count */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="size-4 text-muted-foreground shrink-0" />
                          <span className="text-sm tabular-nums font-medium">{userCount}</span>
                        </div>
                      </TableCell>

                      {/* Permission badges */}
                      <TableCell>
                        <PermissionBadges roleId={role.id} t={t} />
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
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
                                  className="text-destructive"
                                >
                                  <Trash2 className="size-4 mr-2" />
                                  {t('common.delete')}
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* ── Role Permissions Editor Dialog ────────────────────────────────── */}
      <Dialog open={rolePermsDialogOpen} onOpenChange={(v) => { if (!v) closeRolePermsDialog(); }}>
        <DialogContent className="sm:max-w-xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="size-5 text-primary" />
              {editingRole && t('users.permissionsForRole', { role: editingRole.name })}
            </DialogTitle>
            <DialogDescription>{t('users.permissionsByModule')}</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1 py-2">
            {permsForRoleLoading ? (
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
                      const permId = allPermissions?.find((p) => p.code === perm.code)?.id ?? '';
                      return (
                        <label
                          key={perm.code}
                          className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted/50 cursor-pointer transition-colors"
                        >
                          <Checkbox
                            checked={selectedPermIds.includes(permId)}
                            onCheckedChange={() => handlePermissionToggle(permId)}
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

function PermissionBadges({ roleId, t }: { roleId: string; t: any }) {
  const { data: perms, isLoading } = trpc.users.rolePermissions.list.useQuery({ roleId });
  const [expanded, setExpanded] = useState(false);

  const grouped = useMemo(() => {
    if (!perms) return {};
    return perms.reduce<Record<string, typeof perms>>((acc, p) => {
      const module = p.module || 'Other';
      if (!acc[module]) acc[module] = [];
      acc[module].push(p);
      return acc;
    }, {});
  }, [perms]);

  const moduleKeys = Object.keys(grouped);
  const visibleModules = expanded ? moduleKeys : moduleKeys.slice(0, 2);
  const hasMore = moduleKeys.length > 2;

  if (isLoading) {
    return (
      <div className="flex items-center py-1">
        <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!perms?.length) {
    return (
      <span className="text-xs text-muted-foreground italic">
        {t('users.noPermissions')}
      </span>
    );
  }

  return (
    <div className="space-y-1 py-1">
      {visibleModules.map((module) => (
        <div key={module} className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase whitespace-nowrap">
            {module}:
          </span>
          {grouped[module].map((perm: any) => (
            <Badge key={perm.code} variant="outline" className="text-[10px]">
              {perm.label}
            </Badge>
          ))}
        </div>
      ))}
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          {expanded ? (
            <><ChevronUp className="size-3" />Show less</>
          ) : (
            <><ChevronDown className="size-3" />Show {moduleKeys.length - 2} more</>
          )}
        </button>
      )}
    </div>
  );
}
