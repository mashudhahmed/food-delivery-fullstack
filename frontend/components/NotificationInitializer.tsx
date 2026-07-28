"use client";

import { useEffect } from "react";
import { useNotificationStore } from "@/stores/notificationStore";
import { auth } from "@/lib/auth";
import { wsService } from "@/lib/websocket";

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
    const handleNotification = (payload: any) => {
      addNotification({
        id: payload.id || crypto.randomUUID(),
        title: payload.title || "New notification",
        message: payload.message || "",
        type: payload.type || "info",
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
        type: "order",
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