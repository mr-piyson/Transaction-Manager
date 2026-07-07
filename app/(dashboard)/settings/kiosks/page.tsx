'use client';

import { useTranslations } from 'next-intl';
import { Copy, Key, Loader2, MoreHorizontal, Plus, Trash2, Monitor, ExternalLink } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { trpc } from '@/lib/trpc/client';

export default function KiosksSettingsPage() {
  const t = useTranslations();
  const utils = trpc.useUtils();
  const { data: kiosks, isLoading } = trpc.hr.kiosk.list.useQuery();
  const createKiosk = trpc.hr.kiosk.create.useMutation({
    onSuccess: () => {
      utils.hr.kiosk.list.invalidate();
      toast.success(t('settings.kiosks.created'));
      setCreateOpen(false);
      setNewName('');
    },
    onError: (e) => toast.error(e.message),
  });
  const updateKiosk = trpc.hr.kiosk.update.useMutation({
    onSuccess: () => utils.hr.kiosk.list.invalidate(),
    onError: (e) => toast.error(e.message),
  });
  const regenerateToken = trpc.hr.kiosk.regenerateToken.useMutation({
    onSuccess: () => {
      utils.hr.kiosk.list.invalidate();
      toast.success(t('settings.kiosks.tokenRegenerated'));
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteKiosk = trpc.hr.kiosk.remove.useMutation({
    onSuccess: () => {
      utils.hr.kiosk.list.invalidate();
      toast.success(t('settings.kiosks.deleted'));
    },
    onError: (e) => toast.error(e.message),
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleCreate = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!newName.trim()) return;
      createKiosk.mutate({ name: newName.trim() });
    },
    [newName, createKiosk],
  );

  const handleCopyToken = useCallback(
    (token: string) => {
      navigator.clipboard.writeText(token);
      toast.success(t('settings.kiosks.tokenCopied'));
    },
    [t],
  );

  const handleCopyUrl = useCallback(
    (token: string) => {
      const url = `${window.location.origin}/kiosk/attendance?token=${token}`;
      navigator.clipboard.writeText(url);
      toast.success(t('settings.kiosks.urlCopied'));
    },
    [t],
  );

  const handleRegenerate = useCallback(
    (id: string) => {
      setRegeneratingId(id);
      regenerateToken.mutate({ id });
    },
    [regenerateToken],
  );

  const handleToggleActive = useCallback(
    (id: string, current: boolean) => {
      setTogglingId(id);
      updateKiosk.mutate(
        { id, isActive: !current },
        { onSettled: () => setTogglingId(null) },
      );
    },
    [updateKiosk],
  );

  const handleDelete = useCallback(
    (id: string) => {
      setDeletingId(id);
      deleteKiosk.mutate({ id });
    },
    [deleteKiosk],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t('settings.kiosks.title')}</CardTitle>
            <CardDescription>{t('settings.kiosks.description')}</CardDescription>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4 mr-2" />
                {t('settings.kiosks.create')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleCreate}>
                <DialogHeader>
                  <DialogTitle>{t('settings.kiosks.create')}</DialogTitle>
                  <DialogDescription>
                    {t('settings.kiosks.description')}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">{t('settings.kiosks.name')}</Label>
                    <Input
                      id="name"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder={t('settings.kiosks.namePlaceholder')}
                      autoFocus
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={!newName.trim() || createKiosk.isPending}
                  >
                    {createKiosk.isPending && (
                      <Loader2 className="size-4 mr-2 animate-spin" />
                    )}
                    {t('settings.kiosks.create')}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {!kiosks || kiosks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Monitor className="size-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium">{t('settings.kiosks.noKiosks')}</p>
              <p className="text-sm mt-1">{t('settings.kiosks.noKiosksDesc')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('settings.kiosks.name')}</TableHead>
                  <TableHead>{t('settings.kiosks.token')}</TableHead>
                  <TableHead>{t('settings.kiosks.kioskUrl')}</TableHead>
                  <TableHead>{t('settings.kiosks.isActive')}</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {kiosks.map((kiosk) => (
                  <TableRow key={kiosk.id}>
                    <TableCell className="font-medium">{kiosk.name}</TableCell>
                    <TableCell>
                      <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">
                        {kiosk.token.slice(0, 8)}...
                      </code>
                    </TableCell>
                    <TableCell>
                      <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-xs">
                        ...{kiosk.token.slice(0, 8)}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={kiosk.isActive}
                          onCheckedChange={() => handleToggleActive(kiosk.id, kiosk.isActive)}
                          disabled={togglingId === kiosk.id}
                        />
                        <Badge variant={kiosk.isActive ? 'default' : 'secondary'}>
                          {kiosk.isActive
                            ? t('settings.kiosks.active')
                            : t('settings.kiosks.inactive')}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => handleCopyToken(kiosk.token)}>
                            <Copy className="size-4 mr-2" />
                            {t('settings.kiosks.copyToken')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCopyUrl(kiosk.token)}>
                            <ExternalLink className="size-4 mr-2" />
                            {t('settings.kiosks.copyUrl')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleRegenerate(kiosk.id)}
                            disabled={regeneratingId === kiosk.id}
                          >
                            <Key className="size-4 mr-2" />
                            {t('settings.kiosks.regenerateToken')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(kiosk.id)}
                            disabled={deletingId === kiosk.id}
                            className="text-destructive"
                          >
                            <Trash2 className="size-4 mr-2" />
                            {t('common.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
