# tabs

2026-11-03, post-migration fix-up (engine), verdict: fixed — wrapper's Tailwind
shorthand variants never matched the Base UI-rendered `data-orientation`
attribute, so horizontal tabs rendered as a flex row instead of stacking.

## Changed

- `components/ui/tabs.tsx`
  - Root: `data-horizontal:flex-col` → `data-[orientation=horizontal]:flex-col`.
    Tailwind 4.3 compiles the bare shorthand to `[data-horizontal]`, an
    attribute Base UI v1.9 never renders (`getStateAttributesProps` emits
    `data-orientation="horizontal"` for string state values), so the stacking
    rule never applied and TabsList/TabsContent sat side-by-side in a row.
  - `tabsListVariants`: `group-data-horizontal/tabs:*` / `group-data-vertical/tabs:*`
    → `group-data-[orientation=horizontal]/tabs:*` /
    `group-data-[orientation=vertical]/tabs:*` (h-8 pill height vs h-fit column).
  - `TabsTrigger`: same rewrite for `group-data-vertical/tabs:*` (w-full,
    justify-start) and `group-data-horizontal/tabs:after:*` /
    `group-data-vertical/tabs:after:*` (active underline indicator).
  - Leftover scan clean (`grep -n "radix-ui\|@radix-ui"` finds nothing).

## Left alone

- `app/(dashboard)/erp/reports/page.tsx` — consumer markup was correct; its
  `className` overrides (`w-full justify-start ... h-auto pb-0`) don't rely on
  the broken selectors.
- `data-orientation={orientation}` prop manually set on the base root kept as
  an explicit value identical to what Base UI renders from its `state`.
- Other components using `data-horizontal:` shorthand (compiled CSS confirms
  bare-attribute output) — intentional; not part of the tabs fix scope.

## Behavior changes

- None. Only CSS selectors changed; activation stays manual per Base UI tabs.

## Verify by hand

- Open /erp/reports: "Details / Overview / Financial" triggers are side by
  side in a line variant with an underline under the active tab, and panels
  stack BELOW the list (not next to it).
- Click each trigger — panel switches, underline moves.
- In any vertical tabs usage: triggers stack in a column with the indicator
  on the right edge.
