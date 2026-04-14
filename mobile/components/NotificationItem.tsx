import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../lib/colors';
import { formatDistanceToNow } from '../lib/utils';

interface NotifIconConfig {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}

function getIconConfig(type?: string | null): NotifIconConfig {
  const map: Record<string, NotifIconConfig> = {
    message: { name: 'chatbubbles', color: colors.pink },
    event: { name: 'calendar', color: '#10B981' },
    like: { name: 'heart', color: colors.pink },
    comment: { name: 'chatbubble', color: colors.purple },
    system: { name: 'notifications', color: colors.violet },
    approval: { name: 'checkmark-circle', color: '#10B981' },
    rejection: { name: 'close-circle', color: '#EF4444' },
  };
  return map[type ?? ''] ?? { name: 'notifications', color: colors.muted };
}

export interface NotificationData {
  id: number;
  type?: string | null;
  title?: string | null;
  body?: string | null;
  createdAt?: string | null;
  readAt?: string | null;
}

interface NotificationItemProps {
  notification: NotificationData;
}

export default function NotificationItem({ notification }: NotificationItemProps) {
  const icon = getIconConfig(notification.type);
  const timeAgo = notification.createdAt
    ? formatDistanceToNow(new Date(notification.createdAt))
    : '';
  const isUnread = !notification.readAt;

  return (
    <View
      style={{
        flexDirection: 'row',
        padding: 16,
        borderBottomColor: colors.border,
        borderBottomWidth: 1,
        backgroundColor: isUnread ? `${colors.pink}08` : 'transparent',
        borderLeftWidth: isUnread ? 3 : 0,
        borderLeftColor: isUnread ? colors.pink : 'transparent',
      }}
    >
      {/* Icon circle */}
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: `${icon.color}22`,
          justifyContent: 'center',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <Ionicons name={icon.name} size={18} color={icon.color} />
      </View>

      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text
          style={{
            color: colors.text,
            fontWeight: isUnread ? '700' : '400',
            fontSize: 14,
            marginBottom: 2,
          }}
        >
          {notification.title ?? notification.type ?? 'Notification'}
        </Text>
        {notification.body ? (
          <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 18 }}>
            {notification.body}
          </Text>
        ) : null}
        <Text style={{ color: colors.border, fontSize: 11, marginTop: 4 }}>{timeAgo}</Text>
      </View>

      {isUnread && (
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: colors.pink,
            marginTop: 6,
            flexShrink: 0,
          }}
        />
      )}
    </View>
  );
}
