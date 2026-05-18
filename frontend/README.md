<div align="center">

# QuickBite Frontend - Food Delivery Web Application

**A feature-rich food delivery frontend built with Next.js for food ordering, restaurant management, and delivery tracking**

[![Next.js](https://img.shields.io/badge/Next.js-14.x-000000?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.x-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![Zustand](https://img.shields.io/badge/Zustand-4.x-000000?style=flat-square)](https://zustand-demo.pmnd.rs/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.x-010101?style=flat-square&logo=socket.io)](https://socket.io/)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.x-199900?style=flat-square&logo=leaflet)](https://leafletjs.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

</div>

---

## Features

- **Multi-role Authentication** - Customer, Owner, Agent, Admin with JWT
- **Restaurant Discovery** - Search, filters (cuisine, price, rating, open status), sorting
- **Dynamic Shopping Cart** - Persistent cart with quantity controls
- **Order Lifecycle Tracking** - Real-time order status updates
- **Delivery Agent Portal** - Accept deliveries and update order status
- **Restaurant Owner Portal** - Manage restaurants, menu items, and analytics
- **Admin Dashboard** - User management and approval system
- **Real-time Notifications** - WebSocket notifications with polling fallback
- **Interactive Maps** - Address selection using Leaflet and OpenStreetMap
- **Favorites System** - Save favorite restaurants and menu items
- **Responsive Design** - Mobile-first responsive UI

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3 |
| State Management | Zustand 4 |
| Maps | Leaflet + React-Leaflet |
| Real-time | Socket.IO Client |
| HTTP Client | Axios |
| Charts | Recharts |
| Icons | Lucide React |

---

## Quick Start

### Prerequisites

```bash
Node.js >= 18.x
npm >= 9.x
```

### Installation

```bash
# Clone repository
git clone https://github.com/your-org/quickbite-frontend.git

# Enter project directory
cd quickbite-frontend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local

# Start development server
npm run dev
```

### Verification

```bash
# Open in browser
http://localhost:3000
```

---

## Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api

# Optional
NEXT_PUBLIC_GOOGLE_MAPS_KEY=

# Optional
NEXT_PUBLIC_GA_ID=
```

---

## Backend Dependency

This frontend requires the QuickBite backend API to be running.

Default backend API URL:

```text
http://localhost:3001/api
```

Make sure the backend server is active before using the frontend application.

---

## Project Structure

```text
frontend/
├── app/
│   ├── admin/
│   ├── agent/
│   ├── owner/
│   ├── cart/
│   ├── checkout/
│   ├── favorites/
│   ├── notifications/
│   ├── orders/
│   ├── restaurants/
│   ├── settings/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
│
├── components/
│   ├── AuthModal.tsx
│   ├── CancelOrderModal.tsx
│   ├── Footer.tsx
│   ├── LocationModal.tsx
│   ├── MenuItemCard.tsx
│   ├── Navbar.tsx
│   ├── NotificationDropdown.tsx
│   ├── NotificationInitializer.tsx
│   ├── RestaurantCard.tsx
│   └── ActivityFeed.tsx
│
├── lib/
│   ├── api.ts
│   ├── auth.ts
│   ├── websocket.ts
│   └── leaflet-icons.ts
│
├── stores/
│   ├── addressStore.ts
│   ├── cartStore.ts
│   ├── favoritesStore.ts
│   └── notificationStore.ts
│
├── hooks/
│   └── useAuthModal.ts
│
├── types/
│   ├── index.ts
│   └── notification.ts
│
├── docs/
│   └── screenshots/
│
└── public/
    └── logo.png
```

---

## User Roles & Routes

| Role | Routes | Description |
|------|---------|-------------|
| Customer | `/`, `/cart`, `/checkout`, `/orders`, `/favorites` | Browse restaurants and place orders |
| Owner | `/owner/dashboard`, `/owner/orders` | Manage restaurants and orders |
| Agent | `/agent/dashboard`, `/agent/deliveries` | Handle deliveries |
| Admin | `/admin/dashboard`, `/admin/users` | System administration |

---

## Key Components

### Navbar

Role-aware navigation component with:
- Cart badge
- Notification dropdown
- Location selector
- Favorites badge
- User menu

```tsx
import Navbar from '@/components/Navbar';
```

### AuthModal

Authentication modal supporting:
- Login
- Registration
- Role selection
- Password reset

```tsx
import AuthModal from '@/components/AuthModal';
```

### LocationModal

Interactive map-based address selection using Leaflet.

```tsx
import LocationModal from '@/components/LocationModal';
```

### MenuItemCard

Menu item display with:
- Quantity controls
- Cart synchronization
- Restaurant availability state

```tsx
<MenuItemCard
  item={menuItem}
  restaurantName={restaurant.name}
  restaurantId={restaurant.id}
/>
```

### RestaurantCard

Restaurant listing component with:
- Ratings
- Open/closed status
- Favorite support
- Cuisine details

```tsx
<RestaurantCard restaurant={restaurant} />
```

---

## State Management

The application uses Zustand with persistence middleware.

### Cart Store

```tsx
import { useCartStore } from '@/stores/cartStore';

const {
  items,
  addItem,
  removeItem,
  updateQuantity,
  clearCart
} = useCartStore();
```

### Address Store

```tsx
import { useAddressStore } from '@/stores/addressStore';
```

### Favorites Store

```tsx
import { useFavoritesStore } from '@/stores/favoritesStore';
```

### Notification Store

```tsx
import { useNotificationStore } from '@/stores/notificationStore';
```

---

## API Integration

Axios is used for API communication with automatic JWT handling.

```tsx
import { api, auth } from '@/lib/api';

// Fetch restaurants
const response = await api.get('/restaurants');

// Login
const { token, user } = await auth.login({
  email,
  password
});
```

---

## Error Handling

The frontend uses Axios interceptors for centralized error handling.

### Features

- Automatic JWT token injection
- Auto logout on 401 Unauthorized
- API validation error handling
- User-friendly error feedback

### Example

```typescript
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);
```

---

## Real-time Notifications

Socket.IO is used for live notifications and order updates.

### Initialization

```tsx
import NotificationInitializer from '@/components/NotificationInitializer';

<NotificationInitializer />
```

### WebSocket Service

```typescript
import { wsService } from '@/lib/websocket';

// Connect
wsService.connect(userId);

// Disconnect
wsService.disconnect();
```

### Notification Types

| Type | Recipient | Description |
|------|------------|-------------|
| order_new | Owner | New order placed |
| order_status | Customer | Order status changed |
| order_ready | Agent | Order ready for pickup |
| order_delivered | Customer | Order delivered |
| agent_assigned | Customer/Agent | Agent assigned |

---

## Order Status Flow

```text
PENDING -> PREPARING -> READY -> PICKED_UP -> ON_THE_WAY -> DELIVERED
```

| Status | Description |
|--------|-------------|
| pending | Order placed |
| preparing | Restaurant preparing |
| ready | Ready for pickup |
| picked_up | Picked up by agent |
| on_the_way | Delivery in progress |
| delivered | Delivered successfully |
| cancelled | Order cancelled |

---

## Building & Deployment

### Development

```bash
npm run dev
```

### Production Build

```bash
# Build application
npm run build

# Start production server
npm start
```

### Build Output

```text
.next/         # Production build output
node_modules/  # Dependencies
```

> This project is currently developed and tested in a local development environment.  
> Production deployment and optimization are planned for future updates.

---
## Screenshots

### Authentication

| Login | Registration |
|--------|--------------|
| <img width="959" height="473" alt="image" src="https://github.com/user-attachments/assets/918ca06f-163f-43ac-8ce9-a9728f34e758" /> | <img width="959" height="473" alt="image" src="https://github.com/user-attachments/assets/c4467d6e-3420-4728-8aa3-ff1e078ad2e1" /> |

| Role Selection | Password Reset |
|----------------|----------------|
| <img width="959" height="473" alt="image" src="https://github.com/user-attachments/assets/8553c41f-f5c1-43cb-8526-df87d35cb9a7" /> | <img width="959" height="473" alt="image" src="https://github.com/user-attachments/assets/603d0f39-b318-4925-97be-f78bf57d5014" /> |

---

### Customer Interface

| Home Page | Restaurant Details |
|------------|-------------------|
| <img width="959" height="473" alt="image" src="https://github.com/user-attachments/assets/7dcbd49d-8866-4542-bd92-6a7527d1d074" /> | <img width="959" height="475" alt="image" src="https://github.com/user-attachments/assets/bfa00ef7-8162-45ea-baf9-77eb0fb4b2e8" /> |

| Shopping Cart | Order Tracking |
|----------------|----------------|
| <img width="959" height="475" alt="image" src="https://github.com/user-attachments/assets/3e17c560-5545-4ecd-86cd-937668f76c31" /> | <img width="959" height="473" alt="image" src="https://github.com/user-attachments/assets/55588589-15e7-4d86-92ff-daf38a2d5310" /> |

---

### Restaurant Owner Dashboard

| Owner Dashboard | Menu Management |
|-----------------|-----------------|
| <img width="959" height="470" alt="image" src="https://github.com/user-attachments/assets/ab72bd72-3a20-4ce7-b2bc-6086c44f33a6" /> | <img width="959" height="469" alt="image" src="https://github.com/user-attachments/assets/4340e9da-262b-4a06-a097-f10dcf598816" />|

| Restaurant Orders | Restaurant Analytics |
|-------------------|----------------------|
| <img width="959" height="473" alt="image" src="https://github.com/user-attachments/assets/e9c2f6f0-2eae-4e7f-a4dc-028518bcc94d" /> | <img width="959" height="474" alt="image" src="https://github.com/user-attachments/assets/608a6482-1a2e-49d1-83e1-296555b3b272" /> |

---

### Delivery Agent Portal

| Agent Dashboard | Available Deliveries |
|-----------------|----------------------|
| <img width="959" height="475" alt="image" src="https://github.com/user-attachments/assets/3adf7a29-c7e9-4577-91dc-9831f2bedae2" /> | <img width="959" height="473" alt="image" src="https://github.com/user-attachments/assets/56f45a8f-bdfb-478f-bc63-406f03f5e28d" /> |

| Earnings Page | Delivery Tracking |
|----------------|------------------|
| <img width="959" height="470" alt="image" src="https://github.com/user-attachments/assets/e39cac14-ed40-4085-a6ba-e51b2445db10" /> | <img width="959" height="475" alt="image" src="https://github.com/user-attachments/assets/f8462303-1341-4dbd-9d77-f8955beb171a" /> |

---

### Admin Dashboard

| Admin Dashboard | User Management |
|-----------------|-----------------|
| <img width="959" height="475" alt="image" src="https://github.com/user-attachments/assets/fba42b45-71bb-40c4-9af5-f314cd39d7af" /> | <img width="959" height="473" alt="image" src="https://github.com/user-attachments/assets/9be74913-6386-47cc-926c-e130d95619c1" /> |

| Restaurant Approval | System Analytics |
|---------------------|------------------|
| <img width="959" height="475" alt="image" src="https://github.com/user-attachments/assets/5ae547e8-284d-4654-9ced-60f759271ecf" /> | <img width="959" height="473" alt="image" src="https://github.com/user-attachments/assets/7ba1b8f5-260f-42ff-936d-909cc7c7e83d" /> |

---

### Additional Features

| Notifications | Location Selection |
|---------------|-------------------|
| <img width="959" height="473" alt="image" src="https://github.com/user-attachments/assets/23d741a6-a47d-42be-bc79-65ad8b1b89b1" /> | <img width="959" height="473" alt="image" src="https://github.com/user-attachments/assets/37ee2b19-eae3-43a4-9a24-a60e5ee5418d" /> |

---

## Troubleshooting

| Issue | Solution |
|------|-----------|
| API connection failed | Verify backend server is running |
| WebSocket connection error | Check WebSocket server |
| Cart not persisting | Clear browser localStorage |
| Location permission denied | Enable browser location access |
| Build errors | Run `npm run type-check` |

### Useful Commands

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Format code
npm run format

# Clean installation
rm -rf node_modules .next

npm install
npm run dev
```

---

## License

MIT License © QuickBite
