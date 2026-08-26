# Graph Report - .  (2026-08-26)

## Corpus Check
- 435 files · ~218,526 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2335 nodes · 6615 edges · 165 communities (96 shown, 69 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.68)
- Token cost: 3,200 input · 2,100 output

## Community Hubs (Navigation)
- Dialog Forms & Core UI
- Utility UI Components
- Cards, Tables & Auth Screens
- Inputs, Selects & Invoice Form
- ERP Dialogs Provider
- Server CRUD Services
- Auth & Permissions (tRPC)
- Reset Flow & Field UI
- File Upload Pipeline
- Sidebar & Tree Navigation
- DB, Env & tRPC Bootstrap
- Cron Jobs & Background Sync
- Auth Pages & Branding
- Context Menus & Stock UI
- Package Config Metadata
- Journal Posting Service
- Prisma Seed & Permissions
- Income & Expense Pages
- Money Math Utilities
- Drawer Component Family
- Reports Dashboard & Charts
- Sidebar UI Primitive
- Shared Validation Schemas
- TypeScript Config References
- Bulk Item Import Wizard
- Hard Delete Dialog
- Sheet UI & Settings Shell
- i18n & Command Actions
- Invoice Numbering & Totals
- Unified Item Schema & Form
- App Header & Module Layouts
- Command Palette & App Registry
- App Error Hierarchy
- PDF Print & Download
- Items Pages & Scroll Area
- Date Formatting Library
- ERP Dashboard Home
- Setup Flow & Auth Client
- Landing Page Sections
- Carousel UI Primitive
- shadcn Registry Config
- Popover & Notification Bell
- OTP Input & Date Segments
- Docs & Tech-Stack Concepts
- Menubar UI Primitive
- Stock Routers
- Entity Detail Pages & Hooks
- Exchange Rate Sync
- Runtime Dependency Set
- Root Layout & Providers
- Clipboard Service
- Avatar & Contact List Rows
- Unified Item Dialog
- Item UI Primitive
- Invoices & Quotations Pages
- Warehouse Form Dialog
- Attachment UI Primitive
- Chart UI Wrapper
- Form UI Primitive
- Rich Text Editor & Toggles
- Biome Parser & Formatter Config
- Biome Lint Rules
- Storage Path Fix Script
- Contract List & Status Badges
- Invoice History Timeline
- Import Preview & Sample Data
- Deploy Script Helpers
- Biome A11y Rules
- Biome File Scope Config
- Date Input Parsing & Defaults
- Suppliers Pages & Forms
- Bubble UI Primitive
- Stock Movements Page
- Biome Suspicious Rules
- Item Form Schema & Page
- Contracts Pages & Form
- Warehouses Pages & Form
- Biome Assist & Import Sorting
- Calendar UI Primitive
- Marker UI Primitive
- Role Migration Script
- Biome Formatter Options
- Biome VCS Options
- Item Image Upload Tab
- Client Upload Helper
- next-intl Type Definitions
- Currency Seed Script
- Expense Form Defaults
- Income Form Defaults
- Report Layout Shell
- Warehouse List Item
- Dependency: AG Grid React
- Global CSS Types
- Dependency: Base UI React
- Dependency: bcryptjs
- Dependency: better-auth
- Dependency: better-auth/core
- Dependency: CASL Ability
- Dependency: class-variance-authority
- Dependency: cmdk
- ListView Search Helpers
- Dependency: dom-to-image-more
- Dependency: Embla Carousel
- Dependency: file-type
- Dependency: Framer Motion
- Dependency: Fuse.js
- Dependency: Headless Tree Core
- Dependency: Headless Tree React
- Dependency: Hookform Resolvers
- Dependency: input-otp
- Dependency: lucide-react
- Dependency: Next.js
- Next.js Config
- Dependency: next-intl
- Dependency: next-themes
- Dependency: nuqs
- Dependency: cuid2
- Dependency: pdf-lib
- Dependency: Prisma libsql Adapter
- Dependency: Prisma pg Adapter
- Dependency: Radix UI
- Dependency: react-barcode
- Dependency: React Day Picker
- Dependency: React DOM
- Dependency: React Hook Form
- Dependency: react-is
- Dependency: Resizable Panels
- Dependency: Recharts
- Dependency: shadcn/react
- Dependency: sharp
- Dependency: sonner
- Dependency: superjson
- Dependency: tailwind-merge
- Dependency: Tailwind Typography
- Dependency: TanStack Form
- Dependency: TanStack Table
- Dependency: TanStack Virtual
- Dependency: TanStack Zod Adapter
- Dependency: TipTap Placeholder
- Dependency: TipTap Text Align
- Dependency: TipTap Underline
- Dependency: TipTap PM
- Dependency: TipTap React
- Dependency: TipTap Starter Kit
- Dependency: tRPC Client
- Dependency: TRPC React Query
- Dependency: tRPC Server
- Dependency: tRPC TanStack Query
- Dependency: tw-animate-css
- Dependency: zod
- PostCSS Config
- Dark Banner Asset
- Light Banner Asset
- useSession Hook
- Date Range Util
- Dates-Ago Util

