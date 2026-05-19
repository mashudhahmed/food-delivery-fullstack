<div align="center">

<img src="frontend/public/logo.png" alt="QuickBite Logo" width="80" />

# QuickBite

**A full-stack food delivery platform — restaurant discovery, order management, real-time tracking, and multi-role dashboards**

[![Frontend](https://img.shields.io/badge/Frontend-Next.js%2014-000000?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Backend](https://img.shields.io/badge/Backend-NestJS%2011-E0234E?style=flat-square&logo=nestjs)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16.x-4169E1?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.x-010101?style=flat-square&logo=socket.io)](https://socket.io/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

[Features](#features) · [Architecture](#architecture) · [Quick Start](#quick-start) · [API Reference](#api-reference) · [Screenshots](#screenshots)

</div>

---

## Overview

QuickBite is a monorepo containing a complete food delivery system. The **frontend** is a Next.js 14 App Router application. The **backend** is a NestJS REST API backed by PostgreSQL. Together they support four distinct user roles — customer, restaurant owner, delivery agent, and admin — with real-time order updates via Socket.IO and transactional email at every lifecycle event.

---

## Repository Structure

```text
quickbite/
├── frontend/          # Next.js 14 customer & dashboard UI
├── backend/           # NestJS REST API
└── README.md          # ← you are here
```

---

## Features

| Area | Highlights |
|---|---|
| **Auth** | JWT + bcrypt, multi-role (customer / owner / agent / admin), password reset flow |
| **Restaurants** | Search, filter by cuisine / price / rating / open status, owner CRUD |
| **Menu** | Per-restaurant menus, availability toggles, image uploads |
| **Orders** | Full lifecycle: place → prepare → ready → picked up → delivered / cancelled |
| **Delivery** | Agent portal — accept deliveries, update status, earnings tracking |
| **Reviews** | Gated behind verified delivered orders |
| **Real-time** | Socket.IO notifications with HTTP polling fallback |
| **Email** | 10 Handlebars templates via Nodemailer (order events, approvals, earnings) |
| **Maps** | Leaflet + OpenStreetMap for interactive address selection |
| **Admin** | Analytics dashboard, user management, restaurant approval, CSV export |
| **API Docs** | Swagger UI at `/api-docs` |

---

## Architecture

```text
┌─────────────────────────────┐       HTTP / WS       ┌──────────────────────────────┐
│        Frontend             │  ◄─────────────────►  │         Backend              │
│  Next.js 14 · TypeScript    │                       │  NestJS 11 · TypeScript      │
│  Tailwind · Zustand         │                       │  TypeORM · Passport JWT      │
│  Leaflet · Socket.IO Client │                       │  Socket.IO · Nodemailer      │
└─────────────────────────────┘                       └──────────────┬───────────────┘
                                                                     │
                                                              ┌──────▼──────┐
                                                              │  PostgreSQL │
                                                              │     16.x    │
                                                              └─────────────┘
```

### Frontend Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3 |
| State | Zustand 4 (with persistence) |
| Maps | Leaflet + React-Leaflet |
| Real-time | Socket.IO Client |
| HTTP | Axios (with JWT interceptors) |
| Charts | Recharts |
| Icons | Lucide React |

### Backend Tech Stack

| Layer | Technology |
|---|---|
| Framework | NestJS 11 |
| Language | TypeScript 5 |
| Database | PostgreSQL 16 |
| ORM | TypeORM 0.3 |
| Auth | Passport.js + JWT |
| Validation | class-validator |
| Email | Nodemailer + Handlebars |
| WebSocket | Socket.IO |
| File Uploads | Multer |
| API Docs | Swagger / OpenAPI 3 |
| Testing | Jest |

---

## Quick Start

### Prerequisites

```bash
Node.js >= 18.x
npm >= 9.x
PostgreSQL >= 14.x
```

### 1 — Clone

```bash
git clone https://github.com/your-org/quickbite.git
cd quickbite
```

### 2 — Backend

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env — see Environment Variables (Backend) below

# Start dev server  (default: http://localhost:3001)
npm run start:dev
```

### 3 — Frontend

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local — see Environment Variables (Frontend) below

# Start dev server  (default: http://localhost:3000)
npm run dev
```

### 4 — Verify

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001/api |
| Swagger UI | http://localhost:3001/api-docs |

---

## Environment Variables

### Backend — `.env`

```env
# Application
PORT=3001
NODE_ENV=development
API_URL=http://localhost:3001

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=quickbite

# JWT
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRES_IN=7d

# Email (SMTP)
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=587
MAIL_USER=your_smtp_user
MAIL_PASSWORD=your_smtp_password
MAIL_FROM=noreply@quickbite.com

# Frontend
FRONTEND_URL=http://localhost:3000

# WebSocket
WS_PORT=3002
```

### Frontend — `.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api

# Optional
NEXT_PUBLIC_GOOGLE_MAPS_KEY=
NEXT_PUBLIC_GA_ID=
```

---

## User Roles

| Role | Description | Key Routes |
|---|---|---|
| **Customer** | Browse restaurants, place and track orders | `/`, `/cart`, `/checkout`, `/orders`, `/favorites` |
| **Owner** | Manage restaurants, menus, and incoming orders | `/owner/dashboard`, `/owner/orders` |
| **Agent** | Accept and complete deliveries, track earnings | `/agent/dashboard`, `/agent/deliveries` |
| **Admin** | Full platform access, approvals, analytics | `/admin/dashboard`, `/admin/users` |

---

## Order Status Flow

```
PENDING ──► PREPARING ──► READY ──► PICKED_UP ──► DELIVERED
   │
   └──────────────────────────────────────────────► CANCELLED
```

| Status | Set By |
|---|---|
| `pending` | System (on order placement) |
| `preparing` | Owner, Admin |
| `ready` | Owner, Admin |
| `picked_up` | Agent |
| `delivered` | Agent |
| `cancelled` | Customer (from `pending` only), Admin |

---

## API Reference

Base URL: `http://localhost:3001/api`

Full interactive docs available at **`/api-docs`** (Swagger UI).

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | — | Register new user |
| POST | `/auth/login` | — | Login, returns JWT |
| POST | `/auth/forgot-password` | — | Request password reset |
| POST | `/auth/reset-password` | — | Reset password |
| GET | `/auth/me` | ✓ | Current user profile |

### Restaurants

| Method | Endpoint | Auth | Roles | Description |
|---|---|---|---|---|
| POST | `/restaurants` | ✓ | owner, admin | Create restaurant |
| GET | `/restaurants` | — | — | List / search restaurants |
| GET | `/restaurants/:id` | — | — | Restaurant details |
| PATCH | `/restaurants/:id` | ✓ | owner, admin | Update restaurant |
| DELETE | `/restaurants/:id` | ✓ | admin | Delete restaurant |

### Menu Categories

| Method | Endpoint | Auth | Roles | Description |
|---|---|---|---|---|
| POST | `/restaurants/:id/categories` | ✓ | owner, admin | Add food category (e.g. Burgers, Drinks) |
| GET | `/restaurants/:id/categories` | — | — | List categories for a restaurant |

### Menu Items

| Method | Endpoint | Auth | Roles | Description |
|---|---|---|---|---|
| POST | `/menu/restaurant/:restaurantId` | ✓ | owner, admin | Add menu item |
| GET | `/menu/restaurant/:restaurantId` | — | — | Get menu |
| GET | `/menu/:id` | — | — | Get menu item |
| PATCH | `/menu/:id` | ✓ | owner, admin | Update menu item |
| DELETE | `/menu/:id` | ✓ | owner, admin | Delete menu item |

### Orders

| Method | Endpoint | Auth | Roles | Description |
|---|---|---|---|---|
| POST | `/orders` | ✓ | any | Place order |
| GET | `/orders/my` | ✓ | any | My orders |
| GET | `/orders/my-restaurant` | ✓ | owner | Restaurant orders |
| GET | `/orders/:id` | ✓ | any | Order details |
| PATCH | `/orders/:id/status` | ✓ | owner, admin | Update status |
| PATCH | `/orders/:id/assign` | ✓ | admin | Assign agent |
| PATCH | `/orders/:id/delivery` | ✓ | agent | Delivery update |
| DELETE | `/orders/:id` | ✓ | customer, admin | Cancel order |

### Admin

| Method | Endpoint | Description |
|---|---|---|
| GET | `/admin/dashboard/stats` | Dashboard metrics |
| GET | `/admin/users` | List users |
| PATCH | `/admin/users/:userId/status` | Update user status |
| GET | `/admin/pending-approvals` | Pending owner/agent applications |
| PATCH | `/admin/approve/:userId` | Approve user |
| GET | `/admin/restaurants` | All restaurants |
| GET | `/admin/orders` | All orders |
| GET | `/admin/charts/revenue` | Revenue chart data |
| GET | `/admin/export/:type` | CSV export |
| GET | `/admin/activity` | Activity feed |

### Other Endpoints

| Resource | Endpoint |
|---|---|
| Reviews | `POST /reviews`, `GET /reviews/restaurant/:id` |
| Favorites | `GET /favorites`, `POST /favorites`, `DELETE /favorites/:restaurantId` |
| Notifications | `GET /notifications`, `PATCH /notifications/:id/read` |
| Uploads | `POST /uploads/restaurant`, `POST /uploads/menu-item` |

---

## Real-time Notifications

The backend broadcasts over Socket.IO at `ws://localhost:3002/notifications`.

```javascript
const socket = io('http://localhost:3002/notifications', {
  query: { userId: 'user-uuid' }
});

socket.on('notification', ({ type, title, message }) => {
  console.log(type, title, message);
});
```

| Event | Recipient | Trigger |
|---|---|---|
| `order_new` | Owner | New order placed |
| `order_status` | Customer | Order status changed |
| `order_available` | All agents | Order ready for pickup |
| `agent_assigned` | Customer + Agent | Agent assigned to order |
| `earnings_added` | Agent | Delivery earnings credited |

---

## Email Notifications

### Mailer Setup

The backend uses **`@nestjs-modules/mailer`** with **Nodemailer** and **Handlebars** as the template engine.

**Module structure:**

```text
backend/src/mail/
├── mail.module.ts         # Registers MailerModule with SMTP config from .env
├── mail.service.ts        # Injectable MailService — one method per email type
└── templates/
    ├── order-confirmation.hbs
    ├── order-status-update.hbs
    ├── order-delivered.hbs
    ├── new-order-owner.hbs
    ├── new-order-available-agent.hbs
    ├── earnings-added-agent.hbs
    ├── application-approved.hbs
    ├── application-rejected.hbs
    ├── password-reset.hbs
    └── review-notification.hbs
```

**SMTP configuration** (in `.env`):

```env
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=587
MAIL_USER=your_mailtrap_username
MAIL_PASSWORD=your_mailtrap_password
MAIL_FROM=noreply@quickbite.com
```

Use [Mailtrap](https://mailtrap.io) or [Ethereal](https://ethereal.email) for development; replace with a real SMTP provider (e.g. SendGrid, Gmail app password) for production.

### Triggered Emails

| # | Event | Recipient | Trigger |
|---|---|---|---|
| 1 | Order Confirmed | Customer | Order successfully placed |
| 2 | Order Status Update | Customer | Status changes to `preparing`, `ready`, or `on_the_way` |
| 3 | Order Delivered | Customer | Agent marks order `delivered` |
| 4 | New Order Received | Restaurant Owner | New order placed at their restaurant |
| 5 | Order Ready for Pickup | All Agents | Order status reaches `ready` |
| 6 | Earnings Added | Delivery Agent | Delivery completed, earnings credited |
| 7 | Account Approved | Owner / Agent | Admin approves application |
| 8 | Account Rejected | Owner / Agent | Admin rejects application |
| 9 | Password Reset | User | Password reset requested |
| 10 | New Review Posted | Restaurant Owner | Customer submits a review |

### Email Evidence

Screenshots captured from Mailtrap demonstrating all triggered emails:

| # | Email Type | Recipient | Screenshot |
|---|---|---|---|
| 1 | Order Confirmation | Customer | <img width="959" height="473" alt="Order Confirmation Email" src="https://github.com/user-attachments/assets/13bae20e-9543-49ef-8e59-110bd2ffad74" /> |
| 2 | Order Status Update | Customer | <img width="959" height="473" alt="Order Status Update Email" src="https://github.com/user-attachments/assets/845c92c4-a524-4794-a991-c6abbcab19e3" /> |
| 3 | Order Delivered | Customer | <img width="959" height="473" alt="image" src="https://github.com/user-attachments/assets/2367aa70-d4b4-4665-9a32-8a11dbbb475e" /> |

> Additional templates (password reset, account approval/rejection, earnings, order availability) are implemented. See `/backend/src/mail/templates/` for all 10 Handlebars templates.

---

## Database Schema

### Entity Relationship Overview

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                    users                                         │
│  id · fullName · email · passwordHash · phone · role · status                    │
└──────┬──────────────────┬──────────────────────────────────┬─────────────────────┘
       │ 1                │ 1                                │ 1
       │ owner            │ customer                         │ agent
       │                  │                                  │
       ▼ N                ▼ N                                ▼ N
┌─────────────┐    ┌──────────────────────────────────────────────────────────────┐
│ restaurants │    │                        orders                                │
│  id         │◄───│  id · customerId · restaurantId · agentId                    │
│  name       │ N  │  status · totalAmount · deliveryAddress · placedAt           │
│  address    │    └──────────────────────┬───────────────────────────────────────┘
│  cuisineType│                           │ 1
│  isOpen     │                           │
│  rating     │                           ▼ N
│  ownerId    │              ┌─────────────────────────── ─┐
└──────┬──────┘              │         order_items         │
       │ 1                   │  id · orderId · menuItemId  │
       │                     │  quantity · unitPrice       │
       ▼ N                   └──────────────┬──────────────┘
┌─────────────┐                             │ N
│ menu_items  │◄────────────────────────────┘
│ id          │ 1     (Many-to-Many via join entity)
│ name        │
│ price       │
│ category    │
│ isAvailable │
│ restaurantId| 
└─────────────┘

restaurants 1 ──► N  reviews  ◄── N  orders
                       id · customerId · restaurantId · orderId · rating · comment

users 1 ──► N  favorites      id · userId · restaurantId · restaurantName
users 1 ──► N  notifications  id · userId · type · title · message · read
```

### Relationship Summary

| Relationship | Type | Description |
|---|---|---|
| User → Restaurants | One-to-Many | One owner manages many restaurants |
| User → Orders (customer) | One-to-Many | One customer places many orders |
| User → Orders (agent) | One-to-Many | One agent handles many deliveries |
| Restaurant → MenuItems | One-to-Many | One restaurant has many menu items |
| Restaurant → Reviews | One-to-Many | One restaurant receives many reviews |
| Order → OrderItems | One-to-Many | One order contains many line items |
| MenuItem ↔ Order | Many-to-Many | Implemented via `order_items` join entity with `quantity` and `unitPrice` |

---

## Error Codes

| Status | Code | Description |
|---|---|---|
| 400 | `INVALID_INPUT` | Validation failed |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Insufficient role/permission |
| 404 | `NOT_FOUND` | Resource does not exist |
| 409 | `ORDER_NOT_CANCELLABLE` | Order beyond cancellable status |
| 409 | `DUPLICATE_FAVORITE` | Restaurant already in favorites |
| 422 | `INVALID_STATUS_TRANSITION` | Illegal order status change |
| 429 | `TOO_MANY_REQUESTS` | Rate limit exceeded (10 req/min) |
| 500 | `INTERNAL_SERVER_ERROR` | Unexpected server error |

---

## Project Structure

```text
quickbite/
│
├── frontend/
│   ├── app/                    # Next.js App Router pages
│   │   ├── admin/              # Admin dashboard
│   │   ├── agent/              # Agent portal
│   │   ├── owner/              # Owner portal
│   │   ├── cart/
│   │   ├── checkout/
│   │   ├── favorites/
│   │   ├── notifications/
│   │   ├── orders/
│   │   ├── restaurants/
│   │   └── settings/
│   ├── components/             # Shared UI components
│   ├── lib/                    # API client, auth, websocket
│   ├── stores/                 # Zustand state stores
│   ├── hooks/
│   └── types/
│
└── backend/
    └── src/
        ├── auth/               # JWT guards, strategies
        ├── admin/              # Admin module
        ├── restaurants/
        ├── menu/
        ├── orders/
        ├── reviews/
        ├── favorites/
        ├── notifications/      # Socket.IO gateway
        ├── mail/               # Handlebars email templates
        ├── uploads/            # Multer file handling
        └── common/             # Shared decorators/pipes
```

---

## Available Scripts

### Backend

```bash
npm run start:dev      # Development with watch
npm run build          # Compile TypeScript
npm run start:prod     # Production
npm run test           # Unit tests
npm run test:cov       # Coverage report
npm run test:e2e       # End-to-end tests
```

### Frontend

```bash
npm run dev            # Development server
npm run build          # Production build
npm start              # Serve production build
npm run type-check     # TypeScript validation
npm run lint           # ESLint
npm run format         # Prettier
```

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `API connection failed` | Confirm backend is running on port 3001 |
| `WebSocket connection error` | Check `WS_PORT` in backend `.env` |
| `Cart not persisting` | Clear browser `localStorage` |
| `Location permission denied` | Enable location access in browser settings |
| `Build errors` | Run `npm run type-check` in the affected workspace |
| `Email not sending` | Verify SMTP credentials in backend `.env` |
| Blank page after login | Check `NEXT_PUBLIC_API_URL` in frontend `.env.local` |

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit using the convention below
4. Push and open a Pull Request

### Commit Convention

```
feat:      new feature
fix:       bug fix
docs:      documentation only
refactor:  code restructuring without behaviour change
test:      add or update tests
chore:     build process or tooling changes
```

---

## License

MIT License © QuickBite
