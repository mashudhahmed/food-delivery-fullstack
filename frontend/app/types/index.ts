// frontend/app/types/index.ts

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  address?: string;
  role: 'customer' | 'owner' | 'agent' | 'admin';
}

export interface Restaurant {
  createdAt: string | number | Date;
  id: string;
  name: string;
  description: string;
  address: string;
  phone: string;
  cuisineType: string;
  isOpen: boolean;
  rating: number;
  imageUrl?: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  isAvailable: boolean;
  category: string;
  imageUrl?: string;
  restaurantId: string;
}

export interface CartItem extends MenuItem {
  restaurantName: string;
  quantity: number;
}

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'picked_up' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  customerId: string;
  restaurantId: string;
  agentId?: string;                    // ✅ Added - delivery agent assigned
  status: OrderStatus;
  
  // Price breakdown
  subtotal: number;                    // ✅ Added - before fees
  deliveryFee: number;                 // ✅ Added - delivery charge
  platformFee: number;                 // ✅ Added - platform/service fee
  totalAmount: number;                 // ✅ Already there
  
  deliveryAddress: string;
  deliveryInstructions?: string;       // ✅ Fixed - should be string, not JSX.Element
  
  // Customer info
  customerName?: string;               // ✅ Added - customer full name
  customerEmail?: string;              // ✅ Added - customer email
  customerPhone?: string;              // ✅ Added - customer phone
  
  paymentMethod?: string;              // ✅ Added - payment method used
  
  placedAt: Date | string;             // ✅ Fixed - Date type
  updatedAt: Date | string;            // ✅ Fixed - Date type
  
  // Relations
  restaurant?: Restaurant;
  items?: OrderItem[];
  customer?: User;                     // ✅ Added - customer relation
  agent?: User;                        // ✅ Added - agent relation
}

export interface OrderItem {
  id: string;
  orderId?: string;                    // ✅ Added - link to order
  menuItemId: string;
  quantity: number;
  unitPrice: number;
  menuItem?: MenuItem;
}