## God Nodes (most connected - your core abstractions)
1. `cn()` - 505 edges
2. `Button()` - 117 edges
3. `react` - 95 edges
4. `trpc` - 78 edges
5. `Badge()` - 54 edges
6. `useDateFormat()` - 51 edges
7. `Input()` - 45 edges
8. `useHardDeleteForm()` - 41 edges
9. `writeAuditLog()` - 38 edges
10. `Label()` - 37 edges

## Surprising Connections (you probably didn't know these)
- `AppSidebar()` --indirect_call--> `handler()`  [INFERRED]
  components/layout/App-Sidebar.tsx → app/api/trpc/[trpc]/route.ts
- `MenuIcon()` --calls--> `cn()`  [EXTRACTED]
  components/context-menu.tsx → lib/utils.ts
- `HardDeleteBody()` --references--> `react`  [EXTRACTED]
  components/dialogs/hardDeleteForm.tsx → package.json
- `features` --calls--> `cn()`  [EXTRACTED]
  components/landing/features.tsx → lib/utils.ts
- `AppSwitcher()` --calls--> `cn()`  [EXTRACTED]
  components/layout/App-Sidebar.tsx → lib/utils.ts

## Import Cycles
- 3-file cycle: `components/dialogs/index.tsx -> components/dialogs/item-dialog/index.tsx -> components/dialogs/item-dialog/suppliers-tab.tsx -> components/dialogs/index.tsx`

## Hyperedges (group relationships)
- **Transaction Manager Technology Stack** — readme_transactionmanager, readme_nextjs, readme_typescript, readme_react, readme_prisma, readme_tailwind, readme_shadcn, readme_jwt, readme_i18n [EXTRACTED 1.00]
- **Stale PostgreSQL Lock Diagnosis and Recovery Flow** — docs_fix_postgres_brew_service_postgresql_18, docs_fix_postgres_brew_service_brew_services, docs_fix_postgres_brew_service_service_error_state, docs_fix_postgres_brew_service_stale_postmaster_pid, docs_fix_postgres_brew_service_macos_pid_reuse, docs_fix_postgres_brew_service_recovery_procedure [EXTRACTED 1.00]
- **Select/Overlay Lifecycle Bugs In Forms** — docs_todos_drawer_select_dropdown_not_closing, docs_todos_mobile_supplier_select_closes_po_form, readme_shadcn [INFERRED 0.75]

## Communities (165 total, 69 thin omitted)

### Community 0 - "Dialog Forms & Core UI"
Cohesion: 0.03
Nodes (102): ContractFormContext, ContractFormContextValue, ContractFormDialogProps, DialogState, OpenOptions, schema, ValidationAlertProps, CustomerFormContext (+94 more)

### Community 1 - "Utility UI Components"
Cohesion: 0.03
Nodes (80): AccordionContent(), AccordionItem(), AccordionTrigger(), BreadcrumbEllipsis(), BreadcrumbItem(), BreadcrumbLink(), BreadcrumbList(), BreadcrumbPage() (+72 more)

### Community 2 - "Cards, Tables & Auth Screens"
Cohesion: 0.10
Nodes (39): alert, ContractDetail(), ContractDetailProps, DetailPageHeader(), ItemDetailsSheetProps, TYPE_STYLES, Badge(), badgeVariants (+31 more)

### Community 3 - "Inputs, Selects & Invoice Form"
Cohesion: 0.07
Nodes (43): DialogState, ExchangeRateDialogProps, ExchangeRateFormContext, ExchangeRateFormContextValue, ExchangeRateFormValues, OpenOptions, RateData, DialogState (+35 more)

### Community 4 - "ERP Dialogs Provider"
Cohesion: 0.05
Nodes (58): ContractFormDialog(), ContractFormProvider(), ContractFormValues, defaults(), CustomerFormDialog(), CustomerFormProvider(), CustomerFormValues, defaults() (+50 more)

