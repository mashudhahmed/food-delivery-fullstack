<div align="center">

# QuickBite - Food Delivery API

**A production-ready RESTful backend for food ordering, restaurant management, and delivery tracking**

[![NestJS](https://img.shields.io/badge/NestJS-11.x-E0234E?style=flat-square&logo=nestjs)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16.x-4169E1?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![TypeORM](https://img.shields.io/badge/TypeORM-0.3.x-FE0803?style=flat-square)](https://typeorm.io/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.x-010101?style=flat-square&logo=socket.io)](https://socket.io/)
[![JWT](https://img.shields.io/badge/JWT-Auth-000000?style=flat-square&logo=jsonwebtokens)](https://jwt.io/)
[![Swagger](https://img.shields.io/badge/Swagger-OpenAPI-85EA2D?style=flat-square&logo=swagger)](https://swagger.io/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

</div>

---

## Features

- **JWT Authentication** - Secure stateless auth with bcrypt password hashing
- **Restaurant Management** - Full CRUD with owner-level access control
- **Dynamic Menu System** - Per-restaurant menus with availability toggles
- **Order Lifecycle** - End-to-end order flow: place > prepare > pickup > deliver
- **Delivery Agent Workflow** - Agent assignment and delivery status tracking
- **Verified Reviews** - Review gating behind delivered-order verification
- **Transactional Emails** - Nodemailer-powered notifications at every order stage
- **Real-time WebSocket** - Live notifications via Socket.io
- **Admin Dashboard** - Analytics, user management, pending approvals
- **Swagger UI** - Interactive API documentation at `/api-docs`
- **Rate Limiting** - Throttler guard (10 req/min per IP)
- **Input Validation** - Global ValidationPipe with whitelist and transform
- **Data Export** - CSV export for users, orders, restaurants
- **File Uploads** - Restaurant and menu item images

---

## Tech Stack

| Layer        | Technology              |
|--------------|-------------------------|
| Framework    | NestJS 11               |
| Language     | TypeScript 5            |
| Database     | PostgreSQL 16           |
| ORM          | TypeORM 0.3             |
| Auth         | Passport.js + JWT       |
| Validation   | class-validator         |
| Email        | Nodemailer + Handlebars |
| WebSocket    | Socket.io               |
| File Uploads | Multer                  |
| API Docs     | Swagger/OpenAPI 3       |
| Testing      | Jest                    |

---

## Quick Start

### Prerequisites

```bash
Node.js >= 18.x
npm >= 9.x
PostgreSQL >= 14.x
```

### Installation

```bash
# Clone repository
git clone https://github.com/your-org/quickbite-api.git
cd quickbite-api

# Install dependencies
npm install

# Configure environment
cp .env.example .env
nano .env

# Start development server
npm run start:dev
```

### Verification

```bash
# API health check
curl http://localhost:3001/api

# Swagger UI
http://localhost:3001/api-docs
```

---

## Environment Variables

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

---

## API Reference

Base URL: `http://localhost:3001/api`

### Authentication

| Method | Endpoint              | Auth | Description            |
|--------|-----------------------|------|------------------------|
| POST   | /auth/register        | No   | User registration      |
| POST   | /auth/login           | No   | User login             |
| POST   | /auth/forgot-password | No   | Request password reset |
| POST   | /auth/reset-password  | No   | Reset password         |
| GET    | /auth/me              | Yes  | Get current user       |

### Restaurants

| Method | Endpoint         | Auth | Roles        | Description            |
|--------|------------------|------|--------------|------------------------|
| POST   | /restaurants     | Yes  | owner, admin | Create restaurant      |
| GET    | /restaurants     | No   | -            | List restaurants       |
| GET    | /restaurants/:id | No   | -            | Get restaurant details |
| PATCH  | /restaurants/:id | Yes  | owner, admin | Update restaurant      |
| DELETE | /restaurants/:id | Yes  | admin        | Delete restaurant      |

### Menu

| Method | Endpoint                        | Auth | Roles        | Description         |
|--------|---------------------------------|------|--------------|---------------------|
| POST   | /menu/restaurant/:restaurantId | Yes  | owner, admin | Add menu item       |
| GET    | /menu/restaurant/:restaurantId | No   | -            | Get restaurant menu |
| GET    | /menu/:id                      | No   | -            | Get menu item       |
| PATCH  | /menu/:id                      | Yes  | owner, admin | Update menu item    |
| DELETE | /menu/:id                      | Yes  | owner, admin | Delete menu item    |

### Orders

| Method | Endpoint              | Auth | Roles           | Description       |
|--------|-----------------------|------|-----------------|-------------------|
| POST   | /orders               | Yes  | Any             | Place order       |
| GET    | /orders/my            | Yes  | Any             | My orders         |
| GET    | /orders/my-restaurant | Yes  | owner           | Restaurant orders |
| GET    | /orders/:id           | Yes  | Any             | Order details     |
| PATCH  | /orders/:id/status    | Yes  | owner, admin    | Update status     |
| PATCH  | /orders/:id/assign    | Yes  | admin           | Assign agent      |
| PATCH  | /orders/:id/delivery  | Yes  | agent           | Delivery update   |
| DELETE | /orders/:id           | Yes  | customer, admin | Cancel order      |

### Admin

| Method | Endpoint                    | Auth | Description          |
|--------|-----------------------------|------|----------------------|
| GET    | /admin/dashboard/stats      | Yes  | Dashboard metrics    |
| GET    | /admin/users                | Yes  | List users           |
| PATCH  | /admin/users/:userId/status | Yes  | Update user status   |
| GET    | /admin/pending-approvals    | Yes  | Pending applications |
| PATCH  | /admin/approve/:userId      | Yes  | Approve user         |
| GET    | /admin/restaurants          | Yes  | List restaurants     |
| GET    | /admin/orders               | Yes  | List orders          |
| GET    | /admin/charts/revenue       | Yes  | Revenue chart data   |
| GET    | /admin/export/:type         | Yes  | Export CSV           |
| GET    | /admin/activity             | Yes  | Activity feed        |

### Reviews

| Method | Endpoint                          | Auth | Description            |
|--------|-----------------------------------|------|------------------------|
| POST   | /reviews                          | Yes  | Create review          |
| GET    | /reviews/restaurant/:restaurantId | No   | Get restaurant reviews |

### Favorites

| Method | Endpoint                 | Auth | Description      |
|--------|--------------------------|------|------------------|
| GET    | /favorites               | Yes  | Get favorites    |
| POST   | /favorites               | Yes  | Add to favorites |
| DELETE | /favorites/:restaurantId | Yes  | Remove favorite  |

### Notifications

| Method | Endpoint                | Auth | Description       |
|--------|-------------------------|------|-------------------|
| GET    | /notifications          | Yes  | Get notifications |
| PATCH  | /notifications/:id/read | Yes  | Mark as read      |

### Uploads

| Method | Endpoint            | Auth | Roles        | Description             |
|--------|---------------------|------|--------------|-------------------------|
| POST   | /uploads/restaurant | Yes  | owner, admin | Upload restaurant image |
| POST   | /uploads/menu-item  | Yes  | owner, admin | Upload menu item image  |

---

## Roles and Permissions

| Role     | Capabilities                                                          |
|----------|-----------------------------------------------------------------------|
| customer | Browse, place orders, cancel pending orders, write reviews            |
| owner    | Customer capabilities + manage restaurants/menus, update order status |
| agent    | Update delivery status for assigned orders                            |
| admin    | Full access across all resources                                      |

---

## Order Status Flow

```text
PENDING -> PREPARING -> READY -> PICKED_UP -> DELIVERED
    |
    +---------------------------------------------> CANCELLED
```

| Status    | Description           | Who Can Set                    |
|-----------|-----------------------|--------------------------------|
| pending   | Order placed          | System                         |
| preparing | Restaurant preparing  | Owner, Admin                   |
| ready     | Ready for pickup      | Owner, Admin                   |
| picked_up | Agent picked up       | Agent                          |
| delivered | Delivered to customer | Agent                          |
| cancelled | Order cancelled       | Customer (from pending), Admin |

---

## Database Schema

```text
users
  id | fullName | email | phone | role | status | passwordHash | ...

restaurants
  id | name | description | address | cuisineType | rating | isOpen | ownerId

menu_items
  id | name | description | price | category | isAvailable | restaurantId

orders
  id | customerId | restaurantId | agentId | status | totalAmount | deliveryAddress

order_items
  id | orderId | menuItemId | quantity | unitPrice

reviews
  id | customerId | restaurantId | orderId | rating | comment

favorites
  id | userId | restaurantId | restaurantName

notifications
  id | userId | type | title | message | read
```

---

## Real-time Notifications (WebSocket)

```javascript
const socket = io('http://localhost:3002/notifications', {
  query: { userId: 'user-uuid' }
});

socket.on('notification', (data) => {
  console.log(data.type, data.title, data.message);
});
```

### Notification Types

| Type            | Description                                 |
|-----------------|---------------------------------------------|
| order_new       | New order placed                            |
| order_status    | Order status changed                        |
| order_available | Order ready for pickup (sent to all agents) |
| earnings_added  | Delivery earnings added to agent            |
| agent_assigned  | Agent assigned to order                     |

---

## Email Notifications

| Event                  | Recipient        | Template                      |
|------------------------|------------------|-------------------------------|
| Order Confirmed        | Customer         | order-confirmation.hbs        |
| Order Status Update    | Customer         | order-status-update.hbs       |
| Order Delivered        | Customer         | order-delivered.hbs           |
| New Order Received     | Restaurant Owner | new-order-owner.hbs           |
| Order Ready for Pickup | All Agents       | new-order-available-agent.hbs |
| Earnings Added         | Delivery Agent   | earnings-added-agent.hbs      |
| Account Approved       | Owner/Agent      | application-approved.hbs      |
| Account Rejected       | Owner/Agent      | application-rejected.hbs      |
| Password Reset         | User             | password-reset.hbs            |
| New Review             | Restaurant Owner | review-notification.hbs       |

---

## Email Evidence

Screenshots of the required email triggers using Mailtrap SMTP testing:

| # | Email Type | Recipient | Screenshot |
|---|------------|-----------|-------------|
| 1 | Order Confirmation | Customer | <img width="959" height="473" alt="image" src="https://github.com/user-attachments/assets/13bae20e-9543-49ef-8e59-110bd2ffad74" />|
| 2 | Order Status Update | Customer | <img width="959" height="473" alt="image" src="https://github.com/user-attachments/assets/845c92c4-a524-4794-a991-c6abbcab19e3" />|

> **Note:** Additional email templates including password reset, account approval/rejection, earnings notifications, and order availability alerts are also implemented. Total email templates available: **10**

### SMTP Configuration

```env
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=587
MAIL_USER=your_mailtrap_username
MAIL_PASSWORD=your_mailtrap_password
MAIL_FROM=noreply@quickbite.com
```

---

## Testing

```bash
# Unit tests
npm run test

# Test coverage
npm run test:cov

# End-to-end tests
npm run test:e2e
```

---

## Deployment

```bash
# Build
npm run build

# Production
npm run start:prod

# Using PM2
pm2 start dist/main.js --name quickbite-api
```

---

## Project Structure

```text
src/
├── auth/           # JWT authentication, guards
├── admin/          # Admin dashboard, user management
├── restaurants/    # Restaurant CRUD
├── menu/           # Menu item management
├── orders/         # Order lifecycle
├── reviews/        # Review system
├── favorites/      # User favorites
├── notifications/  # WebSocket + notifications
├── mail/           # Email templates (Handlebars)
├── uploads/        # File uploads (Multer)
└── common/         # Shared decorators
```

---

## Error Codes

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_INPUT | Validation failed (email format, required fields, etc.) |
| 401 | UNAUTHORIZED | Missing or invalid JWT token |
| 403 | FORBIDDEN | Authenticated but insufficient role/permission |
| 404 | NOT_FOUND | Requested resource does not exist |
| 409 | ORDER_NOT_CANCELLABLE | Order cannot be cancelled (beyond pending status) |
| 409 | DUPLICATE_FAVORITE | Restaurant already in user's favorites |
| 422 | INVALID_STATUS_TRANSITION | Illegal order status change |
| 429 | TOO_MANY_REQUESTS | Rate limit exceeded (10 req/min) |
| 500 | INTERNAL_SERVER_ERROR | Something went wrong on our end |

---

## Contributing

1. Fork the repository
2. Create a feature branch:

```bash
git checkout -b feature/your-feature
```

3. Commit your changes:

```bash
git commit -m "feat: add your feature"
```

4. Push to the branch:

```bash
git push origin feature/your-feature
```

5. Open a Pull Request

### Commit Convention

```text
feat:      new feature
fix:       bug fix
docs:      documentation update
refactor:  code refactoring
test:      add or update tests
```

---

## License

MIT License © QuickBite
