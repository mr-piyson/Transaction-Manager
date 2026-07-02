# Enterprise Sidebar Implementation Concept

A reusable sidebar design pattern for any shadcn UI project. This document captures the architecture, behavior, and component mapping so an AI can reproduce this sidebar in any context.

---

## 1. Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│ SIDEBAR (fixed, left)           │ MAIN CONTENT (flex: 1)   │
│                                 │                          │
│  ┌───────────────────────────┐  │  ┌──────────────────┐    │
│  │ Brand + Collapse Toggle   │  │  │ Topbar (sticky)  │    │
│  ├───────────────────────────┤  │  │  breadcrumb      │    │
│  │ App Switcher (dropdown)   │  │  │  actions         │    │
│  ├───────────────────────────┤  │  ├──────────────────┤    │
│  │ Search (⌘K shortcut)     │  │  │                  │    │
│  ├───────────────────────────┤  │  │  Content Area    │    │
│  │ Nav Sections (scrollable) │  │  │                  │    │
│  │   ├─ Section Header       │  │  │                  │    │
│  │   ├─ Nav Items            │  │  │                  │    │
│  │   └─ Submenus (nested)    │  │  │                  │    │
│  ├───────────────────────────┤  │  │                  │    │
│  │ Footer                    │  │  └──────────────────┘    │
│  │   ├─ Theme Toggle         │  │                          │
│  │   └─ User Profile         │  │                          │
│  └───────────────────────────┘  │                          │
└─────────────────────────────────┴──────────────────────────┘
```

### Key Layout Rules

- **Sidebar**: `position: fixed`, `width: 260px` expanded / `72px` collapsed, `height: 100vh`, `flex-direction: column`
- **Main Content**: `margin-left: 260px` (adjusted dynamically on collapse), `flex: 1`
- **Mobile (< 768px)**: sidebar off-screen via `transform: translateX(-100%)`, slides in with `mobile-open` class, overlay backdrop

---

## 2. Component Inventory

| Zone | Purpose | shadcn Component |
|------|---------|-----------------|
| Brand | Logo + app name + collapse button | Custom (Button + Avatar) |
| App Switcher | Dropdown to switch between apps/modules | `DropdownMenu` |
| Search | Filter nav items by name | `Input` with icon |
| Nav Section | Collapsible group of nav items | Custom (no direct shadcn match) |
| Nav Link | Clickable menu item with icon, label, badge | `Button` (ghost variant) |
| Submenu | Nested nav items under a parent | Custom, animated expand |
| Theme Toggle | Dark/light mode switch | `Button` (ghost variant) |
| User Profile | Avatar, name, role, menu trigger | `DropdownMenu` + `Avatar` |
| Overlay | Mobile backdrop when sidebar open | Custom div |
| Topbar | Breadcrumb, notification bell, help | `Breadcrumb` + `Button` + `Badge` |

---

## 3. State Management

```typescript
interface SidebarState {
  // Sidebar
  isCollapsed: boolean       // persisted to localStorage
  currentApp: string         // active app key
  
  // UI
  openSubmenus: Set<string>  // IDs of expanded submenus
  searchQuery: string        // current filter text
  isDropdownOpen: boolean    // app switcher dropdown
  
  // Theme
  theme: 'light' | 'dark'   // persisted to localStorage
}
```

### Persistence

- `sidebar-collapsed` → `localStorage`
- `theme` → `localStorage` (fallback: `prefers-color-scheme` media query)

---

## 4. Navigation Data Model

Each app has its own navigation tree. Structure:

```typescript
interface NavItem {
  id: string
  icon: string              // FontAwesome class (or Lucide icon name for shadcn)
  label: string
  badge?: string            // optional count or text
  badgeClass?: 'warning' | 'danger'  // optional badge color
  active?: boolean          // initial active state
  children?: NavItem[]      // nested submenu items
}

interface NavSection {
  title: string
  items: NavItem[]
}