### Community 5 - "Server CRUD Services"
Cohesion: 0.06
Nodes (46): contractBaseSchema, contractsRouter, listContractsSchema, updateContractSchema, getHardDeleteInfo(), hardDeleteContractTree(), HardDeleteInfo, TransactionClient (+38 more)

### Community 6 - "Auth & Permissions (tRPC)"
Cohesion: 0.07
Nodes (41): Action, NotFoundError, AppActions, AppSubjects, assertCan(), hasOrg, isAuthed, loggerMiddleware (+33 more)

### Community 7 - "Reset Flow & Field UI"
Cohesion: 0.08
Nodes (21): DetailPageHeaderProps, ReportAsOfFilterProps, ReportDateFilterProps, Button(), Field(), fieldVariants, Label(), Switch() (+13 more)

### Community 8 - "File Upload Pipeline"
Cohesion: 0.06
Nodes (30): GET(), DELETE(), POST(), CreateAttachmentInput, deleteAttachment(), deleteByEntity(), countAttachmentsForFile(), deleteFileIfOrphaned() (+22 more)

### Community 9 - "Sidebar & Tree Navigation"
Cohesion: 0.06
Nodes (45): AppSidebar(), AppSidebarProps, AppSwitcher(), buildSidebarItems(), SidebarToggleButton(), TreeItemData, DashboardShell(), DashboardShellProps (+37 more)

### Community 10 - "DB, Env & tRPC Bootstrap"
Cohesion: 0.07
Nodes (30): adaptUrl(), GET(), POST(), handler(), AuthLayout(), DashboardLayout(), auth, getCurrentUser() (+22 more)

### Community 11 - "Cron Jobs & Background Sync"
Cohesion: 0.07
Nodes (38): createNotification(), NOTIFICATION_SETTINGS_KEYS, NOTIFICATION_TYPES, NotificationCreateInput, listPurchaseOrdersSchema, purchaseLineInputSchema, purchaseOrderBaseSchema, purchaseOrdersRouter (+30 more)

### Community 12 - "Auth Pages & Branding"
Cohesion: 0.07
Nodes (28): AlertController, AlertProvider(), AlertVariant, ConfirmOptions, QueueItem, navLinks, Logo(), SplashScreen() (+20 more)

### Community 13 - "Context Menus & Stock UI"
Cohesion: 0.08
Nodes (33): BaseMenuItem, ContextMenuActionItem, ContextMenuLabelItem, ContextMenuSeparatorItem, ContextMenuSwitchItem, DesktopMenuItems, DrawerLevel, MenuIcon() (+25 more)

### Community 14 - "Package Config Metadata"
Cohesion: 0.05
Nodes (42): @biomejs/biome, knip, devDependencies, @biomejs/biome, knip, prisma, tailwindcss, @tailwindcss/postcss (+34 more)

### Community 15 - "Journal Posting Service"
Cohesion: 0.09
Nodes (37): generateSerial(), PAYMENT_METHODS, ACCOUNTS, postAdjustment(), PostAdjustmentOptions, postCreditNoteSent(), postExpense(), PostExpenseOptions (+29 more)

### Community 16 - "Prisma Seed & Permissions"
Cohesion: 0.08
Nodes (32): register(), isAutoGrantable(), NON_AUTO_GRANT_PREFIXES, PermissionCode, PermissionDefinition, PERMISSIONS, IMPORTANT: codes MUST match what routers pass to assertCan(), e.g., @prisma/client (+24 more)

### Community 17 - "Income & Expense Pages"
Cohesion: 0.11
Nodes (30): ContractListItem(), useExpenseForm(), useIncomeForm(), MoneyEntryFilterBar(), ExpenseListItem(), ExpenseListItemProps, InvoiceListItem(), POListItem() (+22 more)

### Community 18 - "Money Math Utilities"
Cohesion: 0.07
Nodes (25): Button, ButtonProps, buttonVariants, InvoiceListItemProps, STATUS_COLORS, POListItemProps, STATUS_COLORS, cycleLabels (+17 more)

### Community 19 - "Drawer Component Family"
Cohesion: 0.10
Nodes (28): ActiveFiltersSummary(), ClearButton(), DocumentFilterTrigger(), DrawerBody(), NamespacedMessageKeys, PAYMENT_STATUS_FILTERS, STATUS_FILTERS, useDocumentFilters() (+20 more)

### Community 20 - "Reports Dashboard & Charts"
Cohesion: 0.13
Nodes (19): ReportAsOfFilter(), ReportDateFilter(), KpiVariant, ReportKpiCard(), ReportKpiCardProps, variantStyles, ReportLayout(), ReportCsvExportButton() (+11 more)

