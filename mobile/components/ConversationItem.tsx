import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
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

export default function ConversationItem({ conversation, onPress }: ConversationItemProps) {
  const displayName =
    conversation.name ??
    conversation.participants?.map(p => p.displayName ?? p.name ?? '?').join(', ') ??
    'Conversation';

  const lastTime = conversation.lastMessageAt
    ? formatDistanceToNow(new Date(conversation.lastMessageAt))
    : '';

  const unread = conversation.unreadCount ?? 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderBottomColor: colors.border,
        borderBottomWidth: 1,
        backgroundColor: unread > 0 ? `${colors.pink}08` : 'transparent',
      }}
    >
      <Avatar name={displayName} size="md" />

      <View style={{ flex: 1, marginLeft: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
          <Text
            style={{
              color: colors.text,
              fontWeight: unread > 0 ? '700' : '500',
              fontSize: 15,
              flex: 1,
            }}
            numberOfLines={1}
          >
            {displayName}
          </Text>
          {lastTime ? (
            <Text style={{ color: colors.muted, fontSize: 11 }}>{lastTime}</Text>
          ) : null}
        </View>
        {conversation.lastMessage ? (
          <Text
            style={{ color: colors.muted, fontSize: 13 }}
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
    </TouchableOpacity>
  );
}
