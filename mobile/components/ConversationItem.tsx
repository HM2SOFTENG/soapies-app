import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { colors } from '../lib/colors';
import Avatar from './Avatar';
import { formatDistanceToNow } from '../lib/utils';

type Props = {
  conversation: any;
  onPress: () => void;
};

export default function ConversationItem({ conversation, onPress }: Props) {
  const other = conversation.participants?.find((p: any) => !p.isMe) ?? conversation.otherUser ?? {};
  const lastMsg = conversation.lastMessage;
  const unread = conversation.unreadCount ?? 0;
  const timeStr = lastMsg?.createdAt ? formatDistanceToNow(new Date(lastMsg.createdAt)) : '';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomColor: colors.border,
        borderBottomWidth: 1,
        backgroundColor: unread > 0 ? `${colors.pink}08` : 'transparent',
      }}
    >
      <Avatar name={other.name ?? conversation.name ?? '?'} url={other.avatarUrl} size={48} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: colors.text, fontWeight: unread > 0 ? '700' : '500', fontSize: 15 }}>
            {other.name ?? conversation.name ?? 'Conversation'}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 11 }}>{timeStr}</Text>
        </View>
        {lastMsg?.content && (
          <Text
            numberOfLines={1}
            style={{ color: unread > 0 ? colors.text : colors.muted, fontSize: 13, marginTop: 2 }}
          >
            {lastMsg.content}
          </Text>
        )}
      </View>
      {unread > 0 && (
        <View
          style={{
            backgroundColor: colors.pink,
            borderRadius: 10,
            minWidth: 20,
            height: 20,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 5,
            marginLeft: 8,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{unread}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
