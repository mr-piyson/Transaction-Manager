# Project Guide: CONTINUE.md

This document serves as the central guide for understanding the architecture, workflow, and key concepts of this project. It is designed to help new and existing developers become productive quickly.

## 🚀 Project Overview

**Purpose:**
This application appears to be a comprehensive Business Management System (BMS) or an Invoicing/CRM tool. Its core functionality revolves around managing **Customers**, creating and tracking **Invoices**, managing associated **Items/Products**, and tracking **Jobs** or service work associated with these entities.

**Key Technologies Used:**
*   **Frontend Framework:** Next.js (App Router)
*   **Language:** TypeScript
*   **Styling/UI:** Tailwind CSS, shadcn/ui components (based on `components.json`)
*   **API Layer:** tRPC (for type-safe API endpoints)
*   **Database:** Prisma (for ORM and database schema management, likely connecting to PostgreSQL/MySQL given the structure).
*   **State/Context:** React Context/Providers (e.g., `Theme-Provider`, Auth Context).
*   **Internationalization (i18n):** Implemented using localized files (`i18n/locales/`).

**High-Level Architecture:**
The architecture follows a standard modern web stack pattern:
1.  **Client Side (Frontend):** Built with Next.js App Router (`app/`). Components are highly modular, utilizing shared UI primitives from `components/ui/`.
2.  **Server Side (Backend):** Handled by API routes (`app/api/`) and specialized server logic (`server/` directory, likely containing business logic wrappers or database interactions).
3.  **Data Layer:** Managed by Prisma (`prisma/schema.prisma`) and accessed via tRPC endpoints (`lib/trpc/`).

---

## 🛠️ Getting Started

### Prerequisites
*   Node.js (LTS version recommended)
*   npm or bun (The presence of `bun.lock` suggests `bun` might be the preferred package manager, but npm/yarn will likely work if dependencies are correctly installed).
*   Database credentials configured in environment variables (`.env` file, which should be added).

### Installation Instructions
1.  **Clone the repository:**
    ```bash
    git clone [repository-url]
    cd [project-directory]
    ```
2.  **Install Dependencies:**
    *Use the package manager defined by the lock file (bun).*
    ```bash
    bun install
    # OR if bun is not available:
    # npm install
    ```
3.  **Initialize Database:**
    *This step applies the schema defined in Prisma to your actual database.*
    ```bash
    bun run prisma migrate dev --name initial_setup
    # Or: npx prisma migrate dev --name initial_setup
    ```
4.  **Set Environment Variables:**
    Create a `.env` file in the root directory and populate it with your actual database connection string and secret keys (e.g., `DATABASE_URL`, `AUTH_SECRET`).

### Basic Usage Examples
*   **Viewing the Dashboard:** Navigate to the main page, likely managed by `app/page.tsx` or the setup flow (`app/setup/page.tsx`).
*   **Creating an Invoice:** Follow the guided flow: `app/app/invoices/new/` -> `app/app/invoices/new/page.tsx`.
*   **Interacting with APIs (Programmatically):** Use the tRPC client hook:
    ```tsx
    import { useApi } from "@/lib/trpc/use-api";
    // ... inside a component
    const { mutate: createCustomer } = useApi('customer.create');
    // ... call createCustomer(data)
    ```

### Running Tests
```bash
bun test
# OR
npm run test
```

---

## 📂 Project Structure Deep Dive

### Root Level
*   **`app/`**: Contains the entire Next.js App Router structure. This is where all user-facing pages and API endpoints live.
    *   `app/layout.tsx`: Root layout component.
    *   `app/page.tsx`: The main landing page.
    *   `app/setup/`: A dedicated flow for initial setup (Step 1, Step 2, Step 3).
    *   `app/app/`: Seems to hold the main application layout wrappers (`App-Header.tsx`, `App-Sidebar.tsx`) for authenticated routes.
    *   `app/api/`: Contains all the backend API routes and tRPC wrappers.
*   **`components/`**: Contains reusable, presentation-focused UI components, heavily utilizing shadcn/ui primitives.
    *   `components/ui/`: The core library of headless, styled, and reusable components (Button, Card, Dialog, etc.).
*   **`lib/`**: Contains shared, non-UI logic, helpers, and service definitions.
    *   `lib/db.ts`: Database connection initialization.
    *   `lib/trpc/`: Contains the tRPC client/server setup, enabling type-safe backend communication.
    *   `lib/utils.ts`: General utility functions.
