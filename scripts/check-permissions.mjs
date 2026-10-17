#!/usr/bin/env node
/**
 * Authorization completeness check (`bun run check:authz`).
 *
 * Fails the build when the permission wiring drifts:
 *   1. Any permission code used in code (`.require(...)`, `assertCan(...)`,
 *      `requirePermission(...)`, `can(...)`, or the route manifest) must exist
 *      in lib/permissions-registry.ts. Catches typos and stale codes.
 *   2. Every entity page route under app/(dashboard) must be covered by a
 *      server route guard (`requirePermission`) in its segment or an ancestor,
 *      so a crafted URL cannot bypass the UI.
 *
 * Zero dependencies — runs on plain Node.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const REGISTRY = "lib/permissions-registry.ts";
const DASHBOARD = "app/(dashboard)";

/** Directories under app/(dashboard)/erp that own a route guard. */
const ROUTE_ROOT_GUARDS = {
  "app/(dashboard)/erp/documents/invoices": "layout.tsx",
  "app/(dashboard)/erp/documents/quotations": "layout.tsx",
  "app/(dashboard)/erp/reports": "layout.tsx",
  "app/(dashboard)/settings": "layout.tsx",
};

const errors = [];
const fail = (msg) => errors.push(msg);

// ── helpers ──────────────────────────────────────────────────────────────────

function walk(dir, filter) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      out.push(...walk(full, filter));
    } else if (filter(full)) {
      out.push(full);
    }
  }
  return out;
}

const read = (file) => fs.readFileSync(file, "utf8");

// ── 1. Collect the registry codes ────────────────────────────────────────────

if (!fs.existsSync(REGISTRY)) {
  console.error(`✗ Missing registry: ${REGISTRY}`);
  process.exit(1);
}

const registrySource = read(REGISTRY);
const registryCodes = new Set(
  [...registrySource.matchAll(/code:\s*"([^"]+)"/g)].map((m) => m[1]),
);

// ── 2. Collect permission codes referenced in code ───────────────────────────

/** Pulls quoted strings out of a `requirePermission([...])` / `["a","b"]` blob. */
function quotedList(blob) {
  return [...blob.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

const referenced = new Map(); // code -> Set<file>

function note(code, file) {
  if (!referenced.has(code)) referenced.set(code, new Set());
  referenced.get(code).add(file);
}

function collectFromFile(file, source) {
  // .require("code") / can("code") / requirePermission("code")
  for (const m of source.matchAll(
    /\.require\(\s*"([^"]+)"|requirePermission\(\s*"([^"]+)"|\.can\(\s*"([^"]+)"/g,
  )) {
    note(m[1] ?? m[2] ?? m[3], file);
  }
  // requirePermission([...])
  for (const m of source.matchAll(/requirePermission\(\s*\[([^\]]*)\]/g)) {
    for (const code of quotedList(m[1])) note(code, file);
  }
  // assertCan(ctx.ability, "code", ...)
  for (const m of source.matchAll(/assertCan\([^,]+,\s*"([^"]+)"/g)) {
    note(m[1], file);
  }
  // The route manifest
  for (const m of source.matchAll(/read:\s*\[([^\]]*)\]/g)) {
    for (const code of quotedList(m[1])) note(code, file);
  }
  for (const m of source.matchAll(
    /(?:read|create|update):\s*"([^"]+)"|read:\s*\[([^\]]*)\]/g,
  )) {
    if (m[1]) note(m[1], file);
  }
}

const codeFiles = [
  ...walk("server", (f) => f.endsWith(".ts")),
  ...walk("app", (f) => f.endsWith(".ts") || f.endsWith(".tsx")),
  ...walk("lib", (f) => f.endsWith(".ts")),
  ...walk("components", (f) => f.endsWith(".ts") || f.endsWith(".tsx")),
  ...walk("hooks", (f) => f.endsWith(".ts") || f.endsWith(".tsx")),
].filter((f) => f !== REGISTRY);

for (const file of codeFiles) {
  collectFromFile(file, read(file));
}

for (const [code, files] of referenced) {
  if (!registryCodes.has(code)) {
    fail(
      `Unknown permission code "${code}" (used in ${[...files]
        .slice(0, 3)
        .join(", ")}). Add it to ${REGISTRY}.`,
    );
  }
}

// ── 3. Every entity route is guarded ─────────────────────────────────────────

function guardExists(dir) {
  const layout = path.join(dir, "layout.tsx");
  const page = path.join(dir, "page.tsx");
  return (
    (fs.existsSync(layout) && read(layout).includes("requirePermission(")) ||
    (fs.existsSync(page) && read(page).includes("requirePermission("))
  );
}

/** Segment is guarded if it or any ancestor up to (dashboard) has a guard. */
function ancestorGuarded(dir) {
  let current = dir;
  const stop = path.resolve(DASHBOARD);
  while (path.resolve(current).startsWith(stop)) {
    if (guardExists(current)) return true;
    if (path.resolve(current) === stop) break;
    current = path.dirname(current);
  }
  return false;
}

const erpRoot = path.join(DASHBOARD, "erp");
for (const entry of fs.readdirSync(erpRoot, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const dir = path.join(erpRoot, entry.name);
  // `documents` has no page of its own — its children are checked below.
  if (entry.name === "documents") {
    for (const child of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!child.isDirectory()) continue;
      const childDir = path.join(dir, child.name);
      if (!ancestorGuarded(childDir)) {
        fail(`Route ${childDir} has no server guard (requirePermission).`);
      }
      checkNewEdit(childDir);
    }
    continue;
  }
  if (!ancestorGuarded(dir)) {
    fail(`Route ${dir} has no server guard (requirePermission).`);
  }
  checkNewEdit(dir);
}

for (const [dir, expected] of Object.entries(ROUTE_ROOT_GUARDS)) {
  const file = path.join(dir, expected);
  if (!fs.existsSync(file)) {
    fail(`Expected route guard ${file} to exist.`);
    continue;
  }
  if (!read(file).includes("requirePermission(")) {
    fail(`${file} must call requirePermission(...).`);
  }
}

/** `/new` and `/[id]/edit` pages must be guarded. */
function checkNewEdit(dir) {
  const candidates = walk(dir, (f) => f.endsWith("page.tsx"));
  for (const file of candidates) {
    const rel = path.relative(dir, file).replaceAll(path.sep, "/");
    if (rel === "new/page.tsx" || /\[[^/]+\]\/edit\/page\.tsx$/.test(rel)) {
      if (!read(file).includes("requirePermission(")) {
        fail(`${file} must call requirePermission(...).`);
      }
    }
  }
}

// ── report ───────────────────────────────────────────────────────────────────

if (errors.length) {
  console.error(`✗ Authorization check failed (${errors.length}):`);
  for (const e of errors) console.error(`  • ${e}`);
  process.exit(1);
}

console.log(
  `✓ Authorization check passed — ${registryCodes.size} registry codes, ` +
    `${referenced.size} referenced, all entity routes guarded.`,
);
