# hrkt — Super Admin Panel

Internal management dashboard for **hrkt** (SaaS platform for sports facilities like padel, futsal, cricket, tennis). Allows internal operators to onboard facilities, monitor platform-wide metrics, view tenant analytics, and manage subscriptions.

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

## Multi-Tenant Isolation
All facility-owned entities (`User`, `Court`, `Customer`, `Booking`, `Discount`, `BookingRule`, `Subscription`, `Invoice`) maintain an indexed `facilityId` field to enforce strict tenant scoping and prevent cross-facility data leaks.