### Community 21 - "Sidebar UI Primitive"
Cohesion: 0.08
Nodes (31): Sidebar(), SidebarContent(), SidebarContext, SidebarContextProps, SidebarFooter(), SidebarGroup(), SidebarGroupAction(), SidebarGroupContent() (+23 more)

### Community 22 - "Shared Validation Schemas"
Cohesion: 0.07
Nodes (28): currencyCodeSchema, dateRangeSchema, exchangeRateInputSchema, paymentMethodSchema, SIGNUP_SCHEMA, SortOrder, sortOrderSchema, syncSettingsSchema (+20 more)

### Community 23 - "TypeScript Config References"
Cohesion: 0.06
Nodes (32): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, Subscription-dev (+24 more)

### Community 24 - "Bulk Item Import Wizard"
Cohesion: 0.12
Nodes (23): downloadCsvTemplate(), FileUploadStep(), FileUploadStepProps, TEMPLATE_COLUMNS, TEMPLATE_ROW, ImageUploadStep(), ImageUploadStepProps, PreviewStepProps (+15 more)

### Community 25 - "Hard Delete Dialog"
Cohesion: 0.06
Nodes (30): BodyProps, CONTRACT_ROWS, CUSTOMER_ROWS, DeleteHookLike, DeleteMutationLike, DialogState, EXPENSE_ROWS, HardDeleteBody() (+22 more)

### Community 26 - "Sheet UI & Settings Shell"
Cohesion: 0.11
Nodes (21): DEFAULT_ITEM_FILTERS, ItemFilterSheet(), ItemFilterSheetProps, ItemFilterValues, SidebarGroup(), SidebarGroupLabel(), SidebarMenu(), SidebarMenuItem() (+13 more)

### Community 27 - "i18n & Command Actions"
Cohesion: 0.12
Nodes (23): allMessages, I18nProvider(), NavUser(), locales, LocaleSwitcherMenu(), DropdownMenuCheckboxItem(), DropdownMenuGroup(), DropdownMenuPortal() (+15 more)

### Community 28 - "Invoice Numbering & Totals"
Cohesion: 0.10
Nodes (23): calculateInvoiceTotals(), InvoiceTotals, LineInput, LineResult, UnprocessableError, DocumentPrefix, GenerateSerialOptions, TransactionClient (+15 more)

### Community 29 - "Unified Item Schema & Form"
Cohesion: 0.10
Nodes (25): UnifiedItemDialog(), MasterTabProps, SupplierCard(), SupplierCardProps, SuppliersTabProps, FormErrors, makeTempId(), MasterFieldErrors (+17 more)

### Community 30 - "App Header & Module Layouts"
Cohesion: 0.22
Nodes (12): ContextMenuItemSchema, UniversalContextMenu(), Header(), HeaderProps, getDefaultItemKey(), ListView(), ResizableHandle(), ResizablePanel() (+4 more)

### Community 31 - "Command Palette & App Registry"
Cohesion: 0.13
Nodes (22): BAHRAIN_CITIES, BahrainCity, CityCombobox(), CommandPalette(), CommandPaletteTrigger(), FlatItem, flattenRoutes(), RouteConfig (+14 more)

### Community 32 - "App Error Hierarchy"
Cohesion: 0.10
Nodes (18): AppError, ConflictError, ErrorMeta, ForbiddenError, InternalError, StaleDataError, UnauthorizedError, decimalSchema (+10 more)

### Community 33 - "PDF Print & Download"
Cohesion: 0.11
Nodes (13): jspdf, ALLOWED_TAGS, DocumentPrintPage(), domNodeToReact(), DROP_ENTIRELY, isSafeHref(), parseSafeHtml(), SafeRichText() (+5 more)

### Community 34 - "Items Pages & Scroll Area"
Cohesion: 0.10
Nodes (18): useUnifiedItemForm(), getStockStatus(), ItemDetailsSheet(), ScrollArea(), ScrollBar(), ItemsLayout(), ItemsPage(), CHART_COLORS (+10 more)

### Community 35 - "Date Formatting Library"
Cohesion: 0.17
Nodes (20): DateFormatContext, DateFormatContextValue, DateTimePage(), DATE_DISPLAY_FORMAT_LABELS, DATE_DISPLAY_FORMATS, DATE_INPUT_FORMAT_LABELS, DATE_INPUT_FORMATS, DateDisplayFormat (+12 more)

