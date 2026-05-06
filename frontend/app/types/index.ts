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

export interface Order {
  id: string;
  customerId: string;
  restaurantId: string;
  restaurant?: Restaurant;
  status: 'pending' | 'preparing' | 'ready' | 'picked_up' | 'delivered' | 'cancelled';
  totalAmount: number;
  deliveryAddress: string;
  placedAt: string;
  items: OrderItem[];
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  quantity: number;
  unitPrice: number;
  menuItem?: MenuItem;
}