interface AppNav {
  name: string
  label: string
  sections: NavSection[]
}
```

---

## 5. CSS Architecture

### Design Tokens (CSS Custom Properties)

```css
:root {
  /* Dimensions */
  --sidebar-width: 260px;
  --sidebar-collapsed-width: 72px;
  --sidebar-transition: 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  --topbar-height: 60px;

  /* Typography */
  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-size-xs: 0.6875rem;
  --font-size-sm: 0.75rem;
  --font-size-base: 0.8125rem;
  --font-size-md: 0.875rem;

  /* Border Radius */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-full: 9999px;

  /* Z-index Layers */
  --z-sidebar: 100;
  --z-overlay: 90;
  --z-dropdown: 110;
  --z-tooltip: 120;

  /* Accent */
  --accent: #6366f1;
  --accent-light: #818cf8;
  --accent-dark: #4f46e5;
  --accent-bg: rgba(99, 102, 241, 0.08);
}
```

### Theme Variables

```css
[data-theme="light"] {
  --bg-primary: #ffffff;
  --bg-secondary: #f8f9fc;
  --bg-hover: #f0f1f5;
  --bg-active: var(--accent-bg);
  --border-color: #e5e7eb;
  --text-primary: #111827;
  --text-secondary: #6b7280;
  --text-tertiary: #9ca3af;
  --text-active: var(--accent);
  --input-bg: #f3f4f6;
}

[data-theme="dark"] {
  --bg-primary: #0f1117;
  --bg-secondary: #161822;
  --bg-hover: #232636;
  --bg-active: rgba(99, 102, 241, 0.15);
  --border-color: #2a2d3e;
  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
  --text-tertiary: #64748b;
  --text-active: var(--accent-light);
  --input-bg: #1c1f2e;
}
```

---

## 6. Key Behaviors

### 6.1 Sidebar Collapse/Expand

- Toggle button in the brand area (chevron icon: `fa-angles-left` ↔ `fa-angles-right`)
- Collapsed width: `72px` (icon-only, no text)
- Expanded width: `260px` (icon + text + badges)
- All text elements hide via `opacity: 0; width: 0; overflow: hidden` in collapsed state
- Main content margin-left transitions smoothly via CSS variable
- Collapsed state persists to localStorage

**Collapsed state CSS pattern:**
```css
.sidebar.collapsed .brand-text,
.sidebar.collapsed .nav-link-text,
.sidebar.collapsed .nav-badge,
.sidebar.collapsed .nav-link-arrow {
  opacity: 0;
  width: 0;
  overflow: hidden;
}

.sidebar.collapsed .nav-link {
  justify-content: center;
  padding: 10px;
}
```

### 6.2 Collapsed Tooltips

When collapsed, hovering a nav item shows a tooltip to the right:
```css
.sidebar.collapsed .nav-link::after {
  content: attr(data-tooltip);
  position: absolute;
  left: calc(100% + 8px);
  top: 50%;
  transform: translateY(-50%);
  background: var(--text-primary);
  color: var(--bg-primary);
  padding: 5px 10px;
  border-radius: var(--radius-sm);
  /* show/hide with opacity */
}
```

### 6.3 App Switcher Dropdown

- Click triggers a dropdown below the current app display
- Dropdown contains a list of available apps with icons, names, descriptions
- Active app shows a checkmark
- Selecting a new app:
  1. Updates `currentApp` state
  2. Clears open submenus
  3. Re-renders the nav tree for the new app
  4. Updates the switcher display, breadcrumb, and welcome card
  5. Closes the dropdown

**shadcn mapping:** Use `DropdownMenu` with custom trigger content (icon + text + chevron).

### 6.4 Search / Filter

- Input field with search icon (left) and `⌘K` shortcut badge (right)
- Filters nav items in real-time by text match
- Matching items stay visible; non-matching items get `display: none`
- If a child matches, all siblings in the same section become visible
- Section headers hide when no children are visible
- Keyboard shortcut: `Cmd/Ctrl + K` focuses search and auto-expands sidebar
- `Escape` clears search and blurs input

### 6.5 Nested Submenus

- Parent items with `children[]` get a right-arrow chevron
- Click toggles the submenu open/closed
- Submenu animates via `max-height` transition (0 → 500px)
- Submenu items have smaller font, no active indicator bar
- Open submenu IDs tracked in a `Set<string>`

### 6.6 Active Nav Item

- Active link gets: `background: var(--bg-active)`, `color: var(--text-active)`, `font-weight: 600`
- Active indicator: a 3px tall colored bar on the left edge, positioned with `::before` pseudo-element
- Only one item active at a time; clicking a new item removes active from all others

### 6.7 Mobile Behavior (< 768px)

- Sidebar starts off-screen (`transform: translateX(-100%)`)
- Hamburger button in topbar opens sidebar + shows overlay backdrop
- Overlay click or Escape key closes sidebar
- On mobile, collapsed state is ignored — always show full text
- Sidebar takes full width on very small screens (< 480px)

### 6.8 Theme Toggle

- Button in footer toggles `data-theme` attribute on `<html>`
- Icon changes: `fa-moon` (light) ↔ `fa-sun` (dark)
- Label changes: "Dark Mode" ↔ "Light Mode"
- Persisted to localStorage; respects `prefers-color-scheme` on first visit

---

## 7. shadcn UI Component Mapping

### Primitives

| This Implementation | shadcn/ui Component | Notes |
|---------------------|-------------------|-------|
| Sidebar container | Custom layout | shadcn has `<Sidebar>` component now — use it as base |
| App Switcher | `<DropdownMenu>` | Custom trigger with icon + text |
| Search input | `<Input>` | Add leading icon via slot or wrapper div |
| Nav links | `<Button variant="ghost">` | Full-width, left-aligned icon + text |
| Nav badges | `<Badge>` | Inline, small variant |
| Theme toggle | `<Button variant="ghost">` | With icon |
| User profile | `<DropdownMenu>` + `<Avatar>` | Trigger shows avatar + name |
| Topbar breadcrumb | `<Breadcrumb>` | Custom separator |
| Notification bell | `<Button variant="ghost">` + `<Badge>` | Badge positioned absolute |
| Overlay | Custom div | Semi-transparent, backdrop-filter blur |

### shadcn Sidebar Component

If using the newer shadcn `<Sidebar>` component, the structure maps to:

```tsx
<Sidebar>
  <SidebarHeader>
    {/* Brand + App Switcher */}
  </SidebarHeader>
  <SidebarContent>
    {/* Search */}
    <SidebarSearch />
    {/* Nav */}
    <SidebarNav>
      <SidebarSection title="Overview">
        <SidebarItem icon={<LayoutDashboard />} label="Dashboard" />
        <SidebarItem icon={<BarChart3 />} label="Analytics" badge="New" />
      </SidebarSection>
    </SidebarNav>
  </SidebarContent>
  <SidebarFooter>
    {/* Theme Toggle + User Profile */}
  </SidebarFooter>
