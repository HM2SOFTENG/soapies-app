import React, { useMemo, useRef } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { formatDistanceToNow } from '../lib/utils';

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
}

interface NotificationItemProps {
  notification: NotificationData;
}

const NotificationItem = React.memo(function NotificationItem({ notification }: NotificationItemProps) {
  const router = useRouter();
  const scale = useRef(new Animated.Value(1)).current;

  function handlePress() {
    const type = notification.type ?? '';
    if (type === 'message' && notification.targetId) {
      router.push('/chat/' + notification.targetId as any);
    } else if (type === 'event' && notification.targetId) {
      router.push('/event/' + notification.targetId as any);
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
          borderBottomColor: '#1A1A30',
          borderBottomWidth: 1,
          backgroundColor: '#10101C',
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
            backgroundColor: `${icon.color}33`,
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
              color: '#F1F0FF',
              fontWeight: '700',
              fontSize: 14,
              marginBottom: 2,
            }}
          >
            {notification.title ?? notification.type ?? 'Notification'}
          </Text>
          {notification.body ? (
            <Text style={{ color: '#A09CB8', fontSize: 13, lineHeight: 18 }}>
              {notification.body}
            </Text>
          ) : null}
          <Text style={{ color: '#5A5575', fontSize: 11, marginTop: 4 }}>{timeAgo}</Text>
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
