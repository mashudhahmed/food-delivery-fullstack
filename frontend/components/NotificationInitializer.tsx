"use client";

import { useEffect } from "react";
import { useNotificationStore } from "@/stores/notificationStore";
import { auth } from "@/lib/auth";
import { wsService } from "@/lib/websocket";
import type { NotificationType } from "@/types/notification";

export default function NotificationInitializer() {
  const { fetchNotifications, addNotification } = useNotificationStore();

  useEffect(() => {
    // Only run on client and when user is logged in
    if (!auth.isAuthenticated()) return;

    // 1. Load existing notifications from API
    fetchNotifications();

    // 2. Connect WebSocket
    wsService.connect();

    // 3. Listen for real-time notifications
    const VALID_TYPES = new Set<string>([
      "order_new",
      "order_status",
      "order_ready",
      "order_picked_up",
      "order_on_the_way",
      "order_delivered",
      "order_cancelled",
      "order_available",
      "order_assigned",
      "earnings_added",
      "restaurant_approved",
      "restaurant_rejected",
      "agent_assigned",
      "payment_received",
      "system_alert",
    ]);

    const handleNotification = (payload: any) => {
      const rawType = payload.type as string | undefined;
      const type = (
        rawType && VALID_TYPES.has(rawType) ? rawType : "system_alert"
      ) as NotificationType;

      addNotification({
        id: payload.id || crypto.randomUUID(),
        title: payload.title || "New notification",
        message: payload.message || "",
        type,
        read: false,
        createdAt: payload.createdAt || new Date().toISOString(),
        data: payload.data,
      });
    };

    const handleOrderUpdate = (payload: any) => {
      addNotification({
        id: crypto.randomUUID(),
        title: "Order Update",
        message: `Your order status is now ${payload.status || "updated"}`,
        type: "order_status", // must be a member of NotificationType
        read: false,
        createdAt: new Date().toISOString(),
        data: { orderId: payload.id },
      });
    };

    wsService.on("notification", handleNotification);
    wsService.on("order-status-update", handleOrderUpdate);
    wsService.on("new-order", handleOrderUpdate);

    // Cleanup
    return () => {
      wsService.off("notification", handleNotification);
      wsService.off("order-status-update", handleOrderUpdate);
      wsService.off("new-order", handleOrderUpdate);
    };
  }, [fetchNotifications, addNotification]);

  // This component renders nothing
  return null;
}