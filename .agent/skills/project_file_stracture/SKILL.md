---
name: project_file_stracture
description: Handles everything related to the project file stracture and pettren and conventions
---

## 🚀 Core Principles

- ❌ **No Next.js Server Actions**
- ✅ Use **REST APIs (`/app/api`)** for all server communication
- ✅ Separate **UI, hooks, business logic, and utilities**
- ✅ Keep **page-specific components close to their route**
- ✅ Share logic via `@/lib`, not duplication

---

## 📁 Folder Structure Overview

```
/app
  /api
  /auth
    SignIn.tsx
    page.tsx

/components
  /ui
  Button.tsx
  ***.tsx

/hooks
  use-mobile.ts
  ***.tsx
  /data
    use-customers.ts
    ***.ts

/lib
  utils.ts
  ***.ts

/server
  auth.ts
  ***.ts
```

---

## 📦 Folder Responsibilities

### 1. `@/app/...` → Routing & Page-Level Code

- Next.js App Router (file-based routing)
- Each folder = route

#### Example:

```
/app/auth/page.tsx
/app/auth/SignIn.tsx
```

✔ Keep **page-specific components here**

> Example: Sign-in form belongs only to `/auth`, so it stays inside that route.

---

### 2. `@/app/api/...` → REST API Endpoints

- Backend endpoints (instead of server actions)
- Handles HTTP requests

#### Example:

```
/app/api/auth/login/route.ts
/app/api/users/route.ts
```

✔ Only thin controllers
✔ Delegate logic to `@/server`

---

### 3. `@/components/...` → Shared Components

- Reusable UI across the app
- Business-agnostic

#### Examples:

```
/components/Navbar.tsx
/components/UserCard.tsx
```

✔ Used in multiple pages
✔ No heavy logic

---

### 4. `@/components/ui/...` → shadcn UI Components

- Prebuilt UI primitives from shadcn

#### Examples:

```
/components/ui/button.tsx
/components/ui/dialog.tsx
```

✔ Pure UI
✔ No business logic
✔ Styled + composable

---

### 5. `@/hooks/...` → Frontend Logic Hooks

- General-purpose React hooks

#### Examples:

```
/hooks/useDebounce.ts
/hooks/useToggle.ts
```

✔ UI behavior
✔ No API calls here (unless generic)

---

### 6. `@/hooks/data/...` → API Data Hooks

- Handles fetching & mutating API data

#### Examples:

```
/hooks/data/useUser.ts
/hooks/data/usePosts.ts
```

✔ Calls REST APIs (`/app/api`)
✔ Manages loading, error, caching

> Think: your frontend data layer (React Query / SWR style)

---

### 7. `@/lib/...` → Shared Utilities

- Common logic usable on **client + server**

#### Examples:

```
/lib/fetcher.ts
/lib/formatDate.ts
/lib/validators.ts
```

✔ Pure functions
✔ No side effects
✔ No React or Node-specific APIs

---

### 8. `@/server/...` → Business Logic Layer

- Core backend logic
- Used by API routes

#### Examples:

```
/server/auth.service.ts
/server/user.service.ts
```

✔ Handles:

- Database logic
- Validation
- Complex workflows

✔ Never imported in client code

---

## 🔄 Data Flow (Important)

```
UI Component
   ↓
@/hooks/data (fetch/mutate)
   ↓
/app/api (REST endpoint)
   ↓
Database / External API
```

---

## 🧩 Example Flow

### Sign In

1. `SignIn.tsx` (inside `/app/auth`)
2. calls → `useAuth()` from `@/hooks/data`
3. calls → `/api/auth/login`
4. returns response

---

## ⚠️ Rules Recap

- ❌ No Server Actions
- ✅ REST API only
- ✅ Page-specific components stay in `/app/...`
- ✅ Shared components go to `/components`
- ✅ API logic in `/hooks/data`
- ✅ Business logic in `/app/api/...`
- ✅ Shared utilities in `/lib`
- ✅ Authentication in `/lib/auth.ts`
- ✅ Database in `/lib/database.ts`
- ✅ Environment variables in `/lib/env.ts`
- ✅ Server utilities in `/server/`

---

## 🧠 Mental Model

- **UI Layer** → `components`, `app`
- **State Layer** → `hooks`
- **Data Layer** → `hooks/data`
- **Logic Layer** → `server`
- **Utility Layer** → `lib`
- **API Layer** → `app/api`

---

## 🏁 Final Thought

If every file has a **clear responsibility**, your project becomes:

- Easier to scale
- Easier to debug
- Easier to onboard others
