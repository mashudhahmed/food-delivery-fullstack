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

// ✅ UPDATED: Added 'on_the_way' status
export type OrderStatus = 
  | 'pending'      // 1. Order Placed
  | 'preparing'    // 2. Preparing
  | 'ready'        // 3. Ready for Pickup
  | 'picked_up'    // 4. Picked Up
  | 'on_the_way'   // 5. On the Way (NEW)
  | 'delivered'    // 6. Delivered
  | 'cancelled';   // Cancelled

export interface Order {
  id: string;
  customerId: string;
  restaurantId: string;
  agentId?: string;
  status: OrderStatus;
  
  // Price breakdown
  subtotal: number;
  deliveryFee: number;
  platformFee: number;
  totalAmount: number;
  
  deliveryAddress: string;
  deliveryInstructions?: string;
  
  // Customer info
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  
  paymentMethod?: string;
  
  placedAt: Date | string;
  updatedAt: Date | string;
  
  // Relations
  restaurant?: Restaurant;
  items?: OrderItem[];
  customer?: User;
  agent?: User;
}

export interface OrderItem {
  id: string;
  orderId?: string;
  menuItemId: string;
  quantity: number;
  unitPrice: number;
  menuItem?: MenuItem;
}