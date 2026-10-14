"use client";

import { Box, Loader2, Wand2 } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { ImageUpload } from "./image-upload";
import { ANCHORS, type UseItemFormReturn } from "./use-item-form";

interface IdentitySectionProps {
  form: UseItemFormReturn;
  canManage: boolean;
}

export function IdentitySection({ form, canManage }: IdentitySectionProps) {
  const {
    mode,
    master,
    categories,
    duplicateItem,
    setMasterField,
    handleMasterNameBlur,
    pendingImageFile,
    setPendingImageFile,
    setImageRemoved,
    imageRemoved,
    errorFor,
  } = form;

  const generateSku = trpc.categories.generateSku.useMutation();

  const editable = canManage && !form.identityLocked;
  const nameError = errorFor(ANCHORS.name);
  const skuError = errorFor(ANCHORS.sku);

  const handleGenerateSku = React.useCallback(() => {
    const selected = categories.find((c: any) => c.id === master.categoryId);
    const categoryCode = selected?.name
      ?.substring(0, 10)
      .toUpperCase()
      .replace(/\s+/g, "");
    generateSku.mutate(
      { categoryCode },
      { onSuccess: (data) => setMasterField("sku", data.sku) },
    );
  }, [categories, master.categoryId, generateSku, setMasterField]);

  return (
    <section
      id="sec-identity"
      data-section="identity"
      className="scroll-mt-4 space-y-5 border-b py-6"
    >
      <div>
        <h3 className="text-lg font-medium">Identity</h3>
        <p className="text-sm text-muted-foreground">
          What the item is called and how people find it.
        </p>
      </div>

      {mode === "create" && duplicateItem && (
        <div
          id={ANCHORS.name}
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-3.5 py-3 text-sm"
        >
          <div>
            <b>&ldquo;{duplicateItem.name}&rdquo; already exists.</b> Creating
            it again would split its stock and prices across two records.
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={form.adoptDuplicate}>
              Add a supplier price to it
            </Button>
            <Button size="sm" variant="outline" onClick={form.dismissDuplicate}>
              Keep creating
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-[128px_minmax(0,1fr)]">
        {editable ? (
          <ImageUpload
            value={master.image}
            file={pendingImageFile}
            onFileChange={(f) => {
              setPendingImageFile(f);
              if (f) setImageRemoved(false);
            }}
            onRemove={() => setImageRemoved(true)}
            imageRemoved={imageRemoved}
            onUrlDrop={(storagePath) => {
              setMasterField("image", storagePath);
              setImageRemoved(false);
            }}
          />
        ) : (
          <div className="grid aspect-square w-full max-w-[128px] place-items-center rounded-lg border bg-muted/40 text-muted-foreground">
            {master.image ? (
              <img
                src={master.image}
                alt=""
                className="size-full rounded-lg object-cover"
              />
            ) : (
              <span className="text-xs">No photo</span>
            )}
          </div>
        )}

        <div className="space-y-4">
          <Field data-invalid={!!nameError}>
            <Label htmlFor={ANCHORS.name}>
              Item name <span className="text-destructive">*</span>
            </Label>
            <Input
              id={ANCHORS.name}
              placeholder="e.g. Copper Pipe 15mm x 3m"
              autoComplete="off"
              value={master.name}
              disabled={!editable}
              onChange={(e) => setMasterField("name", e.target.value)}
              onBlur={handleMasterNameBlur}
              className={cn(nameError && "border-destructive")}
            />
            {nameError && (
              <p className="text-sm text-destructive">{nameError}</p>
            )}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={!!skuError}>
              <Label htmlFor={ANCHORS.sku}>
                Internal SKU <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  id={ANCHORS.sku}
                  placeholder="PLM-0001"
                  autoComplete="off"
                  className={cn("font-mono", skuError && "border-destructive")}
                  value={master.sku}
                  disabled={!editable}
                  onChange={(e) => setMasterField("sku", e.target.value)}
                />
                {mode === "create" && editable && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGenerateSku}
                    disabled={generateSku.isPending}
                  >
                    {generateSku.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Wand2 className="size-4" />
                    )}
                  </Button>
                )}
              </div>
              {skuError && (
                <p className="text-sm text-destructive">{skuError}</p>
              )}
            </Field>

            <Field>
              <Label htmlFor="item-field-barcode">Barcode</Label>
              <Input
                id="item-field-barcode"
                placeholder="EAN / UPC"
                autoComplete="off"
                className="font-mono"
                value={master.barcode ?? ""}
                disabled={!editable}
                onChange={(e) =>
                  setMasterField("barcode", e.target.value || undefined)
                }
              />
            </Field>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <Label>Type</Label>
          <div className="inline-flex w-fit gap-0.5 rounded-lg border bg-muted p-0.5">
            {(["PRODUCT", "SERVICE"] as const).map((type) => (
              <Button
                key={type}
                variant="ghost"
                type="button"
                disabled={!editable}
                aria-pressed={master.type === type}
                onClick={() => setMasterField("type", type)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  master.type === type
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                  !editable && "cursor-not-allowed opacity-50",
                )}
              >
                {type === "PRODUCT" ? <Box /> : <Wand2 />}
                {type === "PRODUCT" ? "Product" : "Service"}
              </Button>
            ))}
          </div>
        </Field>

        <Field>
          <Label htmlFor="item-field-category">Category</Label>
          <Select
            items={categories.map((c: any) => ({ value: c.id, label: c.name }))}
            value={master.categoryId ?? ""}
            disabled={!editable}
            onValueChange={(v) => setMasterField("categoryId", v || undefined)}
          >
            <SelectTrigger id="item-field-category">
              <SelectValue placeholder="No category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field className="sm:col-span-2">
          <Label htmlFor="item-field-description">Description</Label>
          <Textarea
            id="item-field-description"
            placeholder="Shown on quotes and purchase orders"
            value={master.description ?? ""}
            disabled={!editable}
            onChange={(e) =>
              setMasterField("description", e.target.value || undefined)
            }
          />
        </Field>
      </div>
    </section>
  );
}
