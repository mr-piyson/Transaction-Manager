---
name: Transaction Manager
description: A calm, bilingual ERP control deck for small-business operations and double-entry accounting.
colors:
  primary: "#2c2742"
  primary-foreground: "#fbfbfb"
  secondary: "#2c2742"
  secondary-foreground: "#fbfbfb"
  background: "#ffffff"
  card: "#f5f5f5"
  foreground: "#17141d"
  muted: "#dddddd"
  muted-foreground: "#606060"
  accent: "#eeeeee"
  accent-foreground: "#2c2742"
  info: "#6366f1"
  default: "#c3ebfe"
  default-foreground: "#1e4974"
  success: "#1d8645"
  destructive: "#a82b2b"
  warning: "#b56927"
  border: "#cccccc"
  input: "#d5d5d5"
  ring: "#aba8c1"
  sidebar: "#f5f5f5"
  sidebar-foreground: "#17141d"
  sidebar-primary: "#7c4dff"
  sidebar-border: "#e9e8f0"
  dark-background: "#191919"
  dark-card: "#242424"
  dark-foreground: "#fbfbfb"
  dark-primary: "#00558d"
  dark-secondary: "#007acc"
  dark-muted: "#2b2b2b"
  dark-muted-foreground: "#888888"
  dark-accent: "#2b2b2b"
  dark-default: "#1a3150"
  dark-default-foreground: "#0099cc"
  dark-border: "#454545"
  dark-sidebar: "#191919"
  dark-sidebar-primary: "#7c4dff"
  dark-ring: "#6a6285"
typography:
  display:
    fontFamily: "'Geist', 'Geist Sans', ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 6vw, 4.5rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "'Geist', 'Geist Sans', ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title:
    fontFamily: "'Geist', 'Geist Sans', ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "'Geist', 'Geist Sans', ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'Geist', 'Geist Sans', ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
  full: "9999px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    typography: "{typography.label}"
    padding: "16px 16px"
    height: "36px"
    size: "16px"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    typography: "{typography.label}"
    padding: "16px 16px"
    height: "36px"
  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "12px 12px"
    height: "36px"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
    padding: "24px 24px"
  badge:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.full}"
    typography: "{typography.label}"
  sidebar-item:
    backgroundColor: "{colors.sidebar}"
    textColor: "{colors.sidebar-foreground}"
    rounded: "{rounded.md}"
---

# Design System: Transaction Manager

## Overview

**Creative North Star: "The Composed Control Deck"**

Transaction Manager is built to feel like the instrument panel a small-business owner trusts at the end of the day: calm, orderly, and quietly authoritative. Every surface is a dense but legible control deck — ruled tables, balanced columns, precise figures — where money and stock are brought under control without drama. The personality is competent rather than flashy: a bookkeeper's exactness crossed with a modern operations console.

The system commits to a **calm, confident, high-density** workspace. Restraint is the default: neutral ground, hairline borders, and color used surgically. The brand anchor is the **Midnight Indigo** accent, which deepens from violet-indigo in light mode to a deep ink blue in dark mode; it appears on primary actions and active states, and nowhere casually. Companions — **Signal Indigo** (info), **Ice Blue** (the default highlight family), green/amber/red for financial health — carry meaning without shouting.

Bilingual by design: the entire system flips cleanly between LTR (English) and RTL (Arabic) layout with mirrored margins, alignment, and rotation, because correctness in both directions is part of the product's promise. Typography is **Geist**, a clean geometric sans, with **Geist Mono** reserved for codes, references, and numeric columns where tabular discipline matters.

**Key Characteristics:**
- Dense but never cramped — high information per screen, generous row rhythm.
- Neutral, hairline-bordered surfaces; vertical depth reads through structure, not lift.
- One brand accent (Midnight Indigo) used for actions and active states only.
- Refined, quiet controls — soft radii, subtle borders, gentle hovers.
- Full LTR/RTL fidelity as a first-class requirement.
- Semantic status colors (success/warning/destructive/info) for financial and operational health.

## Colors

The palette is neutral-forward with a single deep **Midnight Indigo** anchor and a small set of semantic accents. Light mode is near-white with gray lavender-tinted neutrals; dark mode inverts to warm-gray charcoal with an ink-blue primary.

### Primary
- **Midnight Indigo** (`#2c2742` light / `#00558d` dark): the brand anchor. Used for primary buttons, active nav, selected table rows' emphasis, and focus rings. In dark mode it shifts to a deep ink blue that reads calmer on charcoal.

### Secondary
- **Midnight Indigo** (`#2c2742`): mirrors Primary in light mode; reserved for secondary fills and quieter emphasis. In dark mode Secondary becomes **Bright Azure** (`#007acc`) — an action-pop blue that lifts interactive intent on the dark background.

### Tertiary (info)
- **Signal Indigo** (`#6366f1`): the "info" accent. Used for informational icons, links that signal guidance, and the landing claim-gradient. Brighter and more electric than the primary, but kept sparing.

