---
name: project_ui_design
description: Handles everything related to the project UI design and components and pages and layouts and UX patterns and design aesthetic and feedback and interaction and empty states and code snippet standard and non-negotiable rules and mental model
---

# 🧠 SKILL: High-Fidelity UI Engineering

## 🎯 Core Stack & Principles

The agent must **strictly adhere** to the following technical stack for all UI/UX tasks:

- **Framework:** Next.js (App Router)
- **Language:** TypeScript (Strict Mode)
- **Runtime / Package Manager:** bun
  - Use `bun add` for dependencies
  - Use `bunx` for CLI tools

- **Styling:** Tailwind CSS
  - Utility-first approach
  - ❌ No CSS modules

- **Components:** shadcn/ui (baseUI primitives)
- **Icons:** Lucide React
- **Validation:** Zod
  - Required for all form schemas and API props

---

## 🛠 Design Implementation Rules

### 1. Atomic Component Architecture

- **Composition Over Configuration**
  - Prefer sub-component patterns:

    ```tsx
    <Card>
      <CardHeader />
      <CardContent />
    </Card>
    ```

  - ❌ Avoid large prop objects

- **Client vs Server Components**
  - Default to **Server Components**
  - Use `'use client'` only for:
    - Forms
    - Interactive buttons
    - Stateful UI

  - Keep client boundaries **small and isolated**

---

### 2. The "Type-Safe First" Workflow

- Every component must have **strict TypeScript interfaces**

- Use **Zod** for:
  - Form validation
  - API data contracts
  - Complex domain models

- Always derive types from schemas:

  ```ts
  const invoiceSchema = z.object({
    id: z.string(),
    amount: z.number(),
  });

  type TInvoice = z.infer<typeof invoiceSchema>;
  ```

- ❌ Never duplicate types manually

---

### 3. shadcn/ui Integration

- **Installation Rule**

  ```bash
  bunx shadcn@latest add [component]
  ```

- **Customization Strategy**
  - Use `tailwind.config.ts` and `globals.css`
  - Design tokens should reflect:
    - Subtle border radius
    - Neutral grayscale palette
    - Strong, high-contrast primary color

- Avoid excessive overrides — stay within the system

---

### 4. Layout & UX Patterns

- **Layout**
  - Use **Flexbox** → all cases
  - Don't Use **CSS Grid**

- **Loading States**
  - Use: `@/hooks/data/...` to get the loading state
  - Use: `@/components/ui/skeleton` to show skeleton

  - Optimize for **perceived performance**

- **Icons (Lucide)**
  - Standard size: `18` or `20`
  - Consistent stroke + spacing
  - Always aligned with text baselines

---

## 🎨 Design Aesthetic: "The Professional Developer"

A UI style optimized for **serious tools (ERP, dashboards, admin panels)**

### Principles

- **Density over emptiness**
  - Clean, but information-rich
  - Avoid excessive whitespace

- **Clarity first**
  - Every UI element must serve a purpose

- **Consistency**
  - Spacing, typography, and color must feel systematic

---

### Feedback & Interaction

- Use **toast notifications** (e.g., `sonner`)
- Provide immediate system feedback:
  - Success
  - Errors
  - Warnings

---

### Empty States

Always handle "no data" scenarios:

- Include:
  - Icon (Lucide)
  - Clear explanation
  - Strong CTA

Example:

```tsx
<div className="flex flex-col items-center justify-center py-12 text-center">
  <Inbox className="mb-4 h-10 w-10 text-muted-foreground" />
  <p className="text-sm text-muted-foreground">No records found</p>
  <Button className="mt-4">Create New</Button>
</div>
```

---

## ⚡ Non-Negotiable Rules

- ✅ Type safety is mandatory
- ✅ Client-first architecture
- ✅ Consistent component composition
- ✅ Design for real-world data density
- ❌ No inline hacks or quick fixes
- ❌ No visual inconsistency
- ❌ No skipping loading / empty states

---

## 🧩 Mental Model

Build interfaces like a **system**, not pages:

- Reusable primitives
- Predictable patterns
- Scalable structure
- Clean developer experience

---

This is not just UI — this is **UI engineering discipline**.
