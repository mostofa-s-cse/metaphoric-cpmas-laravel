# CPMAS Laravel Migration — Master Progress Tracker

> **READ THIS FIRST** in every new chat session before continuing work.
> Project: Migrate `metaphoric-cpmas` (Next.js 16 / Prisma / RTK Query) → **Laravel 11** (Inertia.js + React + Sanctum)

---

## 📂 Key Paths

| Path | Description |
|:---|:---|
| `/Users/mostofa/Projects/me/metaphoric-cpmas/` | Original Next.js project (source of truth for logic) |
| `/Users/mostofa/Projects/me/metaphoric-cpmas/cpmas-laravel/` | New Laravel 11 project (migration target) |
| `/Users/mostofa/Projects/me/metaphoric-cpmas/prisma/schema.prisma` | Source DB schema to replicate |
| `/Users/mostofa/Projects/me/metaphoric-cpmas/src/app/api/` | Next.js API routes (source of all business logic) |
| `/Users/mostofa/Projects/me/metaphoric-cpmas/CLAUDE.md` | Full architecture spec for original project |

---

## 🏛️ Architecture Decisions Made

| Decision | Choice | Reason |
|:---|:---|:---|
| **Frontend** | Laravel + Inertia.js + React | Preserve all existing React UI |
| **Auth** | Laravel Sanctum + Session Cookie | Native & most secure for Inertia |
| **Auth Password Column** | `passwordHash` (not `password`) | Match Prisma schema exactly |
| **IDs** | UUID everywhere | Match Prisma `@default(uuid())` |
| **Financial Encryption** | `EncryptedFloat` custom Cast (AES-256-CBC, SHA-256 key hash) | Byte-for-byte compatible with NodeJS crypto.ts |
| **Audit Logging** | `Auditable` trait on every model | Replicate Prisma `$extends` query middleware |
| **Response Envelope** | `ApiResponse` trait on controllers | Match `{ status, message, data, timestamp, path }` format |
| **RBAC** | `RoleMiddleware` with numeric hierarchy | Match Next.js ROLE_HIERARCHY exactly |
| **DB Driver** | SQLite (local dev) / PostgreSQL (production) | Match Supabase PostgreSQL in prod |

---

## ✅ COMPLETED TASKS

### Phase 1: Laravel Project Bootstrap ✅
- [x] Created Laravel 11 project at `cpmas-laravel/`
- [x] Installed Laravel Breeze (React + Inertia.js + TypeScript preset)
- [x] Fixed `npm install --legacy-peer-deps` (Vite 8 + @vitejs/plugin-react conflict)
- [x] Installed frontend libs: `lucide-react recharts html2canvas jspdf zod @hookform/resolvers react-hook-form`

### Phase 2: Database Migrations ✅
- [x] Modified `0001_01_01_000000_create_users_table.php` → UUID PK, `passwordHash`, `fullName`, `profileImage`, `role`
- [x] Created `2026_07_09_000000_create_cpmas_tables.php` with ALL 23 tables:
  - projects, suppliers, vendors, employees, labours, attendances, materials
  - cash_ins, salaries, cash_outs, documents, audit_logs, contact_inquiries
  - project_vendors, project_suppliers
  - website_settings, website_sections, website_services, website_portfolios
  - website_teams, website_trust_badges, website_testimonials, website_faqs
- [x] Ran `php artisan migrate:fresh --seed` — all 4 migrations pass ✅

### Phase 3: Security & Core Traits ✅
- [x] Created `app/Casts/EncryptedFloat.php` — AES-256-CBC compatible with NodeJS crypto.ts (verified: stores `iv_hex:ciphertext_hex` format, decrypts to float on read)
- [x] Created `app/Traits/Auditable.php` — auto logs create/update/delete to audit_logs table
- [x] Created `app/Traits/ApiResponse.php` — JSON response envelope matching Next.js format
- [x] Created `app/Http/Middleware/RoleMiddleware.php` — RBAC with numeric hierarchy
- [x] Registered `role` middleware alias in `bootstrap/app.php`

