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

type OrgRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'ACCOUNTANT' | 'SALES' | 'WAREHOUSE' | 'VIEWER';

export default function UsersSettingsPage() {
  const t = useTranslations();
  const theme = useTableTheme();
  const gridApiRef = useRef<GridApi | null>(null);
  const utils = trpc.useUtils();

  // ── Data ────────────────────────────────────────────────────────────────
  const { data: users, isLoading } = trpc.users.list.useQuery();
  const { data: permissionsByModule } = trpc.users.permissions.list.useQuery();
  const { data: allPermissions } = trpc.users.permissions.listAll.useQuery();
  const orgRoles = trpc.users.orgRoles.useQuery();

  const createMutation = trpc.users.create.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate();
      toast.success(t('users.userCreated'));
      closeUserDialog();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.users.update.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate();
      toast.success(t('users.userUpdated'));
      closeUserDialog();
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleActiveMutation = trpc.users.toggleActive.useMutation({
    onSuccess: () => utils.users.list.invalidate(),
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
      utils.users.list.invalidate();
      toast.success(t('users.passwordSet'));
      closeSetPasswordDialog();
    },
    onError: (e) => toast.error(e.message),
  });

  const sendPasswordResetMutation = trpc.users.sendPasswordReset.useMutation({
    onSuccess: () => {
      toast.success(t('users.passwordResetSent'));
    },
    onError: (e) => toast.error(e.message),
  });

  const rolePermsUpdateMutation = trpc.users.rolePermissions.update.useMutation({
    onSuccess: () => {
      toast.success(t('users.rolePermissionsUpdated'));
      setRolePermsDirty(false);
    },
    onError: (e) => toast.error(e.message),
  });

  // ── User Dialog State ───────────────────────────────────────────────────
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', role: '' as OrgRole | '', password: '', isActive: true });
  const [formErrors, setFormErrors] = useState<Partial<Record<string, string>>>({});

  const isEditing = !!editingUserId;

  // ── Set Password Dialog State ────────────────────────────────────────────
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordUserId, setPasswordUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // ── Role Permissions Editor State ────────────────────────────────────────
  const [rolePermsDialogOpen, setRolePermsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<OrgRole | null>(null);
  const [selectedPermIds, setSelectedPermIds] = useState<string[]>([]);
  const [rolePermsDirty, setRolePermsDirty] = useState(false);

  const { data: editingRolePerms, isLoading: permsLoading } = trpc.users.rolePermissions.list.useQuery(
    { role: editingRole ?? 'MANAGER' },
    { enabled: rolePermsDialogOpen && !!editingRole },
  );

  const prevRoleRef = useRef<OrgRole | null>(null);
  if (rolePermsDialogOpen && editingRolePerms && editingRole !== prevRoleRef.current) {
    prevRoleRef.current = editingRole;
    setSelectedPermIds(editingRolePerms.map((p) => p.id));
    setRolePermsDirty(false);
  }

  if (!rolePermsDialogOpen && prevRoleRef.current) {
    prevRoleRef.current = null;
  }

  // ── User Dialog Actions ─────────────────────────────────────────────────

  const openCreateDialog = () => {
    setEditingUserId(null);
    setForm({ name: '', email: '', role: '', password: '', isActive: true });
    setFormErrors({});
    setUserDialogOpen(true);
  };

  const openEditDialog = (user: NonNullable<typeof users>[number]) => {
    const role = (user.userOrganizationRoles?.[0]?.role as OrgRole) ?? '';
    setEditingUserId(user.id);
    setForm({ name: user.name, email: user.email, role, password: '', isActive: user.isActive ?? true });
    setFormErrors({});
    setUserDialogOpen(true);
  };

  const closeUserDialog = () => {
    setUserDialogOpen(false);
    setEditingUserId(null);
    setForm({ name: '', email: '', role: '', password: '', isActive: true });
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<string, string>> = {};
    if (!form.name.trim()) errors.name = t('errors.requiredField', { field: t('users.name') });
    if (!form.email.trim()) errors.email = t('errors.requiredField', { field: t('users.email') });
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = t('errors.invalidEmail');
    if (!form.role) errors.role = t('errors.requiredField', { field: t('users.role') });
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUserSubmit = () => {
    if (!validateForm()) return;
    const payload = { name: form.name, email: form.email, role: form.role as OrgRole, isActive: form.isActive };
    if (isEditing) {
      updateMutation.mutate({ id: editingUserId, ...payload });
    } else {
      createMutation.mutate({ ...payload, password: form.password || undefined });
    }
  };

  const handleToggleActive = (id: string) => {
    toggleActiveMutation.mutate({ id });
  };

  const handleDelete = (id: string, name: string) => {
    alert.delete({
      title: t('users.confirmDelete'),
      description: `${t('users.userDeleteWarning')} "${name}".`,
      confirmText: t('common.delete'),
      onConfirm: async () => { await deleteMutation.mutateAsync({ id }); },
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
      setPasswordError(t('users.passwordMinLength'));
      return;
    }
    if (!passwordUserId) return;
    setPasswordMutation.mutate({ id: passwordUserId, newPassword });
  };

  // ── Send Password Reset ─────────────────────────────────────────────────

  const handleSendPasswordReset = (userId: string) => {
    sendPasswordResetMutation.mutate({ id: userId });
  };

  // ── Role Permissions Actions ────────────────────────────────────────────

  const openRolePermsDialog = (role: OrgRole) => {
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
    rolePermsUpdateMutation.mutate({ role: editingRole, permissionIds: selectedPermIds });
  };

  const isUserPending = createMutation.isPending || updateMutation.isPending;

  // ── AG Grid ─────────────────────────────────────────────────────────────

  const columnDefs = useMemo<ColDef[]>(
    () => [
      {
        field: 'name',
        headerName: t('users.name'),
        minWidth: 200,
        flex: 1,
        cellRenderer: (p: any) => (
          <div className="flex items-center gap-3 py-2">
            <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold shrink-0">
              {(p.data.firstName ?? p.data.name)[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">
                {p.data.firstName
                  ? `${p.data.firstName} ${p.data.lastName ?? ''}`
                  : p.data.name}
              </div>
              {p.data.firstName && (
                <div className="text-xs text-muted-foreground truncate">{p.data.name}</div>
              )}
            </div>
          </div>
        ),
      },
      {
        field: 'email',
        headerName: t('users.email'),
        minWidth: 220,
        flex: 1,
      },
      {
        field: 'role',
        headerName: t('users.role'),
        width: 150,
        sortable: false,
        filter: false,
        cellRenderer: (p: any) => {
          const role = p.data.userOrganizationRoles?.[0]?.role as OrgRole;
          if (!role) return null;
          return (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs font-medium">
                {t(`users.roles.${role}`)}
              </Badge>
              <button
                onClick={() => openRolePermsDialog(role)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title={t('users.rolePermissions')}
              >
                <Shield className="size-3.5" />
              </button>
            </div>
          );
        },
      },
      {
        headerName: t('users.password'),
        width: 90,
        sortable: false,
        filter: false,
        cellRenderer: (p: any) => {
          const hasPassword = p.data.accounts?.length > 0;
          return (
            <div className="flex items-center justify-center py-1">
              <span title={hasPassword ? t('users.hasPassword') : t('users.noPassword')}>
                <KeyRound
                  className={cn(
                    'size-4',
                    hasPassword
                      ? 'text-primary'
                      : 'text-muted-foreground/40',
                  )}
                />
              </span>
            </div>
          );
        },
      },
      {
        field: 'isActive',
        headerName: t('users.status'),
        width: 100,
        sortable: false,
        filter: false,
        cellRenderer: (p: any) => (
          <Badge variant={p.value ? 'default' : 'secondary'} className="text-xs">
            {p.value ? t('users.active') : t('users.inactive')}
          </Badge>
        ),
      },
      {
        field: 'createdAt',
        headerName: t('users.createdAt'),
        width: 120,
        valueFormatter: (p: any) => (p.value ? new Date(p.value).toLocaleDateString() : '-'),
      },
      {
        headerName: t('common.actions'),
        width: 80,
        pinned: 'right',
        sortable: false,
        filter: false,
        cellRenderer: (p: any) => (
          <div className="flex items-center justify-center py-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title={t('common.actions')}
                >
                  <MoreHorizontal className="size-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[180px]">
                <DropdownMenuItem onClick={() => openEditDialog(p.data)}>
                  <Pencil className="size-4" />
                  {t('common.edit')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openSetPasswordDialog(p.data.id)}>
                  <KeyRound className="size-4" />
                  {t('users.setPassword')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSendPasswordReset(p.data.id)}>
                  <Mail className="size-4" />
                  {t('users.sendPasswordReset')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleToggleActive(p.data.id)}>
                  <X className="size-4" />
                  {p.data.isActive ? t('users.inactive') : t('users.active')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => handleDelete(p.data.id, p.data.name)}
                >
                  <Trash2 className="size-4" />
                  {t('common.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [],
  );

  const defaultColDef = useMemo(
    () => ({ resizable: true, sortable: true, filter: true }),
    [],
  );

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{t('users.manageUsers')}</h2>
          <p className="text-sm text-muted-foreground">{t('common.description')}</p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2 shrink-0">
          <UserPlus className="size-4" />
          <span className="hidden sm:inline">{t('users.createUser')}</span>
          <span className="sm:hidden">{t('common.new')}</span>
        </Button>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 rounded-lg border overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full min-h-[300px]">
            <Spinner />
          </div>
        ) : (
          <div className="h-full w-full" style={{ minHeight: 400 }}>
            <AgGridReact
              rowData={users}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              theme={theme}
              animateRows
              domLayout="normal"
              getRowId={(params) => params.data.id}
              onGridReady={(params) => {
                gridApiRef.current = params.api;
              }}
              suppressScrollOnNewData
              enableCellTextSelection
              ensureDomOrder
            />
          </div>
        )}
      </div>

      {/* ── User Create/Edit Dialog ───────────────────────────────────────── */}
      <Dialog
        open={userDialogOpen}
        onOpenChange={(v) => {
          if (!isUserPending) {
            if (!v) closeUserDialog();
            else setUserDialogOpen(v);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="size-5 text-primary" />
              {isEditing ? t('users.editUser') : t('users.createUser')}
            </DialogTitle>
            <DialogDescription>{t('users.userDetails')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <Field>
              <Label htmlFor="name">{t('users.name')} *</Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                aria-invalid={!!formErrors.name}
              />
              {formErrors.name && <p className="text-xs text-destructive">{formErrors.name}</p>}
            </Field>

            <Field>
              <Label htmlFor="email">{t('users.email')} *</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@company.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                aria-invalid={!!formErrors.email}
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
                value={form.role}
                onValueChange={(v) => setForm({ ...form, role: v as OrgRole })}
              >
                <SelectTrigger id="role" className="w-full">
                  <SelectValue placeholder={t('users.selectRole')} />
                </SelectTrigger>
                <SelectContent>
                  {orgRoles.data?.map((role) => (
                    <SelectItem key={role} value={role}>
                      {t(`users.roles.${role}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.role && <p className="text-xs text-destructive">{formErrors.role}</p>}
            </Field>

            {form.role && (
              <RolePermissionsPreview
                role={form.role as OrgRole}
                t={t}
                onEdit={() => openRolePermsDialog(form.role as OrgRole)}
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

      {/* ── Set Password Dialog ───────────────────────────────────────────── */}
      <Dialog open={passwordDialogOpen} onOpenChange={(v) => { if (!v) closeSetPasswordDialog(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="size-5 text-primary" />
              {t('users.setPassword')}
            </DialogTitle>
            <DialogDescription>{t('users.userDetails')}</DialogDescription>
          </DialogHeader>

          <Field>
            <Label htmlFor="new-password">{t('users.newPassword')} *</Label>
            <Input
              id="new-password"
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setPasswordError(''); }}
              aria-invalid={!!passwordError}
            />
            {passwordError && <p className="text-xs text-destructive">{passwordError}</p>}
          </Field>

          <DialogFooter>
            <Button variant="outline" onClick={closeSetPasswordDialog} disabled={setPasswordMutation.isPending}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSetPassword} disabled={setPasswordMutation.isPending}>
              {setPasswordMutation.isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
              {t('users.confirmSetPassword')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Role Permissions Editor Dialog ────────────────────────────────── */}
      <Dialog open={rolePermsDialogOpen} onOpenChange={(v) => { if (!v) closeRolePermsDialog(); }}>
        <DialogContent className="sm:max-w-xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="size-5 text-primary" />
              {editingRole && t(`users.roles.${editingRole}`)} - {t('users.rolePermissions')}
            </DialogTitle>
            <DialogDescription>{t('users.permissionsByModule')}</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1 py-2">
            {permsLoading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : (
              Object.entries(permissionsByModule ?? {}).map(([module, perms]) => (
                <div key={module} className="space-y-1">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
                    {module}
                  </h4>
                  <div className="space-y-0.5">
                    {perms.map((perm: any) => {
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

// ── Role Permissions Preview ─────────────────────────────────────────────────

function RolePermissionsPreview({
  role,
  t,
  onEdit,
}: {
  role: OrgRole;
  t: any;
  onEdit: () => void;
}) {
  const { data: perms, isLoading } = trpc.users.rolePermissions.list.useQuery({ role });
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
  const visibleModules = expanded ? moduleKeys : moduleKeys.slice(0, 3);
  const hasMore = moduleKeys.length > 3;

  return (
    <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Shield className="size-4 text-primary" />
          {t('users.permissions')}
        </div>
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={onEdit}>
          <Pencil className="size-3" />
          {t('common.edit')}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-2">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      ) : !perms?.length ? (
        <p className="text-xs text-muted-foreground">{t('users.noPermissions')}</p>
      ) : (
        <div className="space-y-1">
          {visibleModules.map((module) => (
            <div key={module}>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {module}
              </p>
              <div className="flex flex-wrap gap-1 pb-1">
                {grouped[module].map((perm: any) => (
                  <Badge key={perm.code} variant="outline" className="text-[10px]">
                    {perm.label}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
          {hasMore && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-primary hover:underline mt-1"
            >
              {expanded ? (
                <><ChevronUp className="size-3" />Show less</>
              ) : (
                <><ChevronDown className="size-3" />Show {moduleKeys.length - 3} more</>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