### Community 36 - "ERP Dashboard Home"
Cohesion: 0.11
Nodes (17): useCustomerForm(), usePOForm(), CardAction(), CustomersPage(), CustomerDetailPage(), ErpDashboard(), IconChip(), LIGHT_FALLBACK (+9 more)

### Community 37 - "Setup Flow & Auth Client"
Cohesion: 0.13
Nodes (11): authClient, LandingClient, SetupData, setupSchema, STEP_FIELDS, STEP_META, slideVariants, STEP_COMPONENTS (+3 more)

### Community 38 - "Landing Page Sections"
Cohesion: 0.10
Nodes (14): CTA(), cardVariants, containerVariants, features, palettes, Footer(), containerVariants, itemVariants (+6 more)

### Community 39 - "Carousel UI Primitive"
Cohesion: 0.15
Nodes (17): Carousel(), CarouselApi, CarouselContent(), CarouselContext, CarouselContextProps, CarouselItem(), CarouselNext(), CarouselOptions (+9 more)

### Community 40 - "shadcn Registry Config"
Cohesion: 0.10
Nodes (19): aliases, components, hooks, lib, ui, utils, iconLibrary, registries (+11 more)

### Community 41 - "Popover & Notification Bell"
Cohesion: 0.14
Nodes (16): formatTimeAgo(), NotificationBell(), DateInput, DateInputFieldProps, DateInputProps, DatePickerField(), DatePickerFieldProps, DatePickerProps (+8 more)

### Community 42 - "OTP Input & Date Segments"
Cohesion: 0.13
Nodes (15): DateInput, DateInputFieldProps, DateInputProps, DatePickerField(), DatePickerFieldProps, DatePickerProps, evaluateDigits(), InputOTP() (+7 more)

### Community 43 - "Docs & Tech-Stack Concepts"
Cohesion: 0.13
Nodes (19): brew services (Homebrew service manager), macOS PID Reuse Hazard, PostgreSQL 18 Homebrew Service, Stale Lock Recovery Procedure (stop, verify, rm, start), brew services 'error' status, Stale postmaster.pid Lock File, Bug: Select Dropdown Stays Open When Drawer Closes, Bug: Item Image Not Removed From File Storage On Update (+11 more)

### Community 44 - "Menubar UI Primitive"
Cohesion: 0.12
Nodes (11): Menubar(), MenubarCheckboxItem(), MenubarContent(), MenubarItem(), MenubarLabel(), MenubarRadioItem(), MenubarSeparator(), MenubarShortcut() (+3 more)

### Community 45 - "Stock Routers"
Cohesion: 0.13
Nodes (15): ADJUSTABLE_BY_DIRECTION, DEFAULT_ADJUSTMENT_REASONS, ensureDefaultAdjustmentReasons(), reasonBaseSchema, stockReasonsRouter, TransactionClient, updateReasonSchema, ADJUSTMENT_TYPES (+7 more)

### Community 46 - "Entity Detail Pages & Hooks"
Cohesion: 0.21
Nodes (13): useHardDeleteForm(), useSubscriptionForm(), useAppAbility(), useIsMobile(), ContractsLayout(), CustomersLayout(), DocumentsLayout(), POLayout() (+5 more)

### Community 47 - "Exchange Rate Sync"
Cohesion: 0.20
Nodes (13): exchangeRatesRouter, SYNC_FREQUENCIES, SYNC_SETTINGS_KEYS, SyncFrequency, ExchangeRateData, fetchAllCurrencyPairs(), fetchAllRatesForBase(), fetchHistoricalRates() (+5 more)

### Community 48 - "Runtime Dependency Set"
Cohesion: 0.13
Nodes (15): ag-grid-community, @better-auth/cli, date-fns, node-cron, dependencies, ag-grid-community, @better-auth/cli, date-fns (+7 more)

### Community 49 - "Root Layout & Providers"
Cohesion: 0.17
Nodes (7): geistMono, geistSans, metadata, Toaster(), ThemeProvider(), DirectionProvider(), TrpcProvider()

### Community 50 - "Clipboard Service"
Cohesion: 0.18
Nodes (7): ClipboardDiagnostics, ClipboardErrorCode, ClipboardResult, ClipboardService, IN_MEMORY_CLIPBOARD, useClipboard(), UseClipboardResult

### Community 51 - "Avatar & Contact List Rows"
Cohesion: 0.21
Nodes (10): Customer_List_Item(), Customer_List_Item_Props, SupplierListItem(), SupplierListItemProps, Avatar(), AvatarBadge(), AvatarFallback(), AvatarGroup() (+2 more)