### Default / highlight
- **Ice Blue** family (`#c3ebfe` highlight / `#1e4974` on it in light; `#1a3150` base / `#0099cc` text in dark): the "default" selection accent for row selection, active filters, and soft highlights. Cool, clear, technical.

### Neutral
- **Paper** (`#ffffff` light / `#191919` dark): page background.
- **Pale Card** (`#f5f5f5` / `#242424`): card and sidebar surface.
- **Ink** (`#17141d` / `#fbfbfb`): primary text.
- **Fog** (`#dddddd` / `#2b2b2b`): muted fills (table row hover, disabled tracks).
- **Muted Ink** (`#606060` / `#888888`): secondary text, placeholders, captions.
- **Hairline** (`#cccccc` / `#454545`): borders and dividers.
- **Sidebar Lavender** (`#7c4dff`): the active sidebar accent in dark mode (see Navigation).

### Semantic
- **Success** (`#1d8645` / `#4ec06c` dark): paid, in-stock, healthy states.
- **Warning** (`#b56927` / `#ecd91b` dark): near-limit, attention.
- **Destructive** (`#a82b2b` / `#b33752` dark): errors, void, delete.

### Named Rules
**The Single Anchor Rule.** Midnight Indigo is reserved for primary actions and active states. It appears on any given screen only where the user must act or currently is. Neutral surfaces carry the rest; over-applying the anchor dilutes the deck's calm authority.

**The Calm Ground Rule.** Page backgrounds stay near-neutral white or charcoal. Colored panes, gradients, and glows are reserved for the landing surface and thin radial accents — never for the operating canvas.

## Typography

**Display Font:** Geist Sans (fallback: ui-sans-serif, system-ui, sans-serif)
**Body Font:** Geist Sans (same stack)
**Label/Mono Font:** Geist Mono (fallback: ui-monospace, SFMono-Regular, monospace)

**Character:** Geist is a clean, slightly geometric sans — neutral enough to vanish behind data, precise enough to feel deliberate. The pairing relies on weight and track contrast rather than decorative flourishes, fitting a control deck that must be legible in both Arabic and Latin scripts.

### Hierarchy
- **Display** (700, clamp(2.25rem→4.5rem), 1.1, -0.025em): landing hero headlines only; tightened tracking for authority.
- **Headline** (700, 1.5rem, 1.2, -0.025em): page and section titles inside the app.
- **Title** (600, 1.125rem, 1.3): card titles, entity names, table emphasis.
- **Body** (400, 0.875rem, 1.5): default operating text, data, descriptions. Comfortable line length for reading columns.
- **Label** (500, 0.75rem, 1): buttons, badges, form labels, overlines. Small and confident.

### Named Rules
**The Mono Figure Rule.** Codes, document references, SKUs, and numeric identifiers render in **Geist Mono** with tabular figures so columns align and IDs scan fast. Numbers in the ledger read as machine-clear.

**The Weight-Not-Size Rule.** Hierarchy is communicated primarily by weight (600/700 for emphasis) and only secondarily by size. The deck stays dense by resisting creeping font sizes.

## Layout

The operating canvas is a **sidebar + content** shell. A fixed left sidebar (collapsible to icons) carries module navigation; the content area holds page headers, filter bars, and data tables that scroll independently.

- **Spacing rhythm:** a 4px base scale. Control height is `36px` (h-9), compact rows at `32px` (h-8), dense icon buttons at `24px` (h-6). Cards pad at `24px` (px-6/py-6).
- **Tables:** full-width, hairline row separators, `whitespace-nowrap` cells with horizontal scroll, subtle `hover:bg-muted/50` row feedback. Dense but breathable.
- **Container behavior:** content is max-width fluid within the sidebar's inset; cards use `rounded-xl` with self-contained padding.
- **Responsive:** below `768px` the sidebar collapses to off-canvas, tables allow horizontal scroll, and page headers stack. RTL mirrors all inline margins/alignment automatically.

## Elevation & Depth

**Structured subtle shadows.** Vertical depth reads primarily through structural layering — the dark side rail against the lighter content canvas, hairline borders defining surfaces — with a light shadow vocabulary used only to lift interactive or elevated planes.

### Shadow Vocabulary
- **Input shadow** (`shadow-xs`): a subtle inset/base on inputs lending a recessed field feel.
- **Card lift** (`shadow-sm` + `border`): resting cards and floating sidebar panels.
- **Floating panel** (`shadow-sm` over a 1px `sidebar-border` ring): sheets, drawers, and the floating sidebar.

### Named Rules
**The Quiet-Lift Rule.** Shadows are never ambient at rest beyond `shadow-sm`. Deeper elevation is reserved for floating/overlay planes (drawers, sheets, dialogs), which may add a 1px ring plus a modest shadow. Surfaces at rest stay flat; hover does not inflate shadows.

## Shapes

