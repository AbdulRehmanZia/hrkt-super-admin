# hrkt — Super Admin Panel

Internal management dashboard for **hrkt** (SaaS platform for sports facilities like padel, futsal, cricket, tennis). Allows internal operators to onboard facilities, monitor platform-wide metrics, view tenant analytics, manage subscriptions, inspect audit trails, and export facility directory reports.

## Tech Stack
- **Backend**: NestJS, TypeScript, MongoDB (Mongoose), `@nestjs/config`, `class-validator`
- **Frontend**: React 18, TypeScript, Vite, Ant Design (`antd`), `react-router-dom`
- **Infrastructure**: Docker Compose (MongoDB 7)

## Prerequisites
- Node.js (v18+)
- Docker & Docker Compose

## Quick Start (Local Development)

### 1. Start MongoDB
```bash
docker compose up -d
```

### 2. Run Backend
```bash
cd backend
cp .env.example .env
npm install
npm run seed # Populates 10 facilities, 350+ active customers, and 500+ realistic bookings over 6 months
npm run start:dev
```
The NestJS API will run on `http://localhost:3000`.

### 3. Run Frontend
```bash
cd frontend
npm install
npm run dev
```
The React app will run on `http://localhost:5173`.

## Login Credentials

Use the following seeded credentials to sign in to the Super Admin panel:

- **Email**: `admin@hrkt.io`
- **Password**: `password123`

## Requirements Completed

### P0 Requirements
- [x] **Authentication (4.1)**: Super admin login (no public signup), deep-link redirection preserving destination target post-login, and session persistence across browser reloads.
- [x] **Facilities List Directory (4.2)**: Table of all facilities with required columns (Name, Status, Courts ratio `used / limit`, Active Customers, Lifetime Bookings, Last Booking Date formatted cleanly with `"No bookings yet"` zero-booking handling, Subscription badge, Actions). Includes search by name/city, filters by status and subscription status, server-side pagination, and server-side aggregation sorting (`lifetimeBookings`, `lastBookingDate`, `revenue`, `name`).
- [x] **Facility Creation & Editing (4.3)**: Unified onboarding flow (creates facility + first admin user + initial trial subscription + initial invoice). Platform-wide email uniqueness validation with clean collision handling. Form reused for editing facility general info with admin credentials separated.
- [x] **Facility Detail Screen (4.4)**: Overview section (active customers, court limit comparison, users grouped by role, total bookings, 30-day bookings & revenue), Bookings breakdown by payment type (counts & revenue PKR), Bookings breakdown by source channel (web/portal/bot counts & revenue PKR), Discounts breakdown (configured discounts, active/inactive status, types, redemption counts), and Booking rules configuration display.
- [x] **Platform Dashboard (4.5)**: Active, total, and suspended facility counts, platform 6-month revenue trend, booking-rule adoption rates (e.g., "5 of 10 active facilities"), discount-type adoption across platform, booking channel distribution, and platform-wide payment status breakdown (`fully_paid`, `partially_paid`, `unpaid` counts and revenue PKR). Zero hardcoded static numbers.

### P1 & P2 Requirements
- [x] **Facility Controls (4.6)**: Court limit change blocked client & server-side if set below currently active courts, Facility admin credentials reset with confirmation modal and immutable Audit Log entry (`performedBy`, timestamp), Facility suspension/reactivation toggle.
- [x] **Billing & Invoices (4.7)**: Monthly payment calculator drawer implementing formula `amount_due = base_fee + (active_courts * per_court_fee) + (completed_bookings_in_month * per_booking_fee)` (filtering strictly by `completed` bookings), payment reminder rate-limited to 24 hours (`lastReminderSentAt`) with UI cooldown countdown timer & audit logging, mark invoice as paid.
- [x] **Audit Log Trail (P2)**: Dedicated "Audit Log" sidebar page and `GET /audit-logs` endpoint allowing super admins to inspect system-wide administrative action logs sorted most recent first with search and action filtering.
- [x] **CSV Export (P2)**: Instant downloadable CSV export button on Facilities Directory page exporting all table columns for the currently filtered/active facility directory.
- [x] **Custom Date-Range Filtering (P2)**: Date-range picker on Facility Detail page allowing operators to filter revenue and booking statistics by custom date windows.
- [x] **Automated Jest Unit Tests**: Focused unit test suites (`npm run test`) verifying billing calculator formulas, completed-status filters, zero-booking edge cases, booking-rule adoption percentages, and directory aggregation pipelines.

### Seed Data & Non-Functional Requirements (Section 5)
- [x] Seed script populating 10 facilities, 350+ customers, 500+ bookings over 6 months (including 0-booking edge-case facility "Urban Futsal Park").
- [x] DB-level aggregation pipelines ($group, $count, $cond) avoiding Node.js memory bloat.
- [x] Explicit UTC timestamp storage in MongoDB and local `Asia/Karachi` (`en-PK`) date formatting on the frontend.

## Skipped / Not Implemented

- **Date-Range Filtering on Platform Dashboard**: Skipped due to time constraints, prioritizing P0/P1 metrics correctness and fixed 30-day/6-month platform aggregation windows (Facility Detail screen date filtering fully implemented).
- **Impersonate / "View As" Facility Admin**: Skipped as the assessment focuses strictly on the super admin management panel; facility-facing back office was out of scope.

## Assumptions Made

- **Revenue Definition Consistency**: The revenue metric labeled **"Lifetime Revenue (PKR)"** across the Facilities Directory list table, CSV export file, and Facility Detail summary card explicitly represents **Lifetime Revenue** (the sum of `amountPaid` across all historical bookings for that facility).
- **Billing Rate Configuration**: `per_court_fee` (PKR 1,500) and `per_booking_fee` (PKR 50) are configured as global platform billing rates in `billing.config.ts`, while `monthlyBaseFee` is tied to the selected subscription plan (`starter`: 10k PKR, `pro`: 15k PKR, `enterprise`: 25k PKR).
- **Active Customer Definition**: Defined explicitly as `customer.status === 'active'`. Inactive or archived customer profiles are excluded from tenant metrics and dashboard aggregation queries.
- **Timezone Strategy**: All timestamps (`createdAt`, `startTime`, `dueDate`, `lastReminderSentAt`) are stored strictly in **UTC** in MongoDB and formatted in local `Asia/Karachi` (`en-PK`) format on the frontend.
- **Completed Booking Status for Dues**: Per-booking fee calculation includes strictly bookings with `status: 'completed'`.

## What I'd Do With 2 More Days

- **Platform Dashboard Date-Range Picker**: Add a custom date-range picker on the Platform Dashboard for multi-period platform-wide revenue analysis.
- **Admin Impersonation**: Build a secure JWT impersonation token switcher allowing super admins to view the platform from any facility admin's perspective for debugging.
- **Granular Notifications**: Implement real-time WebSockets for overdue platform invoice alerts and automated email notifications for payment reminders.
