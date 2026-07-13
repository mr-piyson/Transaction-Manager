# Graph Report - .  (2026-07-12)

## Corpus Check
- 372 files · ~218,432 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2174 nodes · 7167 edges · 181 communities (98 shown, 83 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 20 edges (avg confidence: 0.66)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Auth & Core ERP Pages
- Settings & Permissions UI
- Supplier & Location Management
- App Layout & Navigation
- Server tRPC & Error Handling
- Reports & Analytics
- Shared UI Components
- Invoice Calculator & Instrumentation
- Validation Schemas
- Auth Signup & Customers
- ERP/HRMS Layout & Dialogs
- Item Management Dialog
- Document & City Components
- Root Layout & App Shell
- Context Menu System
- App Sidebar Navigation
- tRPC Procedure Context
- Biome Configuration
- Tax, Units & Time Tracking
- TypeScript Reference Types
- Architecture Documentation
- tRPC API & Authorization
- ERP List Layouts
- Grievance Management
- Invoice Management
- Dev Tooling Config
- Salary & Payment Services
- Component Module Aliases
- Alert Dialog System
- Landing Page Components
- Auth Layouts
- Items Dashboard
- HR Accounts & Departments
- Setup Wizard
- Item Master & File Upload
- Clipboard & Kiosk Settings
- Items Tree Pattern
- Error Types
- React Auth Dependencies
- File Upload API Routes
- Performance Review
- CSV Import Steps
- Auth Dashboard Charts
- Purchase Order Form
- Carousel Components
- Image Processing Utilities
- Departments Management
- Employee Types Management
- Job Positions Management
- Leave Balance Management
- Leave Types Management
- Training Management
- Contract Form
- Customer Form
- Disciplinary Action Form
- Item Detail Components
- Holiday Form
- Job Posting Form
- Form Components
- Item Preview Steps
- Attachment System
- Form Field Components
- Shift Form
- Rich Text Editor
- Employee Router
- Attachment Repository
- Document Pages
- Prettier Config
- Settings Item Page
- Storage Service
- New Item Page
- Package Config
- Build Scripts
- Purchase Order Detail
- Chat Bubble Components
- Attachment Service
- Employee List Item
- DB Seed Adapter
- Contract Detail
- Customer Detail
- Warehouse Detail
- Roles Adapter
- URL Adapter Route
- Supplier List
- Attendance Layout
- Employee List
- Shift List
- Invoice Payment Lifecycle
- Image Upload
- i18n Config
- OpenCode Plugin
- OpenCode Schema
- Employee Relations
- Leave Layout
- Recruitment Layout
- Storage Abstraction Rationale
- Warehouse List Item
- Graphify Plugin
- Community 99
- Community 102
- Community 103
- Community 104
- Community 105
- Community 106
- Community 107
- Community 108
- Community 109
- Community 110
- Community 111
- Community 114
- Community 115
- Community 116
- Community 117
- Community 118
- Community 119
- Community 120
- Community 121
- Community 122
- Community 123
- Community 124
- Community 125
- Community 126
- Community 127
- Community 128
- Community 129
- Community 130
- Community 131
- Community 132
- Community 133
- Community 134
- Community 135
- Community 136
- Community 137
- Community 138
- Community 139
- Community 140
- Community 141
- Community 142
- Community 143
- Community 144
- Community 145
- Community 146
- Community 147
- Community 148
- Community 149
- Community 150
- Community 151
- Community 152
- Community 153
- Community 154
- Community 155
- Community 156
- Community 157
- Community 158
- Community 159
- Community 160
- Community 161
- Community 162
- Community 163
- Community 164
- Community 165
- Community 166
- Community 167
- Community 168
- Community 169
- Community 170
- Community 171
- Community 172
- Community 173
- Community 174
- Community 175
- Community 176
- Community 179
- Community 180

## God Nodes (most connected - your core abstractions)
1. `cn()` - 459 edges
2. `Button()` - 134 edges
3. `react` - 119 edges
4. `trpc` - 103 edges
5. `Input()` - 82 edges
6. `Badge()` - 61 edges
7. `Label()` - 61 edges
8. `SelectTrigger()` - 53 edges
9. `SelectContent()` - 53 edges
10. `SelectItem()` - 53 edges

## Surprising Connections (you probably didn't know these)
- `KpiCard()` --calls--> `cn()`  [EXTRACTED]
  app/(dashboard)/erp/reports/items/page.tsx → lib/utils.ts
- `DetailRow()` --calls--> `cn()`  [EXTRACTED]
  app/(dashboard)/erp/reports/items/page.tsx → lib/utils.ts
- `KpiCard()` --calls--> `cn()`  [EXTRACTED]
  app/(dashboard)/erp/reports/page.tsx → lib/utils.ts
- `AppearancePage()` --calls--> `cn()`  [EXTRACTED]
  app/(dashboard)/settings/appearance/page.tsx → lib/utils.ts
- `DateTimePage()` --calls--> `cn()`  [EXTRACTED]
  app/(dashboard)/settings/date-time/page.tsx → lib/utils.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Transaction Manager Technology Stack** — architecture_transaction_manager, architecture_nextjs_16, architecture_typescript_5_9, architecture_trpc_v11, architecture_prisma_7, architecture_better_auth, architecture_casl [EXTRACTED 1.00]
- **Architecture Layer Stack** — architecture_transaction_manager, architecture_database_layer, architecture_api_layer, architecture_auth_layer, architecture_authz_layer, architecture_service_layer, architecture_module_routers, architecture_frontend [EXTRACTED 1.00]
- **File Storage Pipeline** — architecture_file_storage, architecture_upload_pipeline, architecture_storage_abstraction, architecture_deduplication [EXTRACTED 1.00]

## Communities (181 total, 83 thin omitted)

### Community 0 - "Auth & Core ERP Pages"
Cohesion: 0.08
Nodes (100): SignInSchema, STATUS_COLORS, DOCUMENT_CONFIG, STATUS_STYLES, STATUS_COLORS, InvoicePrintPage(), STATUS_STYLES, STATUS_COLORS (+92 more)

### Community 1 - "Settings & Permissions UI"
Cohesion: 0.04
Nodes (64): StatCard(), PermissionsPage(), RoleIcon(), UsersSettingsPage(), AccordionContent(), AccordionItem(), AccordionTrigger(), BreadcrumbEllipsis() (+56 more)

### Community 2 - "Supplier & Location Management"
Cohesion: 0.06
Nodes (58): SupplierDetailPage(), BAHRAIN_CITIES, BahrainCity, UniversalComboboxProps, CommandPalette(), CommandPaletteTrigger(), FlatItem, flattenRoutes() (+50 more)

### Community 3 - "App Layout & Navigation"
Cohesion: 0.05
Nodes (58): SettingsLayout(), SidebarContext, SidebarContextProps, SidebarGroup(), SidebarGroupAction(), SidebarGroupContent(), SidebarGroupLabel(), SidebarInput() (+50 more)

### Community 4 - "Server tRPC & Error Handling"
Cohesion: 0.08
Nodes (45): NotFoundError, UnprocessableError, publicProcedure, toPrismaPage(), attendanceRouter, departmentCreateSchema, departmentsRouter, departmentUpdateSchema (+37 more)

### Community 5 - "Reports & Analytics"
Cohesion: 0.05
Nodes (43): CHART_COLORS, DetailRow(), exportCsv(), ItemReportPage(), ItemRow, KpiCard(), QUICK_FILTERS, QuickFilterKey (+35 more)

### Community 6 - "Shared UI Components"
Cohesion: 0.05
Nodes (32): Badge(), badgeVariants, Button, ButtonProps, buttonVariants, ContractListItem(), ContractListItemProps, ContractStatusBadge() (+24 more)

### Community 7 - "Invoice Calculator & Instrumentation"
Cohesion: 0.06
Nodes (36): register(), calculateInvoiceTotals(), InvoiceTotals, LineInput, LineResult, StaleDataError, DocumentPrefix, generateSerial() (+28 more)

### Community 8 - "Validation Schemas"
Cohesion: 0.06
Nodes (40): cuidSchema, CursorPagination, cursorPaginationSchema, dateRangeSchema, decimalSchema, OffsetPagination, offsetPaginationSchema, paginatedResponse() (+32 more)

### Community 9 - "Auth Signup & Customers"
Cohesion: 0.07
Nodes (33): SignUpSchema, authClient, Customer_List_Item(), Customer_List_Item_Props, allMessages, I18nProvider(), NavUser(), locales (+25 more)

### Community 10 - "ERP/HRMS Layout & Dialogs"
Cohesion: 0.06
Nodes (37): SalaryComponentsPage(), CandidateFormContext, CandidateFormContextValue, CandidateFormDialog(), CandidateFormDialogProps, CandidateFormProvider(), CandidateFormValues, defaults() (+29 more)

### Community 11 - "Item Management Dialog"
Cohesion: 0.06
Nodes (36): DialogState, OpenAddSupplierOptions, OpenCreateOptions, UnifiedItemDialogProps, UnifiedItemFormContext, UnifiedItemFormContextValue, UnifiedItemFormProvider(), useUnifiedItemForm() (+28 more)

### Community 12 - "Document & City Components"
Cohesion: 0.06
Nodes (36): DocumentPrintPage(), DocumentsPage(), PayrollDetailPage(), PayrollListPage(), TrainingDetailPage(), CityCombobox(), UniversalCombobox(), defaults() (+28 more)

### Community 13 - "Root Layout & App Shell"
Cohesion: 0.09
Nodes (28): DateTimePage(), geistMono, geistSans, metadata, Toaster(), ThemeProvider(), DatePickerFieldProps, DatePickerProps (+20 more)

### Community 14 - "Context Menu System"
Cohesion: 0.07
Nodes (30): BaseMenuItem, ContextMenuActionItem, ContextMenuLabelItem, ContextMenuSeparatorItem, ContextMenuSwitchItem, DesktopMenuItems, DrawerLevel, MenuIcon() (+22 more)

### Community 15 - "App Sidebar Navigation"
Cohesion: 0.08
Nodes (32): AppSidebar(), AppSidebarProps, AppSwitcher(), buildSidebarItems(), RouteConfig, SidebarToggleButton(), TreeItemData, DashboardShell() (+24 more)

### Community 16 - "tRPC Procedure Context"
Cohesion: 0.09
Nodes (27): hasOrg, isAuthed, loggerMiddleware, orgProcedure, protectedProcedure, t, currencyCodeSchema, attachmentsRouter (+19 more)

### Community 17 - "Biome Configuration"
Cohesion: 0.06
Nodes (35): useButtonType, useFocusableInteractive, useSemanticElements, source, assist, actions, enabled, useExhaustiveDependencies (+27 more)

### Community 18 - "Tax, Units & Time Tracking"
Cohesion: 0.13
Nodes (20): Unit, schema, TimePunchFormContext, TimePunchFormContextValue, TimePunchFormDialog(), TimePunchFormDialogProps, TimePunchFormProvider(), TimePunchFormValues (+12 more)

### Community 19 - "TypeScript Reference Types"
Cohesion: 0.06
Nodes (31): ./*, dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts (+23 more)

### Community 20 - "Architecture Documentation"
Cohesion: 0.07
Nodes (29): Graphify Knowledge Graph, API Layer (tRPC), Authentication (Better Auth), Authorization (CASL), Better Auth v1.6, CASL (Ability-Based Permissions), Client-Side i18n Architecture, Database Layer (Prisma ORM) (+21 more)

### Community 21 - "tRPC API & Authorization"
Cohesion: 0.11
Nodes (21): handler(), auth, AbilityContext, AbilityUser, Action, AppAbilityType, createAppAbility(), defineAbilitiesFor() (+13 more)

### Community 22 - "ERP List Layouts"
Cohesion: 0.28
Nodes (12): statusFilters, StockRow, ContextMenuItemSchema, UniversalContextMenu(), Header(), HeaderProps, FilterConfig, ListView() (+4 more)

### Community 23 - "Grievance Management"
Cohesion: 0.10
Nodes (21): defaults(), DialogState, GrievanceFormContext, GrievanceFormContextValue, GrievanceFormDialog(), GrievanceFormDialogProps, GrievanceFormProvider(), GrievanceFormValues (+13 more)

### Community 24 - "Invoice Management"
Cohesion: 0.11
Nodes (18): defaults(), DialogState, InvoiceFormContext, InvoiceFormContextValue, InvoiceFormDialog(), InvoiceFormDialogProps, InvoiceFormValues, invoiceLineSchema (+10 more)

### Community 25 - "Dev Tooling Config"
Cohesion: 0.10
Nodes (21): eslint-config-next, devDependencies, eslint-config-next, prettier, prisma, @tailwindcss/postcss, @types/bcryptjs, @types/eslint (+13 more)

### Community 26 - "Salary & Payment Services"
Cohesion: 0.15
Nodes (17): salaryComponentSchema, salaryComponentsRouter, addPayment(), AddPaymentOptions, deletePayment(), DeletePaymentOptions, resolveInvoiceStatus(), resolvePaymentStatus() (+9 more)

### Community 27 - "Component Module Aliases"
Cohesion: 0.10
Nodes (19): aliases, components, hooks, lib, ui, utils, iconLibrary, registries (+11 more)

### Community 28 - "Alert Dialog System"
Cohesion: 0.14
Nodes (14): AlertController, AlertVariant, ConfirmOptions, QueueItem, AlertDialog(), AlertDialogAction(), AlertDialogCancel(), AlertDialogContent() (+6 more)

### Community 29 - "Landing Page Components"
Cohesion: 0.13
Nodes (10): CTA(), Footer(), footerLinks, navLinks, containerVariants, itemVariants, routes, orbs (+2 more)

### Community 30 - "Auth Layouts"
Cohesion: 0.20
Nodes (11): AuthLayout(), AuthLayoutProps, DashboardLayout(), Page(), SetupLayoutProps, getCurrentUser(), getSession(), AlertProvider() (+3 more)

### Community 31 - "Items Dashboard"
Cohesion: 0.15
Nodes (15): ItemsLayout(), ErpDashboard(), ItemDetailSheet(), ItemListItem(), ItemListItemProps, TYPE_STYLES, HoverCard(), HoverCardContent() (+7 more)

### Community 32 - "HR Accounts & Departments"
Cohesion: 0.11
Nodes (16): validateEmail(), validatePassword(), CHART_OF_ACCOUNTS, DEFAULT_DEPARTMENTS, DEFAULT_EMPLOYEE_TYPES, DEFAULT_LEAVE_TYPES, DEFAULT_SHIFTS, DEFAULT_TAX_RATES (+8 more)

### Community 33 - "Setup Wizard"
Cohesion: 0.25
Nodes (10): slideVariants, STEP_COMPONENTS, SetupData, setupSchema, STEP_FIELDS, STEP_META, Step1Language(), Step2Organization() (+2 more)

### Community 34 - "Item Master & File Upload"
Cohesion: 0.23
Nodes (12): FileUploadStep(), cleanupUploadedFiles(), clearPending(), getPendingFileIds(), markForCleanup(), pendingDeletes, removeFromCleanup(), ItemImportWizard() (+4 more)

### Community 35 - "Clipboard & Kiosk Settings"
Cohesion: 0.17
Nodes (8): KiosksSettingsPage(), ClipboardDiagnostics, ClipboardErrorCode, ClipboardResult, ClipboardService, IN_MEMORY_CLIPBOARD, useClipboard(), UseClipboardResult

### Community 36 - "Items Tree Pattern"
Cohesion: 0.17
Nodes (13): Item, items, ToggleIconType, Tree(), TreeContext, TreeContextValue, TreeDragLine(), TreeItem() (+5 more)

### Community 37 - "Error Types"
Cohesion: 0.17
Nodes (8): AppError, ConflictError, ErrorMeta, ForbiddenError, InternalError, UnauthorizedError, employeeTypeSchema, employeeTypesRouter

### Community 38 - "React Auth Dependencies"
Cohesion: 0.13
Nodes (15): ag-grid-community, ag-grid-react, @base-ui/react, better-auth, dependencies, ag-grid-community, ag-grid-react, @base-ui/react (+7 more)

### Community 39 - "File Upload API Routes"
Cohesion: 0.23
Nodes (11): DELETE(), POST(), computeSha256(), ImageMetadata, ImageProcessResult, isImageMime(), processImage(), deleteUpload() (+3 more)

### Community 40 - "Performance Review"
Cohesion: 0.14
Nodes (14): PerformanceDetailPage(), PerformanceListPage(), defaults(), DialogState, OpenOptions, PerformanceReviewFormContext, PerformanceReviewFormContextValue, PerformanceReviewFormDialog() (+6 more)

### Community 41 - "CSV Import Steps"
Cohesion: 0.22
Nodes (12): downloadCsvTemplate(), FileUploadStepProps, TEMPLATE_COLUMNS, TEMPLATE_ROW, ImageUploadStep(), ImageUploadStepProps, PreviewStepProps, COLUMN_ALIASES (+4 more)

### Community 42 - "Auth Dashboard Charts"
Cohesion: 0.25
Nodes (9): CHART_COLORS, fmtShort(), KpiCard(), ReportsPage(), Tabs(), TabsContent(), TabsList(), tabsListVariants (+1 more)

### Community 43 - "Purchase Order Form"
Cohesion: 0.15
Nodes (12): defaults(), DialogState, lineSchema, OpenOptions, POFormContext, POFormContextValue, POFormDialog(), POFormDialogProps (+4 more)

### Community 44 - "Carousel Components"
Cohesion: 0.20
Nodes (13): Carousel(), CarouselApi, CarouselContent(), CarouselContext, CarouselContextProps, CarouselItem(), CarouselNext(), CarouselOptions (+5 more)

### Community 45 - "Image Processing Utilities"
Cohesion: 0.22
Nodes (12): compressImage(), ensureUploadDir(), generateFilename(), makeImageSchema(), makePDFSchema(), MIME_TO_EXT, saveImage(), savePDF() (+4 more)

### Community 46 - "Departments Management"
Cohesion: 0.17
Nodes (12): DepartmentsPage(), defaults(), DepartmentFormContext, DepartmentFormContextValue, DepartmentFormDialog(), DepartmentFormDialogProps, DepartmentFormProvider(), DepartmentFormValues (+4 more)

### Community 47 - "Employee Types Management"
Cohesion: 0.17
Nodes (12): EmployeeTypesPage(), defaults(), DialogState, EmployeeTypeFormContext, EmployeeTypeFormContextValue, EmployeeTypeFormDialog(), EmployeeTypeFormDialogProps, EmployeeTypeFormProvider() (+4 more)

### Community 48 - "Job Positions Management"
Cohesion: 0.17
Nodes (12): JobPositionsPage(), defaults(), DialogState, JobPositionFormContext, JobPositionFormContextValue, JobPositionFormDialog(), JobPositionFormDialogProps, JobPositionFormProvider() (+4 more)

### Community 49 - "Leave Balance Management"
Cohesion: 0.17
Nodes (12): LeaveBalancesPage(), defaults(), DialogState, LeaveAllocateFormContext, LeaveAllocateFormContextValue, LeaveAllocateFormDialog(), LeaveAllocateFormDialogProps, LeaveAllocateFormProvider() (+4 more)

### Community 50 - "Leave Types Management"
Cohesion: 0.17
Nodes (12): LeaveTypesPage(), defaults(), DialogState, LeaveTypeFormContext, LeaveTypeFormContextValue, LeaveTypeFormDialog(), LeaveTypeFormDialogProps, LeaveTypeFormProvider() (+4 more)

### Community 51 - "Training Management"
Cohesion: 0.17
Nodes (12): TrainingListPage(), defaults(), DialogState, OpenOptions, schema, TrainingFormContext, TrainingFormContextValue, TrainingFormDialog() (+4 more)

### Community 52 - "Contract Form"
Cohesion: 0.17
Nodes (11): ContractFormContext, ContractFormContextValue, ContractFormDialog(), ContractFormDialogProps, ContractFormProvider(), ContractFormValues, defaults(), DialogState (+3 more)

### Community 53 - "Customer Form"
Cohesion: 0.17
Nodes (11): CustomerFormContext, CustomerFormContextValue, CustomerFormDialog(), CustomerFormDialogProps, CustomerFormProvider(), CustomerFormValues, defaults(), DialogState (+3 more)

### Community 54 - "Disciplinary Action Form"
Cohesion: 0.17
Nodes (12): defaults(), DialogState, DisciplinaryActionFormContext, DisciplinaryActionFormContextValue, DisciplinaryActionFormDialog(), DisciplinaryActionFormDialogProps, DisciplinaryActionFormProvider(), DisciplinaryActionFormValues (+4 more)

### Community 55 - "Item Detail Components"
Cohesion: 0.18
Nodes (12): Item(), ItemActions(), ItemContent(), ItemDescription(), ItemFooter(), ItemGroup(), ItemHeader(), ItemMedia() (+4 more)

### Community 56 - "Holiday Form"
Cohesion: 0.18
Nodes (11): defaults(), DialogState, HolidayFormContext, HolidayFormContextValue, HolidayFormDialog(), HolidayFormDialogProps, HolidayFormProvider(), HolidayFormValues (+3 more)

### Community 57 - "Job Posting Form"
Cohesion: 0.18
Nodes (11): defaults(), DialogState, employmentTypeValues, JobPostingFormContext, JobPostingFormContextValue, JobPostingFormDialog(), JobPostingFormDialogProps, JobPostingFormProvider() (+3 more)

### Community 58 - "Form Components"
Cohesion: 0.17
Nodes (10): FormControl, FormDescription, FormFieldContext, FormFieldContextValue, FormItem, FormItemContext, FormItemContextValue, FormLabel (+2 more)

### Community 59 - "Item Preview Steps"
Cohesion: 0.29
Nodes (9): BadgeCellRenderer(), ImageCellRenderer(), PreviewStep(), PriceCellRenderer(), generateSampleData(), getSampleImage(), SelectionDialog(), baseCompactParams (+1 more)

### Community 60 - "Attachment System"
Cohesion: 0.20
Nodes (11): Attachment(), AttachmentAction(), AttachmentActions(), AttachmentContent(), AttachmentDescription(), AttachmentGroup(), AttachmentMedia(), attachmentMediaVariants (+3 more)

### Community 61 - "Form Field Components"
Cohesion: 0.23
Nodes (10): FormControl(), FormDescription(), FormFieldContext, FormFieldContextValue, FormItem(), FormItemContext, FormItemContextValue, FormLabel() (+2 more)

### Community 62 - "Shift Form"
Cohesion: 0.20
Nodes (10): defaults(), DialogState, OpenOptions, schema, ShiftFormContext, ShiftFormContextValue, ShiftFormDialog(), ShiftFormDialogProps (+2 more)

### Community 63 - "Rich Text Editor"
Cohesion: 0.25
Nodes (7): RichtextEditor(), RichtextEditorProps, ToggleGroup(), ToggleGroupContext, ToggleGroupItem(), Toggle(), toggleVariants

### Community 64 - "Employee Router"
Cohesion: 0.24
Nodes (9): employeeCreateSchema, employeeSelect, employeesRouter, employeeUpdateSchema, employeeStatusSchema, generateEmployeeCode(), padNumber(), TransactionClient (+1 more)

### Community 66 - "Document Pages"
Cohesion: 0.24
Nodes (8): DocumentDetailPage(), DocumentsLayout(), DocumentsPage(), TRPC_TYPE, InvoiceDetailPage(), InvoicesLayout(), InvoicesPage(), useInvoiceForm()

### Community 67 - "Prettier Config"
Cohesion: 0.20
Nodes (9): arrowParens, bracketSpacing, endOfLine, printWidth, semi, singleQuote, tabWidth, trailingComma (+1 more)

### Community 68 - "Settings Item Page"
Cohesion: 0.31
Nodes (6): DEFAULTS, fromSettings(), HRMS_SETTING_KEYS, HrmsSettings, HrmsSettingsPage(), toKey()

### Community 69 - "Storage Service"
Cohesion: 0.28
Nodes (5): buildStoragePath(), datePath(), StorageResult, UPLOAD_ROOT, write()

### Community 70 - "New Item Page"
Cohesion: 0.25
Nodes (5): downloadImage(), ItemPageContent(), getItemFormDefaults(), itemFormSchema, ItemFormValues

### Community 71 - "Package Config"
Cohesion: 0.32
Nodes (7): ignoreScripts, name, private, trustedDependencies, version, sharp, unrs-resolver

### Community 72 - "Build Scripts"
Cohesion: 0.25
Nodes (8): scripts, build, dev, format, lint, start, sync, update

### Community 73 - "Purchase Order Detail"
Cohesion: 0.38
Nodes (6): PurchaseOrderDetailPage(), POLayout(), PurchaseOrdersPage(), UnifiedItemDialog(), usePOForm(), useAppAbility()

### Community 74 - "Chat Bubble Components"
Cohesion: 0.38
Nodes (6): Bubble(), BubbleContent(), BubbleGroup(), BubbleReactions(), bubbleReactionsVariants, bubbleVariants

### Community 75 - "Attachment Service"
Cohesion: 0.33
Nodes (3): CreateAttachmentInput, deleteAttachment(), deleteByEntity()

### Community 76 - "Employee List Item"
Cohesion: 0.40
Nodes (4): EmployeeListItem(), EmployeeListItemProps, EmployeeStatusBadge(), STATUS_COLORS

### Community 77 - "DB Seed Adapter"
Cohesion: 0.33
Nodes (4): adapter, db, permissions, SYSTEM_ROLES

### Community 78 - "Contract Detail"
Cohesion: 0.50
Nodes (4): ContractDetailPage(), ContractsLayout(), ContractsPage(), useContractForm()

### Community 79 - "Customer Detail"
Cohesion: 0.50
Nodes (4): CustomerDetailPage(), CustomersLayout(), CustomersPage(), useCustomerForm()

### Community 80 - "Warehouse Detail"
Cohesion: 0.50
Nodes (4): WarehouseDetailPage(), WarehousesLayout(), WarehousesPage(), useWarehouseForm()

### Community 81 - "Roles Adapter"
Cohesion: 0.40
Nodes (3): adapter, db, SYSTEM_ROLES

### Community 82 - "URL Adapter Route"
Cohesion: 0.83
Nodes (3): adaptUrl(), GET(), POST()

### Community 83 - "Supplier List"
Cohesion: 0.67
Nodes (3): SuppliersLayout(), SuppliersPage(), useSupplierForm()

### Community 84 - "Attendance Layout"
Cohesion: 0.67
Nodes (3): AttendanceLayout(), AttendanceRecordsPage(), useTimePunchForm()

### Community 85 - "Employee List"
Cohesion: 0.67
Nodes (3): EmployeesLayout(), EmployeesPage(), useEmployeeForm()

### Community 86 - "Shift List"
Cohesion: 0.67
Nodes (3): ShiftsLayout(), ShiftsPage(), useShiftForm()

### Community 87 - "Invoice Payment Lifecycle"
Cohesion: 0.67
Nodes (4): Invoice Lifecycle, Payment-Invoice Sync, Invoices Feature, Payments Feature

### Community 90 - "i18n Config"
Cohesion: 0.50
Nodes (3): AppConfig, Messages, use-intl

### Community 91 - "OpenCode Plugin"
Cohesion: 0.50
Nodes (3): @opencode-ai/plugin, dependencies, @opencode-ai/plugin

### Community 92 - "OpenCode Schema"
Cohesion: 0.50
Nodes (3): plugin, $schema, .opencode/plugins/graphify.js

### Community 96 - "Storage Abstraction Rationale"
Cohesion: 0.67
Nodes (3): Storage Abstraction for S3 Migration, Storage Abstraction, Upload Pipeline

## Knowledge Gaps
- **662 isolated node(s):** `$schema`, `.opencode/plugins/graphify.js`, `@opencode-ai/plugin`, `printWidth`, `tabWidth` (+657 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **83 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Settings & Permissions UI` to `Auth & Core ERP Pages`, `Supplier & Location Management`, `App Layout & Navigation`, `Reports & Analytics`, `Shared UI Components`, `Auth Signup & Customers`, `Item Management Dialog`, `Document & City Components`, `Root Layout & App Shell`, `Context Menu System`, `App Sidebar Navigation`, `Tax, Units & Time Tracking`, `ERP List Layouts`, `Grievance Management`, `Invoice Management`, `Alert Dialog System`, `Auth Layouts`, `Items Dashboard`, `Setup Wizard`, `Item Master & File Upload`, `Items Tree Pattern`, `CSV Import Steps`, `Auth Dashboard Charts`, `Carousel Components`, `Item Detail Components`, `Form Components`, `Item Preview Steps`, `Attachment System`, `Form Field Components`, `Rich Text Editor`, `Document Pages`, `New Item Page`, `Purchase Order Detail`, `Chat Bubble Components`, `Employee List Item`, `Contract Detail`, `Customer Detail`, `Warehouse Detail`, `Supplier List`, `Employee List`, `Warehouse List Item`?**
  _High betweenness centrality (0.255) - this node is a cross-community bridge._
- **Why does `react` connect `Document & City Components` to `Auth & Core ERP Pages`, `Settings & Permissions UI`, `Supplier & Location Management`, `App Layout & Navigation`, `Reports & Analytics`, `Shared UI Components`, `ERP/HRMS Layout & Dialogs`, `Item Management Dialog`, `Context Menu System`, `App Sidebar Navigation`, `Tax, Units & Time Tracking`, `ERP List Layouts`, `Grievance Management`, `Invoice Management`, `React Auth Dependencies`, `Performance Review`, `Purchase Order Form`, `Carousel Components`, `Departments Management`, `Employee Types Management`, `Job Positions Management`, `Leave Balance Management`, `Leave Types Management`, `Training Management`, `Contract Form`, `Customer Form`, `Disciplinary Action Form`, `Holiday Form`, `Job Posting Form`, `Form Components`, `Form Field Components`, `Shift Form`, `Rich Text Editor`, `Document Pages`, `New Item Page`, `Purchase Order Detail`, `Contract Detail`, `Customer Detail`, `Warehouse Detail`, `Supplier List`, `Attendance Layout`, `Employee List`, `Shift List`, `Employee Relations`, `Recruitment Layout`?**
  _High betweenness centrality (0.140) - this node is a cross-community bridge._
- **Why does `dependencies` connect `React Auth Dependencies` to `Community 128`, `Community 129`, `Community 130`, `Community 131`, `Community 132`, `Community 133`, `Community 134`, `Community 135`, `Community 136`, `Community 137`, `Community 138`, `Community 139`, `Document & City Components`, `Community 140`, `Community 141`, `Community 142`, `Community 143`, `Community 144`, `Community 145`, `Community 146`, `Community 147`, `Community 148`, `Community 149`, `Community 150`, `Community 151`, `Community 152`, `Community 153`, `Community 154`, `Community 155`, `Community 156`, `Community 157`, `Community 158`, `Community 159`, `Community 160`, `Community 161`, `Community 162`, `Community 163`, `Community 164`, `Item Master & File Upload`, `Community 165`, `Package Config`, `Community 106`, `Community 107`, `Community 108`, `Community 109`, `Community 110`, `Community 111`, `Community 114`, `Community 115`, `Community 118`, `Community 119`, `Community 120`, `Community 121`, `Community 122`, `Community 123`, `Community 124`, `Community 125`, `Community 126`?**
  _High betweenness centrality (0.134) - this node is a cross-community bridge._
- **What connects `$schema`, `.opencode/plugins/graphify.js`, `@opencode-ai/plugin` to the rest of the system?**
  _670 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Auth & Core ERP Pages` be split into smaller, more focused modules?**
  _Cohesion score 0.08306770984255771 - nodes in this community are weakly interconnected._
- **Should `Settings & Permissions UI` be split into smaller, more focused modules?**
  _Cohesion score 0.03884372177055104 - nodes in this community are weakly interconnected._
- **Should `Supplier & Location Management` be split into smaller, more focused modules?**
  _Cohesion score 0.056338028169014086 - nodes in this community are weakly interconnected._