### Community 52 - "Unified Item Dialog"
Cohesion: 0.15
Nodes (10): DialogState, OpenAddSupplierOptions, OpenCreateOptions, OpenEditOptions, UnifiedItemDialogProps, UnifiedItemFormContext, UnifiedItemFormContextValue, UnifiedItemFormProvider() (+2 more)

### Community 53 - "Item UI Primitive"
Cohesion: 0.18
Nodes (12): Item(), ItemActions(), ItemContent(), ItemDescription(), ItemFooter(), ItemGroup(), ItemHeader(), ItemMedia() (+4 more)

### Community 54 - "Invoices & Quotations Pages"
Cohesion: 0.18
Nodes (5): useInvoiceForm(), usePaymentForm(), DocumentDetailPage(), DocumentsPage(), TRPC_TYPE

### Community 55 - "Warehouse Form Dialog"
Cohesion: 0.18
Nodes (10): defaults(), DialogState, OpenOptions, schema, ValidationAlertProps, WarehouseFormContext, WarehouseFormContextValue, WarehouseFormDialog() (+2 more)

### Community 56 - "Attachment UI Primitive"
Cohesion: 0.20
Nodes (11): Attachment(), AttachmentAction(), AttachmentActions(), AttachmentContent(), AttachmentDescription(), AttachmentGroup(), AttachmentMedia(), attachmentMediaVariants (+3 more)

### Community 57 - "Chart UI Wrapper"
Cohesion: 0.23
Nodes (10): ChartConfig, ChartContext, ChartContextProps, ChartLegendContent(), ChartTooltipContent(), getPayloadConfigFromPayload(), INITIAL_DIMENSION, THEMES (+2 more)

### Community 58 - "Form UI Primitive"
Cohesion: 0.23
Nodes (10): FormControl(), FormDescription(), FormFieldContext, FormFieldContextValue, FormItem(), FormItemContext, FormItemContextValue, FormLabel() (+2 more)

### Community 59 - "Rich Text Editor & Toggles"
Cohesion: 0.25
Nodes (7): RichtextEditor(), RichtextEditorProps, ToggleGroup(), ToggleGroupContext, ToggleGroupItem(), Toggle(), toggleVariants

### Community 60 - "Biome Parser & Formatter Config"
Cohesion: 0.20
Nodes (9): css, parser, quoteStyle, javascript, formatter, linter, enabled, tailwindDirectives (+1 more)

### Community 61 - "Biome Lint Rules"
Cohesion: 0.20
Nodes (10): useExhaustiveDependencies, useUniqueElementIds, rules, correctness, preset, security, style, noDangerouslySetInnerHtml (+2 more)

### Community 62 - "Storage Path Fix Script"
Cohesion: 0.47
Nodes (9): adapter, db, fixFiles(), fixItems(), fixOrganizations(), fixUsers(), isAffected(), main() (+1 more)

### Community 63 - "Contract List & Status Badges"
Cohesion: 0.28
Nodes (6): ContractListItemProps, ContractStatusBadge(), ContractStatusBadgeProps, statusLabels, statusStyles, Progress()

### Community 64 - "Invoice History Timeline"
Cohesion: 0.28
Nodes (8): AuditLogEntry, buildTimelineEvents(), CreditNoteEntry, groupByDate(), InvoiceHistoryPanel(), InvoiceHistoryPanelProps, PaymentEntry, TimelineEvent

### Community 65 - "Import Preview & Sample Data"
Cohesion: 0.39
Nodes (7): BadgeCellRenderer(), ImageCellRenderer(), PreviewStep(), PriceCellRenderer(), SupplierOption, generateSampleData(), getSampleImage()

### Community 66 - "Deploy Script Helpers"
Cohesion: 0.33
Nodes (6): cleanup(), die(), elevate(), on_error(), deploy.sh script, warn()

### Community 67 - "Biome A11y Rules"
Cohesion: 0.25
Nodes (8): noRedundantRoles, noStaticElementInteractions, noSvgWithoutTitle, useButtonType, useFocusableInteractive, useKeyWithClickEvents, useSemanticElements, a11y

### Community 68 - "Biome File Scope Config"
Cohesion: 0.29
Nodes (8): files, ignoreUnknown, includes, includes, **, !**/node_modules, !**/build, !**/dist

### Community 69 - "Date Input Parsing & Defaults"
Cohesion: 0.29
Nodes (8): defaults(), defaults(), DatePicker(), DatePicker(), DateFormatProvider(), parseDateFromInput(), parseDateTimeFromInput(), toDateInputValue()

