export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  address?: string;
  role: 'customer' | 'owner' | 'agent' | 'admin';
  status?: 'pending' | 'approved' | 'rejected' | 'suspended';
}

export interface Restaurant {
  id: string;
  name: string;
  description: string;
  address: string;
  phone: string;
  cuisineType: string;
  isOpen: boolean;
  rating: number;
  imageUrl?: string;
  ownerId?: string;
  createdAt?: string;
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

export type OrderStatus = 
  | 'pending'
  | 'preparing'
  | 'ready'
  | 'picked_up'
  | 'on_the_way'
  | 'delivered'
  | 'cancelled';

export interface Order {
  id: string;
  customerId: string;
  restaurantId: string;
  agentId?: string;
  status: OrderStatus;
  subtotal: number | string;
  deliveryFee: number | string;
  platformFee: number | string;
  totalAmount: number | string;
  deliveryAddress: string;
  deliveryInstructions?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  paymentMethod: string;
  placedAt: Date | string;
  updatedAt: Date | string;
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

export interface Address {
  id: string;
  name?: string;
  street?: string;
  area?: string;
  city: string;
  fullAddress?: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
}