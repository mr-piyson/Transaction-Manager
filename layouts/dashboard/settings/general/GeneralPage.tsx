"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ImageUpload } from "@/components/dialogs/item-dialog/image-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc/client";
import { Field, type OrgData, SectionCard } from "../_shared";

export default function GeneralSettingsPage() {
  const t = useTranslations();
  const { data: rawOrg, isLoading } = trpc.settings.getOrg.useQuery();
  const utils = trpc.useUtils();
  const updateOrg = trpc.settings.updateOrg.useMutation({
    onSuccess: () => utils.settings.getOrg.invalidate(),
    onError: (e) => toast.error(e.message),
  });

  const org = rawOrg as OrgData | null | undefined;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!org) {
    return (
      <p className="text-muted-foreground text-sm">{t("errors.generic")}</p>
    );
  }

  return <GeneralForm org={org} updateOrg={updateOrg} />;
}

function GeneralForm({
  org,
  updateOrg,
}: {
  org: OrgData;
  updateOrg: ReturnType<typeof trpc.settings.updateOrg.useMutation>;
}) {
  const t = useTranslations();
  const [form, setForm] = useState(() => ({
    name: org.name ?? "",
    phone: org.phone ?? "",
    email: org.email ?? "",
    website: org.website ?? "",
    taxId: org.taxId ?? "",
    crNumber: org.crNumber ?? "",
    logo: org.logo,
    stampImage: org.stampImage,
  }));

  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const [pendingStampFile, setPendingStampFile] = useState<File | null>(null);
  const [logoRemoved, setLogoRemoved] = useState(false);
  const [stampRemoved, setStampRemoved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const oldLogoRef = useRef(org.logo);
  const oldStampRef = useRef(org.stampImage);

  const hasChanges = useMemo(
    () =>
      form.name !== (org.name ?? "") ||
      form.phone !== (org.phone ?? "") ||
      form.email !== (org.email ?? "") ||
      form.website !== (org.website ?? "") ||
      form.taxId !== (org.taxId ?? "") ||
      form.crNumber !== (org.crNumber ?? "") ||
      form.logo !== org.logo ||
      form.stampImage !== org.stampImage,
    [form, org],
  );

  const uploadFile = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/uploads", { method: "POST", body: formData });
    if (!res.ok) throw new Error("Upload failed");
    const data = await res.json();
    return data.storagePath as string;
  };

  const deleteFile = async (storagePath: string) => {
    try {
      await fetch(
        `/api/uploads?storagePath=${encodeURIComponent(storagePath)}`,
        {
          method: "DELETE",
        },
      );
    } catch {
      // best effort cleanup
    }
  };

  const handleSave = useCallback(async () => {
    try {
      let logoPath = form.logo;
      let stampPath = form.stampImage;

      if (logoRemoved) {
        logoPath = null;
        if (oldLogoRef.current) await deleteFile(oldLogoRef.current);
      } else if (pendingLogoFile) {
        logoPath = await uploadFile(pendingLogoFile);
        if (oldLogoRef.current && oldLogoRef.current !== logoPath) {
          await deleteFile(oldLogoRef.current);
        }
      }

      if (stampRemoved) {
        stampPath = null;
        if (oldStampRef.current) await deleteFile(oldStampRef.current);
      } else if (pendingStampFile) {
        stampPath = await uploadFile(pendingStampFile);
        if (oldStampRef.current && oldStampRef.current !== stampPath) {
          await deleteFile(oldStampRef.current);
        }
      }

      updateOrg.mutate({
        ...form,
        logo: logoPath,
        stampImage: stampPath,
      } as Parameters<typeof updateOrg.mutate>[0]);
    } catch {
      toast.error("Failed to upload image");
    }
  }, [
    form,
    pendingLogoFile,
    pendingStampFile,
    logoRemoved,
    stampRemoved,
    updateOrg,
  ]);

  const handleLogoUrlDrop = (storagePath: string) => {
    setForm((prev) => ({ ...prev, logo: storagePath }));
    setPendingLogoFile(null);
    setLogoRemoved(false);
  };

  const handleStampUrlDrop = (storagePath: string) => {
    setForm((prev) => ({ ...prev, stampImage: storagePath }));
    setPendingStampFile(null);
    setStampRemoved(false);
  };

  return (
    <div className="h-full space-y-6">
      <SectionCard
        title={t("settings.general")}
        description={t("settings.organization")}
      >
        <Field label={t("settings.organizationName")}>
          <Input
            value={form.name}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, name: e.target.value }))
            }
          />
        </Field>
        <Field label={t("settings.organizationPhone")}>
          <Input
            value={form.phone}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, phone: e.target.value }))
            }
          />
        </Field>
        <Field label={t("settings.organizationEmail")}>
          <Input
            type="email"
            value={form.email}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, email: e.target.value }))
            }
          />
        </Field>
        <Field label={t("customers.website")}>
          <Input
            value={form.website}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, website: e.target.value }))
            }
          />
        </Field>
      </SectionCard>

      <SectionCard title={t("common.details")}>
        <Field label={t("customers.taxId")}>
          <Input
            value={form.taxId}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, taxId: e.target.value }))
            }
          />
        </Field>
        <Field label={t("settings.crNumber")}>
          <Input
            value={form.crNumber}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, crNumber: e.target.value }))
            }
          />
        </Field>
      </SectionCard>

      <SectionCard
        title={t("settings.logo")}
        description={t("settings.logoDescription")}
      >
        <Field label={t("settings.logo")}>
          <ImageUpload
            value={logoRemoved ? null : form.logo}
            file={pendingLogoFile}
            onFileChange={(f) => {
              setPendingLogoFile(f);
              if (f) setLogoRemoved(false);
            }}
            onRemove={() => setLogoRemoved(true)}
            imageRemoved={logoRemoved}
            onUrlDrop={handleLogoUrlDrop}
          />
        </Field>
        <Field label={t("settings.stampImage")}>
          <ImageUpload
            value={stampRemoved ? null : form.stampImage}
            file={pendingStampFile}
            onFileChange={(f) => {
              setPendingStampFile(f);
              if (f) setStampRemoved(false);
            }}
            onRemove={() => setStampRemoved(true)}
            imageRemoved={stampRemoved}
            onUrlDrop={handleStampUrlDrop}
          />
        </Field>
      </SectionCard>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={!hasChanges || updateOrg.isPending || uploading}
        >
          {(updateOrg.isPending || uploading) && (
            <Loader2 className="size-4 mr-2 animate-spin" />
          )}
          {t("settings.saveSettings")}
        </Button>
      </div>
    </div>
  );
}