### Phase 4: Eloquent Models ✅
All models created with UUIDs (`HasUuids`), `Auditable` trait, `EncryptedFloat` casts, and correct relationships:
- [x] `User` — passwordHash, role, fullName, profileImage, auditLogs relation
- [x] `AuditLog` — userId, action, details, ipAddress
- [x] `Project` — estimatedBudget cast, all relations
- [x] `Supplier` — openingBalance, currentDue casts
- [x] `Vendor` — contractAmount, paidAmount, dueAmount casts
- [x] `Employee` — monthlySalary cast, joiningDate
- [x] `Labour` — dailyWage cast, projectId FK
- [x] `Attendance` — labourId, projectId, status
- [x] `Material` — unitPrice, totalPrice casts, supplierId, projectId
- [x] `CashIn` — amount cast, projectId
- [x] `CashOut` — amount cast, all optional FKs (supplier, vendor, employee, labour, material, salary)
- [x] `Salary` — all 6 financial field casts, employeeId
- [x] `Document` — all 5 optional FKs
- [x] `ContactInquiry` — simple model
- [x] `ProjectVendor` — all 3 financial casts
- [x] `ProjectSupplier` — all 3 financial casts
- [x] `WebsiteSettings`, `WebsiteSection`, `WebsiteService`, `WebsitePortfolio`
- [x] `WebsiteTeam`, `WebsiteTrustBadge`, `WebsiteTestimonial`, `WebsiteFAQ`

### Phase 5: Seeders ✅
- [x] Updated `DatabaseSeeder.php` to seed same data as `prisma/seed.ts`:
  - 5 users (one per role), password: `Password123!`
  - 3 sample projects
  - 2 sample suppliers
  - 2 sample vendors
- [x] **Encryption verified** — `php artisan tinker` shows raw DB value as `iv_hex:ciphertext_hex` and decoded value as `5000000` ✅

---

## 🔄 IN PROGRESS

### Phase 5b: Fix Auth Provider (NEXT STEP)
The `LoginRequest` calls `Auth::attempt()` with `password` field but our User model uses `passwordHash`. Need to fix:
1. Update `config/auth.php` — change User provider to use `passwordHash` column
2. OR override `getAuthPasswordName()` in User model to return `'passwordHash'`

---

## ⏳ REMAINING TODO

### Phase 6: Controllers
Port all API business logic from `src/app/api/` to Laravel controllers under `app/Http/Controllers/`:

| Controller | Source | Priority |
|:---|:---|:---|
| `Auth/AuthController` | `src/app/api/auth/login/route.ts` | 🔴 HIGH |
| `ProjectController` | `src/app/api/projects/route.ts` | 🔴 HIGH |
| `SupplierController` | `src/app/api/suppliers/route.ts` | 🔴 HIGH |
| `VendorController` | `src/app/api/vendors/route.ts` | 🔴 HIGH |
| `EmployeeController` | `src/app/api/employees/route.ts` | 🔴 HIGH |
| `LabourController` | `src/app/api/labours/route.ts` | 🔴 HIGH |
| `MaterialController` | `src/app/api/materials/route.ts` | 🔴 HIGH |
| `AttendanceController` | `src/app/api/attendance/route.ts` | 🔴 HIGH |
| `TransactionController` (CashIn/CashOut) | `src/app/api/transactions/route.ts` | 🟡 MEDIUM |
| `SalaryController` | `src/app/api/employees/salaries/` | 🟡 MEDIUM |
| `DocumentController` | `src/app/api/documents/route.ts` | 🟡 MEDIUM |
| `UserController` | `src/app/api/users/route.ts` | 🟡 MEDIUM |
| `AuditLogController` | `src/app/api/audit-logs/route.ts` | 🟡 MEDIUM |
| `ReportController` | `src/app/dashboard/reports/` | 🟡 MEDIUM |
| `WebsiteController` (public) | `src/app/api/website/public/route.ts` | 🟢 LOW |
| `WebsiteCmsController` | `src/app/api/website/` | 🟢 LOW |
| `UploadController` | `src/app/api/upload/route.ts` | 🟢 LOW |
| `ContactController` | `src/app/api/contact/route.ts` | 🟢 LOW |

### Phase 7: Routes
- Update `routes/web.php` to add all dashboard routes grouped by auth + role middleware
- Replace Breeze's default profile routes with CPMAS routes

### Phase 8: React Frontend Porting
Port all React pages from `src/app/dashboard/*` to `resources/js/Pages/`:

