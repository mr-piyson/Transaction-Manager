"use client";

import {
  CheckCircle,
  Edit,
  Eye,
  FileDown,
  type LucideIcon,
  Package,
  Printer,
  Send,
  ShieldAlert,
  ThumbsDown,
  Trash2,
  Wallet,
  XCircle,
} from "lucide-react";
import type {
  ContextMenuItemSchema,
  ContextMenuSeparatorItem,
} from "@/components/context-menu";
import type { Action, AppAbilityType } from "@/lib/abilities";

/**
 * Universal purchase-order actions.
 *
 * Single source of truth for the PO action menu, consumed by BOTH the list
 * row context menu (`UniversalContextMenu`) and the detail page three-dot
 * dropdown (`ActionsDropdown`). The set is derived dynamically from:
 *   - the record state (`po.status`)
 *   - the current user's CASL ability (`ability`)
 *   - role flags (`isSuperAdmin`)
 *   - the surface (`scope`): "list" keeps past behavior (actions shown with
 *     disabled states where the status makes them inapplicable); "detail"
 *     shows only the actions valid for the current status.
 */

export type POActionKey =
  | "view"
  | "edit"
  | "submit"
  | "approve"
  | "reject"
  | "order"
  | "receive"
  | "cancel"
  | "delete"
  | "hardDelete"
  | "recordExpense"
  | "print";

export type POActionScope = "list" | "detail";

export interface POActionRecord {
  id: string;
  serial: string;
  status: string;
}

export type POActionHandlers = Partial<Record<POActionKey, () => void>>;

export interface POActionsContext {
  po: POActionRecord;
  t: (key: any) => string;
  ability: AppAbilityType | null;
  isSuperAdmin: boolean;
  scope: POActionScope;
  handlers: POActionHandlers;
}

const EDITABLE_STATUSES = ["DRAFT", "PENDING_APPROVAL"];
const NON_CANCELLABLE_STATUSES = [
  "CANCELLED",
  "CLOSED",
  "RECEIVED",
  "INVOICED",
];
const RECORD_EXPENSE_STATUSES = [
  "APPROVED",
  "ORDERED",
  "PARTIAL_RECEIVED",
  "RECEIVED",
  "INVOICED",
];

const STATUS_ACTIONS: Partial<Record<string, POActionKey[]>> = {
  DRAFT: ["submit", "edit", "delete"],
  PENDING_APPROVAL: ["approve", "reject", "cancel"],
  APPROVED: ["order", "cancel"],
  ORDERED: ["receive", "cancel"],
  PARTIAL_RECEIVED: ["receive", "cancel"],
  RECEIVED: [],
  INVOICED: [],
  CANCELLED: [],
  CLOSED: [],
};

interface ActionDef {
  labelKey: string;
  icon: LucideIcon;
  /** CASL permission; undefined = not permission-gated (e.g. SUPER_ADMIN) */
  permission?: Action;
  destructive?: boolean;
}

const ACTION_DEFS: Record<POActionKey, ActionDef> = {
  view: { labelKey: "common.viewDetails", icon: Eye, permission: "po:read" },
  edit: { labelKey: "common.edit", icon: Edit, permission: "po:update" },
  submit: {
    labelKey: "purchaseOrders.submitForApproval",
    icon: Send,
    permission: "po:update",
  },
  approve: {
    labelKey: "common.approve",
    icon: CheckCircle,
    permission: "po:approve",
  },
  reject: {
    labelKey: "common.reject",
    icon: ThumbsDown,
    permission: "po:approve",
    destructive: true,
  },
  order: {
    labelKey: "purchaseOrders.placeOrder",
    icon: FileDown,
    permission: "po:approve",
  },
  receive: {
    labelKey: "purchaseOrders.receiveStock",
    icon: Package,
    permission: "po:receive",
  },
  cancel: {
    labelKey: "common.cancel",
    icon: XCircle,
    permission: "po:delete",
    destructive: true,
  },
  delete: {
    labelKey: "common.delete",
    icon: Trash2,
    permission: "po:delete",
    destructive: true,
  },
  hardDelete: {
    labelKey: "hardDelete.menu",
    icon: ShieldAlert,
    destructive: true,
  },
  recordExpense: {
    labelKey: "purchaseOrders.recordExpense",
    icon: Wallet,
    permission: "expense:create",
  },
  print: {
    labelKey: "common.print",
    icon: Printer,
    permission: "po:read",
  },
};

function separator(id: string): ContextMenuSeparatorItem {
  return { id, type: "separator" };
}

function actionItem(
  key: POActionKey,
  ctx: POActionsContext,
  options?: { disabled?: boolean; separatorBefore?: boolean },
): ContextMenuItemSchema[] {
  const def = ACTION_DEFS[key];
  const handler = ctx.handlers[key];

  const item: ContextMenuItemSchema = {
    id: key,
    key,
    label: ctx.t(def.labelKey),
    icon: def.icon,
    destructive: def.destructive,
    onClick: () => handler?.(),
    ...(options?.disabled ? { disabled: true } : {}),
  };

  if (options?.separatorBefore) {
    return [separator(`sep-${key}`), item];
  }

  return [item];
}

export function buildPOActions(ctx: POActionsContext): ContextMenuItemSchema[] {
  const { po, ability, isSuperAdmin, scope, handlers } = ctx;

  const has = (permission?: Action) => {
    if (!permission) return true;
    return ability?.can(permission, "PurchaseOrder") ?? false;
  };

  const pick = <K extends POActionKey>(
    ...keys: K[]
  ): ContextMenuItemSchema[] => {
    const out: ContextMenuItemSchema[] = [];
    for (const key of keys) {
      const def = ACTION_DEFS[key];
      if (!has(def.permission) || !handlers[key]) continue;
      out.push(...actionItem(key, ctx));
    }
    return out;
  };

  if (scope === "list") {
    const isEditable = EDITABLE_STATUSES.includes(po.status);
    const isDeletable = po.status === "DRAFT";
    const isCancellable = !NON_CANCELLABLE_STATUSES.includes(po.status);

    const items: ContextMenuItemSchema[] = [...pick("view")];

    if (has(ACTION_DEFS.edit.permission) && handlers.edit) {
      items.push(...actionItem("edit", ctx, { disabled: !isEditable }));
    }

    if (isCancellable && handlers.cancel) {
      items.push(...pick("cancel"));
    }

    if (has(ACTION_DEFS.delete.permission) && handlers.delete) {
      items.push(separator("sep1"));
      items.push(...actionItem("delete", ctx, { disabled: !isDeletable }));
    }

    if (isSuperAdmin && handlers.hardDelete) {
      items.push(...actionItem("hardDelete", ctx, { separatorBefore: true }));
    }

    return items;
  }

  // scope === "detail"
  const cluster = pick(...(STATUS_ACTIONS[po.status] ?? []));

  if (handlers.print) {
    cluster.push(...actionItem("print", ctx, { separatorBefore: true }));
  }

  if (isSuperAdmin && handlers.hardDelete) {
    cluster.push(...actionItem("hardDelete", ctx, { separatorBefore: true }));
  }

  if (
    has(ACTION_DEFS.recordExpense.permission) &&
    handlers.recordExpense &&
    RECORD_EXPENSE_STATUSES.includes(po.status)
  ) {
    cluster.push(
      ...actionItem("recordExpense", ctx, { separatorBefore: true }),
    );
  }

  return cluster;
}
