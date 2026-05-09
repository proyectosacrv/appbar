"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Order } from "@/types/database";

// Realtime is the primary update mechanism. We keep a slow poll (30 s) only
// as a safety net in case the websocket drops. This drastically reduces load
// on the database vs the previous 5 s poll.
const REALTIME_FALLBACK_POLL_MS = 30_000;

export function useRealtimeOrders(barId: string, onNewOrder?: () => void) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const initialLoadDoneRef = useRef(false);
  const onNewOrderRef = useRef(onNewOrder);
  useEffect(() => {
    onNewOrderRef.current = onNewOrder;
  }, [onNewOrder]);

  const fetchOrders = useCallback(async () => {
    const supabase = createClient();
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("bar_id", barId)
      .gte("created_at", dayAgo)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setOrders(data as unknown as Order[]);
    }
    setLoading(false);
    initialLoadDoneRef.current = true;
  }, [barId]);

  useEffect(() => {
    fetchOrders();

    const pollInterval = setInterval(fetchOrders, REALTIME_FALLBACK_POLL_MS);

    const supabase = createClient();
    const channel = supabase
      .channel(`orders-${barId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `bar_id=eq.${barId}`,
        },
        async (payload) => {
          const { data } = await supabase
            .from("orders")
            .select("*, order_items(*)")
            .eq("id", payload.new.id)
            .single();
          if (data) {
            setOrders((prev) => [data as unknown as Order, ...prev]);
            if (initialLoadDoneRef.current) {
              onNewOrderRef.current?.();
            }
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `bar_id=eq.${barId}`,
        },
        (payload) => {
          const updated = payload.new as unknown as Order;
          setOrders((prev) =>
            prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o))
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "orders",
          filter: `bar_id=eq.${barId}`,
        },
        (payload) => {
          const deletedId = (payload.old as { id: string }).id;
          setOrders((prev) => prev.filter((o) => o.id !== deletedId));
        }
      )
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [barId, fetchOrders]);

  const refetchOrder = async (orderId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", orderId)
      .single();
    if (data) {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? (data as unknown as Order) : o))
      );
    }
  };

  const removeOrdersLocal = useCallback((orderIds: string[]) => {
    setOrders((prev) => prev.filter((o) => !orderIds.includes(o.id)));
  }, []);

  return { orders, loading, refetchOrder, removeOrdersLocal };
}