| Page | Source | Notes |
|:---|:---|:---|
| `Dashboard` | `src/app/dashboard/page.tsx` | Main overview, Recharts |
| `Projects/Index` | `src/app/dashboard/projects/` | List + CRUD modals |
| `Suppliers/Index` | `src/app/dashboard/suppliers/` | List + CRUD |
| `Vendors/Index` | `src/app/dashboard/vendor/` | |
| `Employees/Index` | `src/app/dashboard/employees/` | |
| `Labours/Index` | `src/app/dashboard/materials/` | Via project |
| `Materials/Index` | `src/app/dashboard/materials/` | |
| `Attendance/Index` | `src/app/dashboard/` | |
| `Transactions/Index` | `src/app/dashboard/transactions/` | CashIn + CashOut |
| `Documents/Index` | `src/app/dashboard/documents/` | |
| `Reports/Index` | `src/app/dashboard/reports/` | Charts |
| `Users/Index` | `src/app/dashboard/users/` | SUPER_ADMIN only |
| `AuditLogs/Index` | `src/app/dashboard/audit-logs/` | |
| `Website/*` | `src/app/dashboard/website/` | CMS |
| `Auth/Login` | `src/app/login/page.tsx` | Already scaffolded by Breeze |
| Landing Page | `src/app/page.tsx` | Dynamic from DB |

**Key changes when porting React pages:**
- Replace `useGetXQuery()` RTK Query hooks → Inertia.js `usePage().props` + `router.visit()`/`router.post()`
- Replace `fetch('/api/...')` calls → Inertia `router.post/patch/delete()` calls
- Remove Redux store (RTK Query) — not needed with Inertia.js
- Remove `StoreProvider.tsx` wrapper
- Auth state from `usePage().props.auth.user` instead of `AuthContext`
- Keep all UI components in `resources/js/Components/ui/` (exact copy of `src/components/ui/`)

### Phase 9: Validation (Form Requests)
Create Laravel Form Request classes for all mutation endpoints:
- `StoreProjectRequest`, `UpdateProjectRequest`
- `StoreSupplierRequest`, etc.
- Mirror Zod schemas in `src/lib/schemas/index.ts`

### Phase 10: File Upload
- Configure `config/filesystems.php` for Supabase S3 or local disk
- Port `src/app/api/upload/route.ts` to `UploadController`

### Phase 11: Production Setup
- Configure PostgreSQL in `.env` (match Supabase connection string)
- Set `ENCRYPTION_KEY` same as original project's `.env`
- Run `php artisan migrate --seed` on production

---

## 🔑 Critical Config Values to Copy

From original `.env` to `cpmas-laravel/.env`:
```
DATABASE_URL=<same PostgreSQL connection string>
ENCRYPTION_KEY=<same key — MUST be identical for DB compatibility>
```

---

## 🧪 Tests Run So Far

| Test | Result |
|:---|:---|
| `php artisan migrate:fresh --seed` | ✅ All 4 migrations pass |
| Tinker: `Project::first()->estimatedBudget` | ✅ Returns `5000000` (decrypted float) |
| Tinker: `getRawOriginal('estimatedBudget')` | ✅ Returns `iv:ciphertext` hex format |
| npm install | ✅ 304 packages, 0 vulnerabilities |

---

## 📋 Original Next.js API Patterns to Replicate

Every Next.js API route follows this pattern:
1. `getCurrentUser()` → return 401 if null
2. `hasRole()` check → return 403 if insufficient
3. Validate input manually (check required fields)
4. Write `auditLog` entry on mutations
5. Use `getPaginationParams` on list endpoints
6. Return `apiSuccess` / `apiCreated` / `apiPaginated` / `apiError`

In Laravel, this maps to:
1. `middleware('auth')` on route → automatically handles 401
2. `middleware('role:SUPER_ADMIN')` on route
3. Laravel Form Request validation
4. `Auditable` trait handles audit logs automatically on model events
5. Use `getPaginationParams()` pattern in controller
6. `ApiResponse` trait methods in controller

---

> **Last Updated:** 2026-07-09 23:20 (BDT)
> **Next Step:** Fix auth password column mapping, then start Phase 6 (Controllers)