**Soft, consistent radius.** A 10px base radius (`--radius: 0.625rem`) drives a small stepped scale: `6px` (sm), `8px` (md, controls), `10px` (lg, cards), `14px` (xl, large containers), and full round for pills.

- **Controls** (buttons, inputs, selects): `8px` rounded-md — comfortably soft, clearly rectangular.
- **Cards/containers:** `10px` rounded-xl.
- **Sidebar inset:** the content inset lifts to `12px` rounded-xl over the rail.
- **Badges, chips, avatars:** full round pills.
- **Focus states:** a **3px ring** at `ring/50` plus a border shift to `ring` — a soft, unmistakable halo that does not break the calm.

### Named Rules
**The Soft-Corner Control Rule.** Interactive controls are rounded but never pill-shaped (except badges/chips). Radius gestures at friendliness while the rectangular echo keeps the deck feeling operational.

## Components

Controls are **refined and quiet**: subtle borders, soft radii, gentle hovers, restrained fills. The data carries the voice; interaction rewards are understated but present.

### Buttons
- **Shape:** rounded-md (`8px`), height `36px` (h-9), `text-sm` label.
- **Primary:** Midnight Indigo fill with `primary-foreground` text; hover darkens to `primary/90`.
- **Outline:** paper background with a 1px border; hover fills with `accent` and darkens text.
- **Secondary / Ghost / Link:** secondary uses the Secondary fill; ghost fills with `accent` on hover; link is text-only with `hover:underline`.
- **Focus:** 3px `ring/50` + border shift to `ring`.
- **Destructive:** red fill (`#a82b2b`), white text.

### Inputs / Fields
- **Style:** transparent background (light) or `input/30` (dark), 1px `border-input`, `8px` radius, `shadow-xs` recess.
- **Focus:** border shifts to `ring` plus a 3px `ring/50` halo.
- **Error/Disabled:** `border-destructive` + `ring-destructive/20` when invalid; half-opacity when disabled. Placeholder uses `muted-foreground`.

### Cards / Containers
- **Corner Style:** `10px` rounded-xl.
- **Background:** `card` surface (Pale Card), full page on `background`.
- **Border:** 1px `border` hairline.
- **Shadow:** `shadow-sm` per the Quiet-Lift Rule.
- **Internal Padding:** `24px` on header/content/footer (px-6/py-6), with gaps of `24px`.

### Badges / Chips
- **Style:** full-round pills, `text-xs` medium, `12px` padding, `2px` vertical padding.
- **Variants:** default (Midnight Indigo fill), outline (hairline), secondary fill, destructive fill, and ghost — mapping to the button variant set. Status badges lean on the semantic colors.

### Navigation (Sidebar)
- **Style:** persistent `sidebar` background (`#f5f5f5` light / `#191919` dark) on the left (flips right in RTL), collapsible to an icon rail.
- **Items:** rounded-md; the **active** item lifts with a paper background and a 1px `sidebar-border` ring — a quiet "currently here" dock, not a filled slab.
- **Active accent:** in dark mode the active accent is **Sidebar Lavender** (`#7c4dff`), adding identity to the deck.
- **Group labels:** `text-xs` medium at `sidebar-foreground/70`.
- **Mobile:** becomes an off-canvas drawer over the content.

### The ERP List-View (signature component)
The recurring operational pattern: a compact toolbar with a recessed search field and filter icons, then a virtualized, dense table (rows `~32–36px`, hairline `border/50` separators, `whitespace-nowrap` scrollable). Row hover gives a soft `muted/50` tint; selection uses Ice Blue emphasis. This is the workhorse where owners read and act on their books daily.

## Do's and Don'ts

### Do:
- **Do** apply Midnight Indigo only to primary actions and active states; let neutral surfaces dominate (The Single Anchor Rule).
- **Do** keep controls at the `8px` radius and cards at `10px`; consistency of the corner language is the deck's composure.
- **Do** render codes, SKUs, and numeric identifiers in Geist Mono so columns align and scan fast.
- **Do** support RTL/LTR symmetry on every surface — mirrored margins, text alignment, and icon rotation are correctness, not decoration.
- **Do** use `hover:bg-muted/50` and hairline row separators in tables to keep density readable.
- **Do** respect the 3px `ring/50` focus halo — the calm, visible focus state is an accessibility commitment.

### Don't:
- **Don't** flood a screen with the primary accent; it is the anchor, not wallpaper (The Single Anchor Rule).
- **Don't** introduce cut-corner, squircle, or heavily asymmetric radii — stick to the measured sm/md/lg/xl + pill scale.
- **Don't** use ambient shadows beyond `shadow-sm` at rest; elevate only floating/overlay planes (The Quiet-Lift Rule).
- **Don't** rely on size to communicate hierarchy; use weight first and keep the density high (The Weight-Not-Size Rule).
- **Don't** break LTR/RTL symmetry — an element pinned for one direction without its mirror is a bug.
- **Don't** invent new status colors; financial health always reads through the committed success/warning/destructive/info set.
