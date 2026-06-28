'use client';

import { AllCommunityModule, ModuleRegistry, type ColDef, type GridApi } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import {
  ChevronDown,
  ChevronUp,
  KeyRound,
  Loader2,
  Mail,
  MoreHorizontal,
  Pencil,
  Shield,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useRef, useState } from 'react';
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
import { useTableTheme } from '@/hooks/use-table-theme';
import { trpc } from '@/lib/trpc/client';
import { cn } from '@/lib/utils';

ModuleRegistry.registerModules([AllCommunityModule]);

export default function UsersSettingsPage() {
  const t = useTranslations();
  const theme = useTableTheme();
  const utils = trpc.useUtils();

  // ── Data ─────────────────────────────────────────────────────────────────
  const { data: users, isLoading } = trpc.users.list.useQuery();
  const { data: roles = [] } = trpc.users.orgRoles.useQuery();
  const gridApi = useRef<GridApi | null>(null);
  const [gridKey, setGridKey] = useState(0);

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
    onSuccess: () => { closeSetPasswordDialog(); toast.success(t('users.passwordSet')); },
    onError: (e) => toast.error(e.message),
  });
  const toggleActiveMutation = trpc.users.toggleActive.useMutation({
    onSuccess: () => { utils.users.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const isUserPending = createMutation.isPending || updateMutation.isPending;

  // ── User Dialog State ───────────────────────────────────────────────────
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', roleId: '', password: '', isActive: true });
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
    setForm({ name: '', email: '', roleId: '', password: '', isActive: true });
    setFormErrors({});
    setUserDialogOpen(true);
  };

  const openEditDialog = (user: NonNullable<typeof users>[number]) => {
    const roleId = user.userOrganizationRoles?.[0]?.roleId ?? '';
    setEditingUserId(user.id);
    setForm({ name: user.name, email: user.email, roleId, password: '', isActive: user.isActive ?? true });
    setFormErrors({});
    setUserDialogOpen(true);
  };

  const closeUserDialog = () => {
    setUserDialogOpen(false);
    setEditingUserId(null);
    setForm({ name: '', email: '', roleId: '', password: '', isActive: true });
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<string, string>> = {};
    if (!form.name.trim()) errors.name = t('errors.requiredField', { field: t('users.name') });
    if (!form.email.trim()) errors.email = t('errors.requiredField', { field: t('users.email') });
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = t('errors.invalidEmail');
    if (!form.roleId) errors.roleId = t('errors.requiredField', { field: t('users.role') });
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUserSubmit = () => {
    if (!validateForm()) return;
    const payload = { name: form.name, email: form.email, roleId: form.roleId, isActive: form.isActive };
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
      onConfirm: async () => { await deleteMutation.mutateAsync({ id: userId }); },
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
    const m = new Map<string, { name: string; icon: string | null; color: string | null; systemKey: string | null }>();
    for (const r of roles) {
      m.set(r.id, { name: r.name, icon: r.icon, color: r.color, systemKey: r.systemKey });
    }
    return m;
  }, [roles]);

  // ── Send Password Reset ─────────────────────────────────────────────────
  const sendPasswordResetMutation = trpc.users.sendPasswordReset.useMutation({
    onSuccess: () => toast.success(t('users.passwordResetSent')),
    onError: (e) => toast.error(e.message),
  });

  // ── Grid ────────────────────────────────────────────────────────────────

  const columnDefs = useMemo<ColDef[]>(
    () => [
      { field: 'name', headerName: t('users.name'), width: 180, cellRenderer: (p: any) => {
        const user = p.data;
        const role = roleMap.get(user.userOrganizationRoles?.[0]?.roleId ?? '');
        return (
          <div className="flex items-center gap-3 py-2">
            <div className={cn(
              'size-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0',
              user.isActive === false && 'opacity-50',
            )} style={{ backgroundColor: role?.color ?? '#6b7280' }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{user.name}</div>
              <div className="text-xs text-muted-foreground truncate">{user.email}</div>
            </div>
          </div>
        );
      }},
      { field: 'email', headerName: t('users.email'), width: 200, hide: true },
      {
        field: 'userOrganizationRoles',
        headerName: t('users.role'),
        width: 160,
        cellRenderer: (p: any) => {
          const roleId = p.value?.[0]?.roleId;
          const role = roleMap.get(roleId ?? '');
          if (!role) return <span className="text-xs text-muted-foreground italic">{t('common.none')}</span>;
          return (
            <div className="flex items-center gap-2 py-2">
              <div className="size-6 rounded flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ backgroundColor: role.color ?? '#6b7280' }}>
                {role.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm">{role.name}</span>
            </div>
          );
        },
      },
      {
        field: 'isActive',
        headerName: t('users.status'),
        width: 100,
        cellRenderer: (p: any) => (
          <Badge variant={p.value === false ? 'secondary' : 'default'} className="text-xs">
            {p.value === false ? t('users.inactive') : t('users.active')}
          </Badge>
        ),
      },
      { field: 'createdAt', headerName: t('users.createdAt'), width: 130, valueFormatter: (p: any) => new Date(p.value).toLocaleDateString() },
      {
        headerName: t('common.actions'),
        width: 120,
        pinned: 'right',
        sortable: false,
        filter: false,
        cellRenderer: (p: any) => {
          const user = p.data;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-44">
                <DropdownMenuItem onClick={() => openEditDialog(user)}>
                  <Pencil className="size-4 mr-2" />{t('common.edit')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openSetPasswordDialog(user.id)}>
                  <KeyRound className="size-4 mr-2" />{t('users.setPassword')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => sendPasswordResetMutation.mutate({ id: user.id })}>
                  <Mail className="size-4 mr-2" />{t('users.sendReset')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toggleActiveMutation.mutate({ id: user.id })}>
                  <Users className="size-4 mr-2" />{user.isActive === false ? t('users.activate') : t('users.deactivate')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleDelete(user.id)}
                  className="text-destructive"
                >
                  <Trash2 className="size-4 mr-2" />{t('common.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [roles, roleMap, sendPasswordResetMutation],
  );

  const defaultColDef = useMemo(
    () => ({ resizable: true, sortable: true }),
    [],
  );

  // ── Selected role info for permissions preview ──────────────────────────
  const selectedRoleName = form.roleId ? roleMap.get(form.roleId)?.name ?? '' : '';

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{t('users.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('users.manageUsers')}</p>
        </div>
        <Button className="gap-2 shrink-0" onClick={openCreateDialog}>
          <UserPlus className="size-4" />
          <span className="hidden sm:inline">{t('users.createUser')}</span>
          <span className="sm:hidden">{t('common.new')}</span>
        </Button>
      </div>

      {/* User Table */}
      <div className="flex-1 min-h-0 rounded-lg border overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full min-h-[300px]">
            <Spinner />
          </div>
        ) : (
          <div className="h-full w-full" style={{ minHeight: 400 }}>
            <AgGridReact
              key={gridKey}
              rowData={users}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              theme={theme}
              animateRows
              domLayout="normal"
              getRowId={(params) => params.data.id}
              suppressScrollOnNewData
              enableCellTextSelection
              ensureDomOrder
              onGridReady={(params) => { gridApi.current = params.api; }}
            />
          </div>
        )}
      </div>

      {/* ── User Create/Edit Dialog ───────────────────────── */}
      <Dialog open={userDialogOpen} onOpenChange={(v) => { if (!v) closeUserDialog(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditing ? t('users.editUser') : t('users.createUser')}</DialogTitle>
            <DialogDescription>{t('users.userDetails')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <Field>
              <Label htmlFor="name">{t('users.name')} *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
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
              />
              {formErrors.email && <p className="text-xs text-destructive">{formErrors.email}</p>}
            </Field>

            {!isEditing && (
              <Field>
                <Label htmlFor="password">{t('users.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t('users.optionalPassword')}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">{t('users.optionalPassword')}</p>
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
              <RolePermissionsPreview
                roleId={form.roleId}
                roleName={selectedRoleName}
                t={t}
                onEdit={() => openRolePermsDialog(form.roleId)}
              />
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
                onChange={(e) => { setNewPassword(e.target.value); setPasswordError(''); }}
                placeholder="••••••••"
              />
              {passwordError && <p className="text-xs text-destructive">{passwordError}</p>}
            </Field>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeSetPasswordDialog}>{t('common.cancel')}</Button>
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
          <Shield className="size-3 mr-1" />{t('users.configurePermissions')}
        </Button>
      </div>
    );
  }

  const maxPreview = 4;
  const visible = perms.slice(0, maxPreview);
  const remaining = perms.length - maxPreview;

  return (
    <div className="space-y-1 py-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          {t('users.rolePermissions')} ({perms.length})
        </span>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onEdit}>
          <Shield className="size-3 mr-1" />{t('users.configurePermissions')}
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
