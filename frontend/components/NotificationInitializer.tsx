"use client";

import { useEffect } from "react";
import { useNotificationStore } from "@/stores/notificationStore";
import { auth } from "@/lib/auth";
import { wsService } from "@/lib/websocket";
import type { NotificationType } from "@/types/notification";
import toast from "react-hot-toast";

export default function NotificationInitializer() {
  const { fetchNotifications, addNotification } = useNotificationStore();

  useEffect(() => {
    if (!auth.isAuthenticated()) return;

    fetchNotifications();
    wsService.connect();

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

      const title = payload.title || "New notification";
      const message = payload.message || "";

      addNotification({
        id: payload.id || crypto.randomUUID(),
        title,
        message,
        type,
        read: false,
        createdAt: payload.createdAt || new Date().toISOString(),
        data: payload.data,
      });

      if (title || message) {
        toast(() => (
          <div>
            <div className="font-semibold text-sm">{title}</div>
            {message && <div className="text-xs text-slate-500 mt-0.5">{message}</div>}
          </div>
        ), {
          id: payload.id,
          icon: type === "order_new" ? "🔔" : type === "order_delivered" ? "🎉" : "📦",
        });
      }
    };

    const handleOrderUpdate = (payload: any) => {
      addNotification({
        id: crypto.randomUUID(),
        title: "Order Update",
        message: `Your order status is now ${payload.status || "updated"}`,
        type: "order_status",
        read: false,
        createdAt: new Date().toISOString(),
        data: { orderId: payload.id },
      });
    };

    wsService.on("notification", handleNotification);
    wsService.on("order-status-update", handleOrderUpdate);
    wsService.on("new-order", handleOrderUpdate);

    return () => {
      wsService.off("notification", handleNotification);
      wsService.off("order-status-update", handleOrderUpdate);
      wsService.off("new-order", handleOrderUpdate);
    };
  }, [fetchNotifications, addNotification]);

  return null;
}