### Community 70 - "Suppliers Pages & Forms"
Cohesion: 0.33
Nodes (5): SuppliersTab(), useSupplierForm(), useSupplierItemForm(), SupplierDetailPage(), SuppliersPage()

### Community 71 - "Bubble UI Primitive"
Cohesion: 0.38
Nodes (6): Bubble(), BubbleContent(), BubbleGroup(), BubbleReactions(), bubbleReactionsVariants, bubbleVariants

### Community 72 - "Stock Movements Page"
Cohesion: 0.47
Nodes (4): directionOf(), MOVEMENT_TYPES, MovementsPage(), formatDateTime()

### Community 73 - "Biome Suspicious Rules"
Cohesion: 0.33
Nodes (6): suspicious, noArrayIndexKey, noExplicitAny, noImplicitAnyLet, noRedeclare, noUnknownAtRules

### Community 74 - "Item Form Schema & Page"
Cohesion: 0.33
Nodes (5): downloadImage(), ItemPageContent(), getItemFormDefaults(), itemFormSchema, ItemFormValues

### Community 75 - "Contracts Pages & Form"
Cohesion: 0.50
Nodes (3): useContractForm(), ContractsPage(), ContractDetailPage()

### Community 76 - "Warehouses Pages & Form"
Cohesion: 0.50
Nodes (3): useWarehouseForm(), WarehouseDetailPage(), WarehousesPage()

### Community 77 - "Biome Assist & Import Sorting"
Cohesion: 0.40
Nodes (5): source, assist, actions, enabled, organizeImports

### Community 78 - "Calendar UI Primitive"
Cohesion: 0.60
Nodes (4): buttonVariants, Calendar(), CalendarDayButton(), PaginationLink()

### Community 79 - "Marker UI Primitive"
Cohesion: 0.50
Nodes (4): Marker(), MarkerContent(), MarkerIcon(), markerVariants

### Community 80 - "Role Migration Script"
Cohesion: 0.40
Nodes (3): adapter, db, SYSTEM_ROLES

### Community 81 - "Biome Formatter Options"
Cohesion: 0.50
Nodes (4): formatter, enabled, indentStyle, indentWidth

### Community 82 - "Biome VCS Options"
Cohesion: 0.50
Nodes (4): vcs, clientKind, enabled, useIgnoreFile

### Community 83 - "Item Image Upload Tab"
Cohesion: 0.67
Nodes (3): ACCEPTED_TYPES, ImageUpload(), ImageUploadProps

### Community 86 - "next-intl Type Definitions"
Cohesion: 0.50
Nodes (3): AppConfig, Messages, use-intl

### Community 93 - "Expense Form Defaults"
Cohesion: 0.67
Nodes (3): defaults(), ExpenseFormDialog(), toDateInputValue()

### Community 94 - "Income Form Defaults"
Cohesion: 0.67
Nodes (3): defaults(), IncomeFormDialog(), toDateInputValue()

## Ambiguous Edges - Review These
- `Transaction Manager` → `PostgreSQL 18 Homebrew Service`  [AMBIGUOUS]
  docs/fix-postgres-brew-service.md · relation: conceptually_related_to

