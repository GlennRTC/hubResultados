"use client";
// src/components/delivery-status-badge.tsx
// DEL-05: Real-time delivery status badge via Supabase Realtime
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type NotificationStatus = "pending" | "sent" | "delivered" | "read" | "failed";

const STATUS_CONFIG: Record<NotificationStatus, { label: string; className: string }> = {
  pending: { label: "Pendiente", className: "bg-amber-100 text-amber-800" },
  sent: { label: "Enviado", className: "bg-blue-100 text-blue-800" },
  delivered: { label: "Entregado", className: "bg-green-100 text-green-800" },
  read: { label: "Leido", className: "bg-purple-100 text-purple-800" },
  failed: { label: "Fallido", className: "bg-red-100 text-red-800" },
};

interface Props {
  orderId: string;
  initialStatus?: NotificationStatus;
}

export function DeliveryStatusBadge({ orderId, initialStatus = "pending" }: Props) {
  const [status, setStatus] = useState<NotificationStatus>(initialStatus);
  const supabase = createClient();

  useEffect(() => {
    // PREREQUISITE: notifications table must be in supabase_realtime publication (done in 03-00)
    const channel = supabase
      .channel(`notifications:${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          const newStatus = payload.new.status as NotificationStatus;
          if (newStatus) setStatus(newStatus);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, supabase]);

  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