</Sidebar>
```

---

## 8. Accessibility Checklist

- Sidebar has `role="navigation"` and `aria-label="Main Navigation"`
- App switcher button has `aria-haspopup="listbox"` and `aria-expanded`
- Search input has `aria-label="Search navigation"`
- Menu buttons have `aria-label` attributes
- Keyboard support:
  - `Enter`/`Space` on app switcher toggles dropdown
  - `Escape` closes dropdown, clears search, closes mobile sidebar
  - `Tab` moves through interactive elements
  - `Cmd/Ctrl + K` focuses search
- Focus-visible outline on all interactive elements (`2px solid var(--accent)`)
- Overlay closes on Escape key

---

## 9. Animation Specs

| Element | Animation | Duration | Easing |
|---------|-----------|----------|--------|
| Sidebar collapse/expand | Width transition | 0.25s | cubic-bezier(0.4, 0, 0.2, 1) |
| Nav items fade in | `fadeIn` (opacity + translateY) | 0.15s | ease |
| Submenu expand/collapse | `max-height` | 0.25s | cubic-bezier(0.4, 0, 0.2, 1) |
| Dropdown open/close | opacity + translateY + scale | 0.2s | cubic-bezier(0.16, 1, 0.3, 1) |
| Tooltip show | opacity | 0.15s | ease |
| Theme transition | All color vars | 0.25s | cubic-bezier(0.4, 0, 0.2, 1) |

**Stagger animation for nav items:**
```css
.nav-item { animation: fadeIn 0.15s ease both; }
.nav-section:nth-child(1) .nav-item { animation-delay: 0.02s; }
.nav-section:nth-child(2) .nav-item { animation-delay: 0.05s; }
.nav-section:nth-child(3) .nav-item { animation-delay: 0.08s; }
```

---

## 10. Implementation Checklist for Any Project

### Step 1: Install Dependencies
```bash
npx shadcn-ui@latest add sidebar
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add input
npx shadcn-ui@latest add button
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add avatar
npx shadcn-ui@latest add breadcrumb
npx shadcn-ui@latest add separator
```

### Step 2: Set Up Theme Tokens
Create CSS custom properties for dimensions, colors, and z-index layers. Map shadcn's `--primary`, `--secondary`, `--muted`, etc. to match this pattern's light/dark themes.

### Step 3: Build Sidebar Layout
Use shadcn's `<Sidebar>` or custom flex layout with `position: fixed` on the sidebar and `margin-left` on the main content.

### Step 4: Implement App Switcher
Build with `<DropdownMenu>`. Each app option has: icon (colored square), name, description, and active checkmark.

### Step 5: Build Navigation Tree
Create the `NAV_DATA` object with sections → items → optional children. Render dynamically with React state.

### Step 6: Add Search Filtering
Implement text-based filter that hides non-matching `.nav-item` elements and collapses empty sections.

### Step 7: Implement Collapse Toggle
Toggle a CSS class that sets sidebar width to `72px`, hides all text, centers icons, and shows tooltips on hover.

### Step 8: Add Mobile Responsive
Media query at `768px`: sidebar off-screen, hamburger button visible, overlay pattern.

### Step 9: Add Theme Toggle
Toggle `data-theme` attribute on root, persist to localStorage, respect system preference.

### Step 10: Add Keyboard Shortcuts
`Cmd/Ctrl + K` for search, `Escape` for dismiss, keyboard navigation for dropdown.

---

## 11. Common Pitfalls to Avoid

1. **Don't forget `overflow: hidden` on the sidebar** — prevents text from showing when collapsed
2. **Use `opacity: 0` + `width: 0` instead of `display: none`** — allows smooth CSS transitions
3. **Collapse state must persist** — users expect their preference to survive page reload
4. **Mobile sidebar must block body scroll** — set `overflow: hidden` on body when open
5. **Tooltips in collapsed mode need `z-index` higher than sidebar** — use `--z-tooltip: 120`
6. **App switcher dropdown must be positioned absolutely** — not inside the sidebar flow
7. **Submenu animation uses `max-height`, not `height`** — allows variable content height
8. **Theme transition needs to apply to ALL elements** — use CSS transition on background/color properties
9. **Search must expand sidebar on Cmd+K** — collapsed state blocks the search input
10. **Print styles must hide sidebar** — `@media print { .sidebar { display: none !important; } }`

---

## 12. Tailwind CSS Mapping

If using Tailwind (standard with shadcn), the key classes map to:

```html
<!-- Sidebar -->
<aside class="fixed top-0 left-0 z-[100] h-screen bg-background border-r 
     transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
     data-collapsed="false">

  <!-- Brand -->
  <div class="flex items-center gap-3 px-4 py-4">
    <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 
         flex items-center justify-center text-white">
      <Icon />
    </div>
    <span class="text-sm font-bold whitespace-nowrap transition-opacity">
      AppName
    </span>
  </div>

  <!-- Nav Link -->
  <a class="flex items-center gap-2.5 px-3 py-2 mx-2 rounded-lg text-sm font-medium
       text-muted-foreground hover:bg-muted hover:text-foreground
       data-[active=true]:bg-primary/10 data-[active=true]:text-primary 
       data-[active=true]:font-semibold data-[active=true]:border-l-2 
       data-[active=true]:border-l-primary data-[active=true]:-ml-px">
    <Icon class="w-4 h-4 shrink-0" />
    <span class="truncate">Label</span>
    <Badge class="ml-auto" />
  </a>

  <!-- Submenu -->
  <div class="overflow-hidden max-h-0 transition-[max-height] duration-300 pl-5"
       data-open="false">
    <a class="...">Sub Item</a>
  </div>

  <!-- Collapsed tooltip -->
  <!-- Pseudo-element via group-hover + absolute positioning -->
