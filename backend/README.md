<div align="center">

# 🍔 QuickBite — Food Delivery API

**A production-ready RESTful backend for food ordering, restaurant management, and delivery tracking**

[![NestJS](https://img.shields.io/badge/NestJS-11.x-E0234E?style=flat-square&logo=nestjs)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16.x-336791?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![TypeORM](https://img.shields.io/badge/TypeORM-0.3.x-FE0803?style=flat-square)](https://typeorm.io/)
[![Swagger](https://img.shields.io/badge/Swagger-OpenAPI_3-85EA2D?style=flat-square&logo=swagger)](https://swagger.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

[Features](#-features) · [Architecture](#-architecture) · [Getting Started](#-getting-started) · [API Reference](#-api-reference) · [Environment Variables](#-environment-variables) · [Contributing](#-contributing)

</div>

---

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Setup](#environment-setup)
  - [Running the App](#running-the-app)
- [API Reference](#-api-reference)
  - [Authentication](#authentication-auth)
  - [Restaurants](#restaurants-restaurants)
  - [Menu](#menu-restaurantsrestaurantidmenu)
  - [Orders](#orders-orders)
  - [Reviews](#reviews-reviews)
- [Roles & Permissions](#-roles--permissions)
- [Database Schema](#-database-schema)
- [Email Notifications](#-email-notifications)
- [Environment Variables](#-environment-variables)
- [Known Issues & Improvements](#-known-issues--improvements)
- [Contributing](#-contributing)

---

## ✨ Features

- 🔐 **JWT Authentication** — Secure stateless auth with bcrypt password hashing
- 🏪 **Restaurant Management** — Full CRUD with owner-level access control
- 📋 **Dynamic Menu System** — Per-restaurant menus with availability toggles
- 🛒 **Order Lifecycle** — End-to-end order flow: place → prepare → pickup → deliver
- 🚚 **Delivery Agent Workflow** — Agent assignment and delivery status tracking
- ⭐ **Verified Reviews** — Review gating behind delivered-order verification
- 📧 **Transactional Emails** — Nodemailer-powered notifications at every order stage
- 🛡️ **Rate Limiting** — Throttler guard (10 req/min per IP) out of the box
- 📖 **Swagger UI** — Interactive API documentation at `/api`
- ✅ **Input Validation** — Global `ValidationPipe` with whitelist and transform

---

## 🏗️ Architecture

```
src/
├── auth/                   # JWT auth, guards, strategy, DTOs
│   ├── dto/
│   ├── guards/             # JwtAuthGuard, RolesGuard
│   └── strategies/         # passport-jwt strategy
├── common/
│   └── decorators/         # @Roles() decorator
├── delivery/               # Delivery entity & module
├── mail/                   # Nodemailer transactional emails
├── menu/                   # Menu item CRUD (nested under restaurants)
├── orders/                 # Order lifecycle management
├── restaurants/            # Restaurant CRUD + rating sync
├── reviews/                # Verified post-delivery reviews
├── users/                  # User entity & module
├── app.module.ts           # Root module — wires everything together
└── main.ts                 # Bootstrap: Swagger, CORS, ValidationPipe
```

### Request Flow

```
Client → [Rate Limiter] → [JwtAuthGuard] → [RolesGuard] → Controller → Service → TypeORM → PostgreSQL
                                                                              ↓
                                                                       MailService (async)
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | NestJS 11 |
| Language | TypeScript 5 |
| Database | PostgreSQL 16 |
| ORM | TypeORM 0.3 |
| Auth | Passport.js + JWT |
| Validation | class-validator + class-transformer |
| Email | Nodemailer |
| API Docs | Swagger / OpenAPI 3 |
| Rate Limiting | @nestjs/throttler |
| Testing | Jest + Supertest |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x
- **PostgreSQL** ≥ 14

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/quickbite-api.git
cd quickbite-api

# Install dependencies
npm install
```

### Environment Setup

Create a `.env` file in the project root (see [Environment Variables](#-environment-variables) for the full reference):

```bash
cp .env.example .env
# Fill in the required values
```

### Running the App

```bash
# Development (watch mode)
npm run start:dev

# Production build
npm run build
npm run start:prod

# Run unit tests
npm run test

# Run test coverage
npm run test:cov
```

The server starts at `http://localhost:3000` by default.  
Swagger UI is available at **`http://localhost:3000/api`**.

---

## 📡 API Reference

All protected endpoints require the `Authorization: Bearer <token>` header.

### Authentication (`/auth`)

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| `POST` | `/auth/register` | ❌ | — | Register a new user |
| `POST` | `/auth/login` | ❌ | — | Login and receive a JWT |
| `GET` | `/auth/me` | ✅ | Any | Get current user profile |

#### `POST /auth/register`
```json
{
  "fullName": "Jane Doe",
  "email": "jane@example.com",
  "password": "secret123",
  "phone": "+1234567890",
  "address": "123 Main St",    // optional
  "role": "customer"           // optional: customer | owner | agent | admin
}
```

**Response `201`**
```json
{
  "message": "User registered successfully",
  "user": { "id": "uuid", "fullName": "Jane Doe", "email": "...", "role": "customer", ... },
  "token": "<jwt>"
}
```

#### `POST /auth/login`
```json
{
  "email": "jane@example.com",
  "password": "secret123"
}
```

**Response `200`**
```json
{
  "message": "Login successful",
  "user": { ... },
  "token": "<jwt>"
}
```

---

### Restaurants (`/restaurants`)

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| `POST` | `/restaurants` | ✅ | owner, admin | Create a restaurant |
| `GET` | `/restaurants` | ❌ | — | List all restaurants (filterable) |
| `GET` | `/restaurants/:id` | ❌ | — | Get restaurant with menu & reviews |
| `PATCH` | `/restaurants/:id` | ✅ | owner (own), admin | Update restaurant |
| `DELETE` | `/restaurants/:id` | ✅ | admin | Delete restaurant |

**Query Params for `GET /restaurants`:**

| Param | Type | Example |
|-------|------|---------|
| `cuisineType` | string | `?cuisineType=Italian` |
| `isOpen` | boolean | `?isOpen=true` |

#### `POST /restaurants` body:
```json
{
  "name": "Mario's Pizza",
  "description": "Authentic Neapolitan pizza",
  "address": "456 Oak Ave",
  "phone": "+1987654321",
  "cuisineType": "Italian",
  "isOpen": true             // optional, defaults to true
}
```

---

### Menu (`/restaurants/:restaurantId/menu`)

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| `POST` | `/restaurants/:id/menu` | ✅ | owner (own restaurant), admin | Add menu item |
| `GET` | `/restaurants/:id/menu` | ❌ | — | Get all menu items |
| `GET` | `/restaurants/:id/menu/:itemId` | ❌ | — | Get single menu item |
| `PATCH` | `/restaurants/:id/menu/:itemId` | ✅ | owner (own restaurant), admin | Update menu item |
| `DELETE` | `/restaurants/:id/menu/:itemId` | ✅ | owner (own restaurant), admin | Delete menu item |

#### `POST /restaurants/:restaurantId/menu` body:
```json
{
  "name": "Margherita Pizza",
  "description": "Classic tomato and mozzarella",
  "price": 12.99,
  "category": "Pizza",
  "isAvailable": true        // optional, defaults to true
}
```

---

### Orders (`/orders`)

> All order endpoints require authentication.

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| `POST` | `/orders` | ✅ | Any | Place a new order |
| `GET` | `/orders/my` | ✅ | Any | Get current user's orders |
| `GET` | `/orders/:id` | ✅ | Any | Get order details |
| `PATCH` | `/orders/:id/status` | ✅ | owner, admin | Update order status |
| `PATCH` | `/orders/:id/assign` | ✅ | admin | Assign delivery agent |
| `PATCH` | `/orders/:id/delivery` | ✅ | agent | Update delivery status |
| `DELETE` | `/orders/:id` | ✅ | customer (own), admin | Cancel order |

#### Order Status Flow

```
PENDING → PREPARING → READY → PICKED_UP → DELIVERED
    └──────────────────────────────────────→ CANCELLED
```

| Status | Who can set |
|--------|-------------|
| `pending` | System (on creation) |
| `preparing` | owner, admin |
| `ready` | owner, admin |
| `picked_up` | agent (assigned to order) |
| `delivered` | agent (assigned to order) |
| `cancelled` | customer (own + only from `pending`), admin |

#### `POST /orders` body:
```json
{
  "restaurantId": "uuid",
  "deliveryAddress": "789 Elm Street",
  "items": [
    { "menuItemId": "uuid", "quantity": 2 },
    { "menuItemId": "uuid", "quantity": 1 }
  ]
}
```

**Validations on order creation:**
- Restaurant must be open
- All menu items must be available and belong to the specified restaurant
- Total amount is calculated server-side (not trusted from client)

---

### Reviews (`/reviews`)

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| `POST` | `/reviews` | ✅ | customer | Create a review |
| `GET` | `/reviews/restaurant/:restaurantId` | ❌ | — | Get reviews for a restaurant |

#### `POST /reviews` body:
```json
{
  "orderId": "uuid",
  "rating": 5,
  "comment": "Amazing food, very fast delivery!"
}
```

**Review Guards:**
- You can only review **your own** orders
- The order must be in **`DELIVERED`** status
- One review per order (duplicate prevention)
- Posting a review auto-updates the restaurant's aggregate rating

---

## 🔑 Roles & Permissions

| Role | Capabilities |
|------|-------------|
| `customer` | Browse restaurants/menu, place orders, cancel pending orders, write reviews |
| `owner` | All customer capabilities + create/manage their restaurant(s) and menus, update order status for their restaurant's orders |
| `agent` | Update delivery status (`picked_up`, `delivered`) for assigned orders |
| `admin` | Full access across all resources; assign delivery agents; delete restaurants |

---

## 🗄️ Database Schema

```
users
  id (uuid PK) | fullName | email (unique) | phone | address | role | passwordHash | createdAt | updatedAt

restaurants
  id (uuid PK) | name | description | address | phone | cuisineType | isOpen | rating | imageUrl | ownerId (FK→users) | createdAt | updatedAt

menu_items
  id (uuid PK) | name | description | price | imageUrl | isAvailable | category | restaurantId (FK→restaurants) | createdAt | updatedAt

orders
  id (uuid PK) | customerId (FK→users) | restaurantId (FK→restaurants) | agentId (FK→users, nullable) | status | totalAmount | deliveryAddress | placedAt | updatedAt

order_items
  id (uuid PK) | orderId (FK→orders) | menuItemId (FK→menu_items) | quantity | unitPrice

reviews
  id (uuid PK) | customerId (FK→users) | restaurantId (FK→restaurants) | orderId (FK→orders) | rating | comment | createdAt

deliveries
  id (uuid PK) | orderId (FK→orders) | agentId (FK→users) | status | pickupTime | deliveryTime | createdAt | updatedAt
```

---

## 📧 Email Notifications

The `MailService` (Nodemailer) sends transactional emails at the following events:

| Event | Trigger | Recipient |
|-------|---------|-----------|
| Order Confirmed | New order placed | Customer |
| Order Status Update | Status changed to `preparing`, `ready`, `picked_up` | Customer |
| Order Delivered | Status changed to `delivered` | Customer |
| New Review | Customer submits a review | Restaurant Owner |

---

## ⚙️ Environment Variables

Create a `.env` file in the project root:

```env
# Application
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=quickbite

# JWT
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRES_IN=7d

# Mail (SMTP)
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=587
MAIL_USER=your_smtp_user
MAIL_PASSWORD=your_smtp_password
MAIL_FROM=noreply@quickbite.com
```

> ⚠️ **Never commit `.env` to version control.** Add it to `.gitignore`.

---

## ⚠️ Known Issues & Suggested Improvements

The following issues were identified during code review. They do not break the application under normal usage, but should be addressed before going to production.

### 🔴 High Priority

1. **`synchronize: true` in production** (`app.module.ts`)  
   TypeORM's `synchronize: true` auto-modifies the database schema on every start. In production, this risks data loss. Replace with TypeORM migrations.
   ```typescript
   // app.module.ts — change to:
   synchronize: false,
   migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
   migrationsRun: true,
   ```

2. **Missing `@Roles()` decorator on `PATCH /restaurants/:id`** (`restaurants.controller.ts`)  
   The update route uses `RolesGuard` but has no `@Roles()` decorator, meaning any authenticated user can attempt an update. The service-level ownership check still protects data, but the guard is a no-op.
   ```typescript
   // Add this above @Patch(':id')
   @Roles(UserRole.OWNER, UserRole.ADMIN)
   ```

3. **`sendNewReviewNotification` accesses `review.restaurant.name`** (`reviews.service.ts`)  
   The `review` object saved to the database does not include the `restaurant` relation, causing a runtime crash when the email is sent. Reload the review with relations before calling the mail service.
   ```typescript
   const savedReview = await this.reviewRepository.findOne({
     where: { id: review.id },
     relations: ['customer', 'restaurant'],
   });
   await this.mailService.sendNewReviewNotification(savedReview, ...);
   ```

4. **`Delivery` entity is unused** (`delivery/`)  
   The `DeliveryModule` and `Delivery` entity are defined but never populated. Order delivery is tracked entirely on the `Order` entity. Either integrate the `Delivery` entity into the order assignment/delivery flow or remove it to avoid confusion.

### 🟡 Medium Priority

5. **No refresh token mechanism** — JWTs expire but there is no `/auth/refresh` endpoint. Expired sessions require a full login.

6. **`totalAmount` stored as `decimal` but `.toFixed(2)` used in templates** — If `totalAmount` is returned as a string by some drivers (TypeORM decimal quirk with pg), calling `.toFixed()` will throw. Cast explicitly:
   ```typescript
   Number(order.totalAmount).toFixed(2)
   ```

7. **No pagination on list endpoints** — `GET /restaurants`, `GET /orders/my`, and review listings return all records. Add `limit`/`offset` or cursor-based pagination.

8. **`GET /orders/:id` has no authorization check** — Any authenticated user can read any order by ID. Add an ownership/role check in `getOrderWithDetails`.

### 🟢 Low Priority / Nice to Have

9. **Add `imageUrl` to `CreateRestaurantDto`** — The entity supports `imageUrl` but the DTO does not expose it for creation.

10. **Structured logging** — Replace `console.log` from TypeORM with a proper logger (e.g., `winston`, NestJS built-in logger) with log levels.

11. **E2E tests** — The `test/app.e2e-spec.ts` file is a placeholder. Expand with real integration tests against a test database.

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please follow the [Conventional Commits](https://www.conventionalcommits.org/) specification and ensure all existing tests pass before submitting.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

