import { useEffect, useRef } from "react";

const API = "http://localhost:4567";

/**
 * Connects to the SSE /stream endpoint and calls onEvent(type, data) for
 * every named event received. Auto-reconnects with exponential back-off.
 *
 * Note: EventSource cannot send custom headers, so the JWT token is passed
 * as a query param — the backend accepts this.
 */
export function useSSE(onEvent) {
  // Keep a stable ref so we never need to tear down / re-add the SSE listener
  // when onEvent changes (common when defined inline in a component).
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    let es = null;
    let retryDelay = 2000;
    let mounted = true;

    const connect = () => {
      if (!mounted) return;
      const token = localStorage.getItem("token") || "";
      es = new EventSource(`${API}/stream?token=${encodeURIComponent(token)}`);

      const handle = (type) => (e) => {
        try { handlerRef.current(type, JSON.parse(e.data)); }
        catch { /* ignore malformed payloads */ }
      };

      es.addEventListener("warehouse_event",  handle("warehouse_event"));
      es.addEventListener("accident_report",  handle("accident_report"));
      es.addEventListener("accident_update",  handle("accident_update"));
      es.addEventListener("task_event",       handle("task_event"));

      // Successful ping resets back-off
      es.addEventListener("ping", () => { retryDelay = 2000; });

      es.addEventListener("connected", () => {
        retryDelay = 2000;
        console.debug("[SSE] connected to warehouse stream");
      });

      es.onerror = () => {
        es.close();
        if (!mounted) return;
        // Exponential back-off capped at 30s
        retryDelay = Math.min(retryDelay * 2, 30_000);
        setTimeout(connect, retryDelay);
      };
    };

    connect();
    return () => {
      mounted = false;
      es?.close();
    };
  }, []); // intentionally empty — runs once per component mount
}
