'use client';

import { AllCommunityModule, ModuleRegistry, type ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Pencil,
  Shield,
  UserPlus,
  Users,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { useTableTheme } from '@/hooks/use-table-theme';
import { trpc } from '@/lib/trpc/client';

ModuleRegistry.registerModules([AllCommunityModule]);

type OrgRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'ACCOUNTANT' | 'SALES' | 'WAREHOUSE' | 'VIEWER';

export default function PermissionsPage() {
  const t = useTranslations();
  const theme = useTableTheme();
  const utils = trpc.useUtils();

  const { data: allPermissions, isLoading: permsLoading } = trpc.users.permissions.listAll.useQuery();
  const { data: permissionsByModule } = trpc.users.permissions.list.useQuery();
  const { data: roleCounts } = trpc.users.countByRole.useQuery();
  const { data: users } = trpc.users.list.useQuery();
  const orgRoles = trpc.users.orgRoles.useQuery();

  const rolePermsUpdateMutation = trpc.users.rolePermissions.update.useMutation({
    onSuccess: () => {
      utils.users.rolePermissions.list.invalidate();
      utils.users.permissions.list.invalidate();
      toast.success(t('users.rolePermissionsUpdated'));
      setRolePermsDirty(false);
    },
    onError: (e) => toast.error(e.message),
  });

  // ── Role Permissions Editor State ────────────────────────────────────────
  const [rolePermsDialogOpen, setRolePermsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<OrgRole | null>(null);
  const [selectedPermIds, setSelectedPermIds] = useState<string[]>([]);
  const [rolePermsDirty, setRolePermsDirty] = useState(false);

  const { data: editingRolePerms, isLoading: permsForRoleLoading } = trpc.users.rolePermissions.list.useQuery(
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

  // ── Stats ────────────────────────────────────────────────────────────────
  const roles = orgRoles.data ?? [];
  const totalPermissions = allPermissions?.length ?? 0;
  const totalUsers = users?.length ?? 0;

  const columnDefs = useMemo<ColDef[]>(
    () => [
      {
        field: 'role',
        headerName: t('users.role'),
        width: 160,
        cellRenderer: (p: any) => (
          <div className="flex items-center gap-2 py-2">
            <Shield className="size-4 text-primary shrink-0" />
            <span className="text-sm font-medium">{t(`users.roles.${p.value as OrgRole}`)}</span>
          </div>
        ),
      },
      {
        headerName: t('users.totalUsers'),
        width: 120,
        cellRenderer: (p: any) => {
          const count = roleCounts?.[p.data.role as OrgRole] ?? 0;
          return (
            <div className="flex items-center gap-2 py-1">
              <Users className="size-4 text-muted-foreground" />
              <span className="text-sm tabular-nums font-medium">{count}</span>
            </div>
          );
        },
      },
      {
        field: 'permissions',
        headerName: t('users.permissions'),
        minWidth: 300,
        flex: 1,
        sortable: false,
        filter: false,
        cellRenderer: (p: any) => {
          const role = p.data.role as OrgRole;
          return <PermissionBadges role={role} t={t} />;
        },
      },
      {
        headerName: t('common.actions'),
        width: 220,
        pinned: 'right',
        sortable: false,
        filter: false,
        cellRenderer: (p: any) => (
          <div className="flex items-center gap-2 py-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => openRolePermsDialog(p.data.role as OrgRole)}
            >
              <Pencil className="size-3.5" />
              {t('users.editPermissions')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1.5"
              asChild
            >
              <Link href="/app/settings/users">
                <Users className="size-3.5" />
                {t('users.viewUsers')}
              </Link>
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  const defaultColDef = useMemo(
    () => ({ resizable: true, sortable: true }),
    [],
  );

  const rowData = useMemo(
    () => roles.map((role) => ({ role })),
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
        <Button className="gap-2 shrink-0" asChild>
          <Link href="/app/settings/users">
            <UserPlus className="size-4" />
            <span className="hidden sm:inline">{t('users.createUser')}</span>
            <span className="sm:hidden">{t('common.new')}</span>
          </Link>
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('users.totalRoles')}
            </CardTitle>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('users.totalPermissions')}
            </CardTitle>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('users.totalUsers')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="size-5 text-primary" />
              <span className="text-2xl font-bold tabular-nums">{totalUsers}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Roles Table */}
      <div className="flex-1 min-h-0 rounded-lg border overflow-hidden">
        {permsLoading ? (
          <div className="flex items-center justify-center h-full min-h-[300px]">
            <Spinner />
          </div>
        ) : (
          <div className="h-full w-full" style={{ minHeight: 400 }}>
            <AgGridReact
              rowData={rowData}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              theme={theme}
              animateRows
              domLayout="normal"
              getRowId={(params) => params.data.role}
              suppressScrollOnNewData
              enableCellTextSelection
              ensureDomOrder
            />
          </div>
        )}
      </div>

      {/* ── Role Permissions Editor Dialog ────────────────────────────────── */}
      <Dialog open={rolePermsDialogOpen} onOpenChange={(v) => { if (!v) closeRolePermsDialog(); }}>
        <DialogContent className="sm:max-w-xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="size-5 text-primary" />
              {editingRole && t('users.permissionsForRole', { role: t(`users.roles.${editingRole}`) })}
            </DialogTitle>
            <DialogDescription>{t('users.permissionsByModule')}</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1 py-2">
            {permsForRoleLoading ? (
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

// ── Permission Badges ────────────────────────────────────────────────────────

function PermissionBadges({ role, t }: { role: OrgRole; t: any }) {
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