</aside>

<!-- Main Content -->
<main class="ml-[260px] transition-[margin-left] duration-300">
  <!-- Topbar -->
  <header class="sticky top-0 z-50 h-[60px] border-b bg-background">
    <!-- breadcrumb + actions -->
  </header>
  <!-- Content -->
</main>
```

---

## 13. File Structure (Recommended for React/shadcn)

```
src/
├── components/
│   └── sidebar/
│       ├── index.tsx              # Main sidebar component
│       ├── SidebarBrand.tsx       # Logo + collapse toggle
│       ├── AppSwitcher.tsx        # Dropdown app selector
│       ├── SidebarSearch.tsx      # Search input
│       ├── SidebarNav.tsx         # Nav tree renderer
│       ├── NavSection.tsx         # Collapsible section
│       ├── NavItem.tsx            # Single nav link + submenu
│       ├── SidebarFooter.tsx      # Theme toggle + user profile
│       └── types.ts               # NavItem, NavSection, AppNav types
├── hooks/
│   ├── use-sidebar.ts             # Collapse/expand state + localStorage
│   ├── use-theme.ts               # Dark/light theme + localStorage
│   └── use-nav-filter.ts          # Search filtering logic
├── data/
│   └── nav-data.ts                # NAV_DATA object per app
└── styles/
    └── sidebar.css                # Custom properties + animations (if not using Tailwind)
```
