import React, { useMemo, useRef } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { formatDistanceToNow } from '../lib/utils';
import { useTheme } from '../lib/theme';

interface NotifIconConfig {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}

function getIconConfig(type?: string | null): NotifIconConfig {
  const map: Record<string, NotifIconConfig> = {
    message:  { name: 'chatbubbles',      color: '#EC4899' },
    event:    { name: 'calendar',         color: '#10B981' },
    like:     { name: 'heart',            color: '#EC4899' },
    comment:  { name: 'chatbubble',       color: '#A855F7' },
    system:   { name: 'notifications',    color: '#7C3AED' },
    approval: { name: 'checkmark-circle', color: '#10B981' },
    rejection:{ name: 'close-circle',     color: '#EF4444' },
  };
  return map[type ?? ''] ?? { name: 'notifications', color: '#9CA3AF' };
}

export interface NotificationData {
  id: number;
  type?: string | null;
  title?: string | null;
  body?: string | null;
  createdAt?: string | null;
  readAt?: string | null;
  targetId?: string | number | null;
  // server stores routing info here (conversationId, screen, eventId, etc.)
  data?: Record<string, any> | string | null;
}

interface NotificationItemProps {
  notification: NotificationData;
  onMarkRead?: (id: number) => void;
}

// Parse data field (may be JSON string or object)
function parseData(raw: Record<string, any> | string | null | undefined): Record<string, any> {
  if (!raw) return {};
  if (typeof raw === 'string') { try { return JSON.parse(raw); } catch { return {}; } }
  return raw;
}

// Resolve the route to navigate to based on notification type + data
function resolveRoute(type: string, data: Record<string, any>, targetId?: string | number | null): string | null {
  switch (type) {
    case 'message':
      // data.conversationId or targetId
      if (data.conversationId) return `/chat/${data.conversationId}`;
      if (targetId) return `/chat/${targetId}`;
      return '/messages';
    case 'event':
    case 'event_staff':
      if (data.eventId) return `/event/${data.eventId}`;
      if (targetId) return `/event/${targetId}`;
      return null;
    case 'like':
    case 'comment':
      // Wall posts — go to home feed (no dedicated post route yet)
      return null;
    case 'connection_request':
    case 'connection_accepted':
      return '/connections';
    case 'application_approved':
    case 'application_rejected':
    case 'application_waitlisted':
    case 'interview_scheduled':
      return null; // stay on alerts — these are status updates
    default:
      // Fall back to explicit screen in data
      if (data.screen) return data.screen;
      if (data.link && data.link.startsWith('/')) return data.link;
      return null;
  }
}

const NotificationItem = React.memo(function NotificationItem({ notification, onMarkRead }: NotificationItemProps) {
  const router = useRouter();
  const theme = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  function handlePress() {
    // Mark as read immediately on tap (optimistic — disappears from unread view)
    if (!notification.readAt) {
      onMarkRead?.(notification.id);
    }
    // Navigate
    const data = parseData(notification.data);
    const route = resolveRoute(notification.type ?? '', data, notification.targetId);
    if (route) {
      router.push(route as any);
    }
  }

  const onPressIn = () => {
    Animated.spring(scale, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  };

  const icon = useMemo(() => getIconConfig(notification.type), [notification.type]);
  const timeAgo = useMemo(
    () => (notification.createdAt ? formatDistanceToNow(new Date(notification.createdAt)) : ''),
    [notification.createdAt],
  );
  const isUnread = !notification.readAt;

  return (
    <TouchableOpacity
      onPress={handlePress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      activeOpacity={1}
    >
      <Animated.View
        style={{
          transform: [{ scale }],
          flexDirection: 'row',
          padding: 16,
          borderBottomColor: theme.colors.border,
          borderBottomWidth: 1,
          backgroundColor: theme.colors.surface,
          overflow: 'hidden',
        }}
      >
        {/* Left gradient accent for unread notifications */}
        {isUnread && (
          <LinearGradient
            colors={['#EC4899', '#A855F7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 3,
            }}
          />
        )}

        {/* Icon circle */}
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: theme.alpha(icon.color, 0.16),
            justifyContent: 'center',
            alignItems: 'center',
            flexShrink: 0,
            marginLeft: isUnread ? 8 : 0,
          }}
        >
          <Ionicons name={icon.name} size={18} color={icon.color} />
        </View>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text
            style={{
              color: theme.colors.text,
              fontWeight: '700',
              fontSize: 14,
              marginBottom: 2,
            }}
          >
            {notification.title ?? notification.type ?? 'Notification'}
          </Text>
          {notification.body ? (
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13, lineHeight: 18 }}>
              {notification.body}
            </Text>
          ) : null}
          <Text style={{ color: theme.colors.textMuted, fontSize: 11, marginTop: 4 }}>{timeAgo}</Text>
        </View>

        {isUnread && (
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: '#EC4899',
              marginTop: 6,
              flexShrink: 0,
            }}
          />
        )}
      </Animated.View>
    </TouchableOpacity>
  );
});

export default NotificationItem;
