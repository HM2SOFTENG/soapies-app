import { useEffect, useRef, useState, useCallback } from "react";

interface WebSocketMessage {
  type: string;
  data?: any;
}

interface UseWebSocketReturn {
  sendMessage: (type: string, data: any) => void;
  lastMessage: WebSocketMessage | null;
  isConnected: boolean;
  subscribe: (callback: (msg: WebSocketMessage) => void) => () => void;
}

export function useWebSocket(): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 10;
  const baseReconnectDelay = 1000;
  const subscribersRef = useRef<Set<(msg: WebSocketMessage) => void>>(new Set());

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

      ws.onopen = () => {
        console.log("[WebSocket] Connected");
        setIsConnected(true);
        reconnectAttempts.current = 0;

        // Send auth token if available
        const cookies = document.cookie
          .split(";")
          .map((c) => c.trim())
          .reduce(
            (acc, c) => {
              const [k, v] = c.split("=");
              acc[k] = v;
              return acc;
            },
            {} as Record<string, string>
          );

        if (cookies.app_session_id) {
          ws.send(
            JSON.stringify({
              type: "auth",
              token: cookies.app_session_id,
            })
          );
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(msg);

          // Notify all subscribers
          subscribersRef.current.forEach((callback) => {
            try {
              callback(msg);
            } catch (err) {
              console.error("[WebSocket] Subscriber error:", err);
            }
          });
        } catch (err) {
          console.error("[WebSocket] Message parse error:", err);
        }
      };

      ws.onerror = (error) => {
        console.error("[WebSocket] Error:", error);
        setIsConnected(false);
      };

      ws.onclose = () => {
        console.log("[WebSocket] Disconnected");
        setIsConnected(false);
        wsRef.current = null;

        // Exponential backoff reconnect
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay =
            baseReconnectDelay * Math.pow(2, reconnectAttempts.current);
          reconnectAttempts.current += 1;
          console.log(`[WebSocket] Reconnecting in ${delay}ms...`);
          setTimeout(connect, delay);
        }
      };

      wsRef.current = ws;
    } catch (err) {
      console.error("[WebSocket] Connection error:", err);
      setIsConnected(false);
    }
  }, []);

  // Connect on mount
  useEffect(() => {
    connect();

    return () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const sendMessage = useCallback((type: string, data: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, data }));
    } else {
      console.warn("[WebSocket] Not connected, cannot send message");
    }
  }, []);

  const subscribe = useCallback((callback: (msg: WebSocketMessage) => void) => {
    subscribersRef.current.add(callback);
    return () => {
      subscribersRef.current.delete(callback);
    };
  }, []);

  return {
    sendMessage,
    lastMessage,
    isConnected,
    subscribe,
  };
}
