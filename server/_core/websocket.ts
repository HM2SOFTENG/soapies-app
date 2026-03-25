import { WebSocketServer, WebSocket } from "ws";
import type { Server as HttpServer } from "http";
import { parse as parseCookie } from "cookie";
import { sdk } from "./sdk";
import { getUserByOpenId } from "../db";

interface WebSocketMessage {
  type: "new_message" | "typing_start" | "typing_stop" | "message_read" | "presence_update" | "auth";
  data?: any;
  token?: string;
}

interface AuthenticatedWebSocket extends WebSocket {
  userId?: number;
  isAuthenticated?: boolean;
}

// Map userId → Set of WebSocket connections
const userConnections = new Map<number, Set<AuthenticatedWebSocket>>();

// Map conversationId → Set of userId watching it
const conversationWatchers = new Map<number, Set<number>>();

export async function initializeWebSocket(server: HttpServer) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", async (ws: AuthenticatedWebSocket, req) => {
    console.log("[WebSocket] New connection attempt from", req.socket.remoteAddress);

    // Parse session cookie from upgrade request
    const cookies = req.headers.cookie;
    let userId: number | null = null;

    if (cookies) {
      try {
        const parsed = parseCookie(cookies);
        const sessionCookie = parsed["app_session_id"];
        if (sessionCookie) {
          const session = await sdk.verifySession(sessionCookie);
          if (session) {
            const user = await getUserByOpenId(session.openId);
            if (user) {
              userId = user.id;
              ws.userId = userId;
              ws.isAuthenticated = true;

              // Register this connection
              if (!userConnections.has(userId)) {
                userConnections.set(userId, new Set());
              }
              userConnections.get(userId)!.add(ws);

              console.log(`[WebSocket] User ${userId} authenticated`);
              ws.send(JSON.stringify({ type: "auth", data: { authenticated: true, userId } }));
            }
          }
        }
      } catch (err) {
        console.error("[WebSocket] Auth error:", err);
      }
    }

    if (!userId) {
      console.log("[WebSocket] Connection rejected - no valid auth");
      ws.send(JSON.stringify({ type: "auth", data: { authenticated: false } }));
      ws.close(1008, "Unauthorized");
      return;
    }

    // Handle messages
    ws.on("message", (rawData) => {
      try {
        const msg: WebSocketMessage = JSON.parse(rawData.toString());
        handleWebSocketMessage(ws, userId!, msg);
      } catch (err) {
        console.error("[WebSocket] Message parse error:", err);
      }
    });

    // Cleanup on disconnect
    ws.on("close", () => {
      if (userId) {
        const connections = userConnections.get(userId);
        if (connections) {
          connections.delete(ws);
          if (connections.size === 0) {
            userConnections.delete(userId);
          }
        }

        // Remove from all watched conversations
        for (const [convId, watchers] of conversationWatchers) {
          watchers.delete(userId);
          if (watchers.size === 0) {
            conversationWatchers.delete(convId);
          }
        }

        console.log(`[WebSocket] User ${userId} disconnected`);
      }
    });

    ws.on("error", (err) => {
      console.error("[WebSocket] Error:", err);
    });
  });

  console.log("[WebSocket] Server initialized on path /ws");
  return wss;
}

function handleWebSocketMessage(
  ws: AuthenticatedWebSocket,
  userId: number,
  msg: WebSocketMessage
) {
  switch (msg.type) {
    case "new_message":
      // Broadcast to all watchers of this conversation
      if (msg.data?.conversationId) {
        broadcastToConversation(msg.data.conversationId, "new_message", msg.data);
      }
      break;

    case "typing_start":
      if (msg.data?.conversationId) {
        broadcastToConversation(msg.data.conversationId, "typing_start", {
          userId,
          conversationId: msg.data.conversationId,
        });
      }
      break;

    case "typing_stop":
      if (msg.data?.conversationId) {
        broadcastToConversation(msg.data.conversationId, "typing_stop", {
          userId,
          conversationId: msg.data.conversationId,
        });
      }
      break;

    case "message_read":
      if (msg.data?.conversationId) {
        broadcastToConversation(msg.data.conversationId, "message_read", {
          userId,
          messageId: msg.data.messageId,
          conversationId: msg.data.conversationId,
        });
      }
      break;

    case "presence_update":
      // Mark user as online in this conversation
      if (msg.data?.conversationId) {
        if (!conversationWatchers.has(msg.data.conversationId)) {
          conversationWatchers.set(msg.data.conversationId, new Set());
        }
        conversationWatchers.get(msg.data.conversationId)!.add(userId);

        broadcastToConversation(msg.data.conversationId, "presence_update", {
          userId,
          conversationId: msg.data.conversationId,
          status: "online",
        });
      }
      break;
  }
}

export function broadcastToConversation(
  conversationId: number,
  event: string,
  data: any
) {
  const watchers = conversationWatchers.get(conversationId);
  if (!watchers || watchers.size === 0) return;

  const message = JSON.stringify({ type: event, data });
  for (const userId of watchers) {
    const connections = userConnections.get(userId);
    if (connections) {
      for (const ws of connections) {
        if (ws.readyState === 1) { // WebSocket.OPEN
          ws.send(message);
        }
      }
    }
  }
}

export function broadcastToUser(userId: number, event: string, data: any) {
  const connections = userConnections.get(userId);
  if (!connections) return;

  const message = JSON.stringify({ type: event, data });
  for (const ws of connections) {
    if (ws.readyState === 1) { // WebSocket.OPEN
      ws.send(message);
    }
  }
}

// Export for server-side broadcasts (e.g., from tRPC mutations)
export function notifyMessageCreated(conversationId: number, message: any) {
  broadcastToConversation(conversationId, "new_message", {
    id: message.id,
    conversationId,
    senderId: message.senderId,
    content: message.content,
    attachmentUrl: message.attachmentUrl,
    attachmentType: message.attachmentType,
    createdAt: message.createdAt,
  });
}

export function notifyTyping(conversationId: number, userId: number, isTyping: boolean) {
  broadcastToConversation(
    conversationId,
    isTyping ? "typing_start" : "typing_stop",
    { userId, conversationId }
  );
}
