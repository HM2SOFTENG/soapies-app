import React from 'react';
import { View, Text, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import Avatar from './Avatar';
import { colors } from '../lib/colors';
import { formatDistanceToNow } from '../lib/utils';

export interface Conversation {
  id: number;
  name?: string | null;
  type?: string | null;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  unreadCount?: number | null;
  // Participants for DMs
  participants?: Array<{ displayName?: string | null; name?: string | null }> | null;
}

interface ConversationItemProps {
  conversation: Conversation;
  onPress: () => void;
}

const ConversationItem = React.memo(function ConversationItem({ conversation, onPress }: ConversationItemProps) {
  const displayName =
    conversation.name ??
    conversation.participants?.map((p) => p.displayName ?? p.name ?? '?').join(', ') ??
    'Conversation';

  const lastTime = conversation.lastMessageAt
    ? formatDistanceToNow(new Date(conversation.lastMessageAt))
    : '';

  const unread = conversation.unreadCount ?? 0;

  function handlePress() {
    Haptics.selectionAsync();
    onPress();
  }

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomColor: colors.border,
        borderBottomWidth: 1,
        backgroundColor: unread > 0
          ? `${colors.pink}0A`
          : pressed
          ? `${colors.card}80`
          : 'transparent',
        transform: [{ scale: pressed ? 0.99 : 1 }],
      })}
    >
      <Avatar name={displayName} size="md" />

      <View style={{ flex: 1, marginLeft: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
          <Text
            style={{
              color: '#FFFFFF',
              fontWeight: unread > 0 ? '700' : '500',
              fontSize: 15,
              flex: 1,
            }}
            numberOfLines={1}
          >
            {displayName}
          </Text>
          {lastTime ? (
            <Text style={{ color: '#9CA3AF', fontSize: 11, fontWeight: '400' }}>{lastTime}</Text>
          ) : null}
        </View>
        {conversation.lastMessage ? (
          <Text
            style={{
              color: unread > 0 ? '#E5E7EB' : '#9CA3AF',
              fontSize: 13,
              fontWeight: unread > 0 ? '500' : '400',
            }}
            numberOfLines={1}
          >
            {conversation.lastMessage}
          </Text>
        ) : null}
      </View>

      {unread > 0 && (
        <View
          style={{
            marginLeft: 8,
            backgroundColor: colors.pink,
            borderRadius: 10,
            minWidth: 20,
            height: 20,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 5,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
            {unread > 99 ? '99+' : unread}
          </Text>
        </View>
      )}
    </Pressable>
  );
});

export default ConversationItem;
