import React from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../lib/colors';

// ── Channel icon + gradient by name ─────────────────────────────────────────
function getChannelIcon(name: string): { emoji: string; gradient: [string, string] } {
  const n = (name ?? '').toLowerCase();
  if (n.includes('admin')) return { emoji: '🛡️', gradient: ['#6366F1', '#8B5CF6'] };
  if (n.includes('angel')) return { emoji: '💗', gradient: [colors.pink, '#F472B6'] };
  if (n.includes('women') || n.includes('ladies')) return { emoji: '♀️', gradient: [colors.pink, colors.purple] };
  if (n.includes('men') || n.includes('guys')) return { emoji: '♂️', gradient: [colors.purple, '#6366F1'] };
  if (n.includes('queer') || n.includes('gay') || n.includes('gaypeez')) return { emoji: '🌈', gradient: ['#F59E0B', '#EC4899'] };
  if (n.includes('community') || n.includes('soapies') || n.includes('groupus')) return { emoji: '🎉', gradient: [colors.pink, colors.purple] };
  return { emoji: '💬', gradient: [colors.purple, colors.pink] };
}

// ── Relative time ────────────────────────────────────────────────────────────
function timeAgo(date: string | Date | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  if (hrs < 24) return `${hrs}h`;
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Types ────────────────────────────────────────────────────────────────────
export interface Conversation {
  id: number;
  name?: string | null;
  type?: string | null;
  lastMessage?: string | null;
  lastMessageAt?: string | Date | null;
  unreadCount?: number | null;
  participants?: Array<{
    displayName?: string | null;
    name?: string | null;
    avatarUrl?: string | null;
  }> | null;
  avatarUrl?: string | null;
}

interface Props {
  conversation: Conversation;
  onPress: () => void;
  onLongPress?: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────
export default React.memo(function ConversationItem({ conversation, onPress, onLongPress }: Props) {
  const isChannel = conversation.type === 'channel';
  const unread = conversation.unreadCount ?? 0;
  const hasUnread = unread > 0;

  const displayName = isChannel
    ? (conversation.name ?? 'Channel')
    : (conversation.participants?.map(p => p.displayName ?? p.name ?? '?').join(', ') ?? 'DM');

  const icon = getChannelIcon(displayName);
  const dmAvatar = !isChannel
    ? (conversation.participants?.[0]?.avatarUrl ?? conversation.avatarUrl ?? null)
    : null;
  const dmInitials = displayName
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Pressable
      onPress={() => { Haptics.selectionAsync(); onPress(); }}
      onLongPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onLongPress?.(); }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 13,
        backgroundColor: pressed
          ? `${colors.pink}18`
          : hasUnread
          ? `${colors.pink}08`
          : 'transparent',
      })}
    >
      {/* ── Avatar ── */}
      <View style={{ marginRight: 14, position: 'relative' }}>
        {isChannel ? (
          <LinearGradient
            colors={icon.gradient}
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 22 }}>{icon.emoji}</Text>
          </LinearGradient>
        ) : dmAvatar ? (
          <Image
            source={{ uri: dmAvatar }}
            style={{ width: 52, height: 52, borderRadius: 26 }}
          />
        ) : (
          <LinearGradient
            colors={[colors.purple, colors.pink]}
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 18 }}>{dmInitials}</Text>
          </LinearGradient>
        )}

        {/* Online indicator (placeholder) */}
        {!isChannel && (
          <View
            style={{
              position: 'absolute',
              bottom: 1,
              right: 1,
              width: 13,
              height: 13,
              borderRadius: 7,
              backgroundColor: '#10B981',
              borderWidth: 2,
              borderColor: colors.bg,
            }}
          />
        )}
      </View>

      {/* ── Content ── */}
      <View style={{ flex: 1, minWidth: 0 }}>
        {/* Name row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
          <Text
            style={{
              color: colors.text,
              fontWeight: hasUnread ? '700' : '500',
              fontSize: 15,
              flex: 1,
            }}
            numberOfLines={1}
          >
            {displayName}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 12, marginLeft: 8 }}>
            {timeAgo(conversation.lastMessageAt)}
          </Text>
        </View>

        {/* Preview row */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text
            style={{
              color: hasUnread ? colors.text : colors.muted,
              fontSize: 13,
              flex: 1,
              fontWeight: hasUnread ? '500' : '400',
            }}
            numberOfLines={1}
          >
            {conversation.lastMessage ?? (isChannel ? 'Tap to open chat' : 'Start a conversation')}
          </Text>

          {hasUnread && (
            <View
              style={{
                backgroundColor: colors.pink,
                borderRadius: 10,
                minWidth: 20,
                height: 20,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 6,
                marginLeft: 8,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>
                {unread > 99 ? '99+' : unread}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
});