## Knowledge Gaps
- **691 isolated node(s):** `*.css`, `geistSans`, `geistMono`, `metadata`, `$schema` (+686 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **69 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Transaction Manager` and `PostgreSQL 18 Homebrew Service`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `cn()` connect `Utility UI Components` to `Dialog Forms & Core UI`, `Cards, Tables & Auth Screens`, `Inputs, Selects & Invoice Form`, `ERP Dialogs Provider`, `Reset Flow & Field UI`, `Sidebar & Tree Navigation`, `Auth Pages & Branding`, `Context Menus & Stock UI`, `Income & Expense Pages`, `Money Math Utilities`, `Drawer Component Family`, `Reports Dashboard & Charts`, `Sidebar UI Primitive`, `Bulk Item Import Wizard`, `Sheet UI & Settings Shell`, `i18n & Command Actions`, `Unified Item Schema & Form`, `App Header & Module Layouts`, `Command Palette & App Registry`, `Items Pages & Scroll Area`, `Date Formatting Library`, `ERP Dashboard Home`, `Landing Page Sections`, `Carousel UI Primitive`, `Popover & Notification Bell`, `OTP Input & Date Segments`, `Menubar UI Primitive`, `Entity Detail Pages & Hooks`, `Avatar & Contact List Rows`, `Unified Item Dialog`, `Item UI Primitive`, `Attachment UI Primitive`, `Chart UI Wrapper`, `Form UI Primitive`, `Rich Text Editor & Toggles`, `Contract List & Status Badges`, `Date Input Parsing & Defaults`, `Bubble UI Primitive`, `Stock Movements Page`, `Item Form Schema & Page`, `Calendar UI Primitive`, `Marker UI Primitive`, `Item Image Upload Tab`, `Warehouse List Item`?**
  _High betweenness centrality (0.299) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Runtime Dependency Set` to `Dependency: Radix UI`, `Dependency: react-barcode`, `Dependency: React Day Picker`, `Dependency: React DOM`, `ERP Dialogs Provider`, `Dependency: React Hook Form`, `Dependency: react-is`, `Dependency: Resizable Panels`, `Dependency: Recharts`, `Dependency: shadcn/react`, `Dependency: sharp`, `Dependency: sonner`, `Dependency: superjson`, `Dependency: tailwind-merge`, `Package Config Metadata`, `Dependency: Tailwind Typography`, `Prisma Seed & Permissions`, `Dependency: TanStack Form`, `Dependency: TanStack Table`, `Dependency: TanStack Virtual`, `Dependency: TanStack Zod Adapter`, `Dependency: TipTap Placeholder`, `Dependency: TipTap Text Align`, `Dependency: TipTap Underline`, `Dependency: TipTap PM`, `Dependency: TipTap React`, `Dependency: TipTap Starter Kit`, `Dependency: tRPC Client`, `Dependency: TRPC React Query`, `Dependency: tRPC Server`, `Dependency: tRPC TanStack Query`, `Dependency: tw-animate-css`, `Bulk Item Import Wizard`, `PDF Print & Download`, `Dependency: zod`, `Dependency: AG Grid React`, `Dependency: Base UI React`, `Dependency: bcryptjs`, `Dependency: better-auth`, `Dependency: better-auth/core`, `Dependency: CASL Ability`, `Dependency: class-variance-authority`, `Dependency: cmdk`, `Dependency: dom-to-image-more`, `Dependency: Embla Carousel`, `Dependency: file-type`, `Dependency: Framer Motion`, `Dependency: Fuse.js`, `Dependency: Headless Tree Core`, `Dependency: Headless Tree React`, `Dependency: Hookform Resolvers`, `Dependency: input-otp`, `Dependency: lucide-react`, `Dependency: Next.js`, `Dependency: next-intl`, `Dependency: next-themes`, `Dependency: nuqs`, `Dependency: cuid2`, `Dependency: pdf-lib`, `Dependency: Prisma libsql Adapter`, `Dependency: Prisma pg Adapter`?**
  _High betweenness centrality (0.130) - this node is a cross-community bridge._
- **Why does `react` connect `ERP Dialogs Provider` to `Utility UI Components`, `Inputs, Selects & Invoice Form`, `Sidebar & Tree Navigation`, `Context Menus & Stock UI`, `Income & Expense Pages`, `Reports Dashboard & Charts`, `Sidebar UI Primitive`, `Hard Delete Dialog`, `Unified Item Schema & Form`, `App Header & Module Layouts`, `Command Palette & App Registry`, `PDF Print & Download`, `Items Pages & Scroll Area`, `ERP Dashboard Home`, `Carousel UI Primitive`, `Popover & Notification Bell`, `OTP Input & Date Segments`, `Entity Detail Pages & Hooks`, `Runtime Dependency Set`, `Unified Item Dialog`, `Invoices & Quotations Pages`, `Warehouse Form Dialog`, `Chart UI Wrapper`, `Form UI Primitive`, `Rich Text Editor & Toggles`, `Invoice History Timeline`, `Date Input Parsing & Defaults`, `Suppliers Pages & Forms`, `Item Form Schema & Page`, `Contracts Pages & Form`, `Warehouses Pages & Form`, `Calendar UI Primitive`, `Item Image Upload Tab`, `Expense Form Defaults`, `Income Form Defaults`?**
  _High betweenness centrality (0.127) - this node is a cross-community bridge._
- **What connects `*.css`, `geistSans`, `geistMono` to the rest of the system?**
  _694 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Dialog Forms & Core UI` be split into smaller, more focused modules?**
  _Cohesion score 0.03250057830210502 - nodes in this community are weakly interconnected._
- **Should `Utility UI Components` be split into smaller, more focused modules?**
  _Cohesion score 0.03153988868274583 - nodes in this community are weakly interconnected._