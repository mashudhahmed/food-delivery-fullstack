export type NotificationType = 
  | 'order_new'
  | 'order_status'
  | 'order_ready'
  | 'order_picked_up'      // NEW
  | 'order_on_the_way'     // NEW
  | 'order_delivered'
  | 'order_cancelled'
  | 'restaurant_approved'
  | 'restaurant_rejected'
  | 'agent_assigned'
  | 'payment_received'
  | 'system_alert';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date | string;
  data?: {
    orderId?: string;
    restaurantId?: string;
    userId?: string;
    amount?: number;
  };
}