# Soapies Mobile 📱

React Native Expo app for the Soapies platform — an exclusive social club app.

## What This Is

A fully-featured mobile app connecting to the existing Soapies backend (Express + tRPC + Drizzle Postgres). No new server — same API, new client.

### Features
- 🔐 Auth (login/register with approval flow)
- 📜 Wall/Feed — posts, likes, reactions, comments
- 🎟️ Events — browse, filter by community, reserve tickets
- 💬 Real-time messaging — DMs and group conversations
- 👤 Member profiles
- 🔔 Notifications
- 🎨 Pink/purple brand (dark mode throughout)

## Stack

- **Expo** (SDK 54) with **Expo Router** (file-based routing)
- **NativeWind** (Tailwind for React Native)
- **tRPC** client → connects to existing `/api/trpc` endpoint
- **TanStack Query** for data fetching
- **SecureStore** for JWT persistence
- **expo-linear-gradient**, **@expo/vector-icons** for UI

## Running Locally

```bash
# From repo root
cd mobile
npx expo start
```

Then press `i` for iOS simulator, `a` for Android, or scan the QR with Expo Go.

## Environment Variables

Create a `.env` file in this directory (already included, edit as needed):

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

For physical device testing, replace `localhost` with your machine's local IP:
```env
EXPO_PUBLIC_API_URL=http://192.168.1.X:3000
```

## Connecting to the Backend

The mobile app imports tRPC router types directly:
```ts
import type { AppRouter } from '../../server/routers';
```

This gives full end-to-end type safety — same types as the web client.

The tRPC client (`lib/trpc.ts`) uses `httpBatchLink` with Bearer token auth via `expo-secure-store`.

> **Note:** The existing backend uses cookie-based sessions. You may need to add Bearer token support to the server's auth middleware, or switch to cookie forwarding. The app currently stores a session token in SecureStore and sends it as `Authorization: Bearer <token>`.

## Project Structure

```
mobile/
├── app/                   # Expo Router screens
│   ├── _layout.tsx        # Root layout (providers, auth guard)
│   ├── (auth)/            # Login, register
│   ├── (tabs)/            # Main tab screens
│   │   ├── index.tsx      # Feed/Wall
│   │   ├── events.tsx     # Events listing
│   │   ├── messages.tsx   # Conversations
│   │   ├── profile.tsx    # My profile
│   │   └── notifications.tsx
│   ├── chat/[id].tsx      # Chat room
│   ├── event/[id].tsx     # Event detail
│   └── member/[id].tsx    # Member profile
├── components/            # Shared UI components
│   ├── Avatar.tsx
│   ├── PostCard.tsx
│   ├── EventCard.tsx
│   ├── ConversationItem.tsx
│   ├── GradientButton.tsx
│   └── LoadingSpinner.tsx
├── lib/                   # Utilities
│   ├── trpc.ts            # tRPC client setup
│   ├── auth.tsx           # Auth context + hooks
│   ├── colors.ts          # Brand color constants
│   └── utils.ts           # Helpers (date formatting, etc.)
└── global.css             # NativeWind base styles
```

## What Still Needs Wiring

1. **Post composer** — FAB opens a sheet to create new posts (mutation ready, UI stub)
2. **Message reactions** — long-press reaction picker (backend call ready)
3. **Event addons** — addon selector on event detail (needs addon API)
4. **Push notifications** — integrate `expo-notifications` + server webhook
5. **WebSocket real-time** — server has WebSocket support; wire up with `expo-websocket` or similar
6. **New conversation flow** — "+" button on messages to start a new DM
7. **Image uploads** — `expo-image-picker` installed, needs upload integration
8. **Bearer token server support** — server may need middleware update to accept `Authorization` header instead of cookies