*   **`server/`**: Appears to hold server-side business logic handlers, possibly wrapping database operations or implementing complex workflows for specific entities (Invoices, Customers, etc.).
*   **`prisma/`**: Contains the database schema definition (`schema.prisma`) and configuration.

### Key Directories
*   **`app/app/invoices/new/`**: Contains the entire sequence of components and logic for creating a new invoice, indicating a complex, multi-step form workflow.
*   **`app/app/customers/[customerId]/`**: Suggests an entity detail page pattern, where the `[customerId]` segment is used to fetch and display data for a specific customer.
*   **`i18n/`**: Handles all internationalization concerns, supporting multiple locales (e.g., `ar.ts`, `en.ts`).

---

## 💻 Development Workflow

### Coding Standards & Conventions
*   **TypeScript First:** All critical files should utilize TypeScript for type safety.
*   **Component Reusability:** Prefer creating components in `components/ui/` for generic, low-level elements, and use application-specific wrappers in `components/` for composite views.
*   **Data Fetching:** All data access MUST flow through **tRPC** endpoints (`lib/trpc/`) to guarantee type safety between the client and server.

### Testing Approach
*   **Unit/Integration Testing:** Use Vitest/Jest (implied by the structure) to test utility functions (`lib/`) and isolated components.
*   **Workflow Testing:** Complex flows (like invoice creation) should be tested as integration tests simulating the entire user journey.

### Build and Deployment Process
1.  **Development:** `bun run dev` (or `npm run dev`) starts the local development server.
2.  **Production Build:** `bun run build` generates optimized static assets and server bundles for deployment.
3.  **Database Migration:** Always run `prisma migrate dev` or `prisma generate` before deploying to ensure the backend matches the required schema.

### Contribution Guidelines
1.  Adhere strictly to the established components naming conventions.
2.  When adding new features, first define the data structure/API contract in the relevant **tRPC** service layer.
3.  Create the necessary UI components, consuming the new contract.

---

## 🧠 Key Concepts

*   **tRPC:** A framework layer that allows calling backend functions directly from the frontend with compile-time type checking, eliminating the need to manually write OpenAPI/Swagger specifications.
*   **RSC (React Server Components):** Components rendered entirely on the server, optimized for data fetching without client-side overhead.
*   **State Management:** Global state (like Theme or Auth status) is managed using React Context Providers located in `components/`.
*   **Entity Ownership:** Core entities (Customer, Invoice, Job) are responsible for their own lifecycle and are managed by dedicated API logic (e.g., `server/invoices.ts`).

---

## 🧩 Common Tasks

**Task: Displaying a List of Customers**
1.  **API:** Call the appropriate tRPC query (e.g., `customer.listAllItems()`).
2.  **Component:** Use `<components/list-view.tsx>` to render the data.
3.  **Details:** For each item, link to the detail page structure: `/app/app/customers/[customerId]/`.

**Task: Implementing a New Global Component (e.g., Status Badge)**
1.  Create the component file: `components/ui/status-badge.tsx`.
2.  Apply styling using Tailwind classes and ensure it accepts props for text and color.
3.  Import it and use it across the application.

**Task: Handling Multi-Locale Content**
1.  Update the locale configuration in `i18n/config.ts`.
2.  Translate required keys in the appropriate locale file (e.g., `i18n/locales/de.ts`).
3.  Ensure the relevant component wrapper (e.g., in `app/layout.tsx`) correctly consumes the i18n hook (`use-i18n.tsx`).

---

## 🐞 Troubleshooting

*   **Error: `Cannot find type '{...'` when calling a function:**
    *   **Cause:** The client code is out of sync with the server-side tRPC definition.
    *   **Solution:** Run `bun run prisma generate` or restart the development server to ensure tRPC client code is re-generated.
*   **Error: Database Connection Failed:**
    *   **Cause:** Incorrect `DATABASE_URL` or database service is down.
    *   **Solution:** Verify the `.env` file, check external DB credentials, and ensure the database service is running.
*   **UI Style Issues:**
    *   **Cause:** Missing global styles or incorrect `components.json` configuration.
    *   **Solution:** Check `app/globals.css` and ensure your Tailwind setup references it correctly.

---

## 📚 References

*   **shadcn/ui Documentation:** [https://ui.shadcn.com/](https://ui.shadcn.com/) (Reference for component implementation details)
*   **tRPC Documentation:** (Reference for advanced type-safe API usage)
*   **Prisma Documentation:** (Reference for schema design and migrations)

---