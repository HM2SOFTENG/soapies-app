import React, { useRef, useEffect } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../lib/colors';

// ── Channel metadata ─────────────────────────────────────────────────────────
function getChannelMeta(name: string): { emoji: string; gradient: [string, string] } {
  const n = (name ?? '').toLowerCase();
  if (n.includes('admin'))   return { emoji: '🛡️', gradient: ['#6366F1', '#8B5CF6'] };
  if (n.includes('angel'))   return { emoji: '💗', gradient: ['#EC4899', '#F472B6'] };
  if (n.includes('women') || n.includes('ladies')) return { emoji: '♀️', gradient: ['#EC4899', '#A855F7'] };
  if (n.includes('men') || n.includes('guys'))     return { emoji: '♂️', gradient: ['#6366F1', '#A855F7'] };
  if (n.includes('queer') || n.includes('gay') || n.includes('gaypeez')) return { emoji: '🌈', gradient: ['#F59E0B', '#EC4899'] };
  if (n.includes('community') || n.includes('soapies')) return { emoji: '🎉', gradient: ['#EC4899', '#A855F7'] };
  if (n.includes('groupus') || n.includes('groupies')) return { emoji: '💑', gradient: ['#A855F7', '#6366F1'] };
  return { emoji: '💬', gradient: ['#A855F7', '#EC4899'] };
}

// ── Time format (WhatsApp-style) ─────────────────────────────────────────────
function formatTime(date: string | Date | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60_000);
  const hrs  = Math.floor(diff / 3_600_000);

  // Same day → show time
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  // Yesterday
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  // This week → day name
  if (diff < 7 * 86_400_000) return d.toLocaleDateString('en-US', { weekday: 'short' });
  // Older → date
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
  // Server returns these for DMs (flat, from getUserConversations enrichment)
  otherUserAvatarUrl?: string | null;
  otherUserId?: number | null;
  // Legacy participants array (fallback)
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
  const isChannel  = conversation.type === 'channel';
  const unread     = conversation.unreadCount ?? 0;
  const hasUnread  = unread > 0;

  const pressAnim = useRef(new Animated.Value(1)).current;

  const displayName = isChannel
    ? (conversation.name ?? 'Channel')
    : (conversation.name || conversation.participants?.map(p => p.displayName ?? p.name ?? '').filter(Boolean).join(', ') || 'Direct Message');

  const meta     = getChannelMeta(displayName);
  // Server enriches DMs with otherUserAvatarUrl; fall back to participants array
  const dmAvatar = !isChannel
    ? (conversation.otherUserAvatarUrl ?? conversation.participants?.[0]?.avatarUrl ?? null)
    : null;
  const initials = displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const preview = conversation.lastMessage?.trim()
    ? conversation.lastMessage
    : isChannel
      ? 'No messages yet'
      : 'Start a conversation';

  function handlePressIn() {
    Animated.timing(pressAnim, { toValue: 0.97, duration: 80, useNativeDriver: true }).start();
  }
  function handlePressOut() {
    Animated.timing(pressAnim, { toValue: 1, duration: 120, useNativeDriver: true }).start();
  }

  return (
    <Pressable
      onPress={() => { Haptics.selectionAsync(); onPress(); }}
      onLongPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onLongPress?.(); }}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 11,
        transform: [{ scale: pressAnim }],
      }}>
        {/* ── Avatar ── */}
        <View style={{ marginRight: 13, position: 'relative' }}>
          {isChannel ? (
            <LinearGradient
              colors={meta.gradient}
              style={{ width: 54, height: 54, borderRadius: 17, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontSize: 24 }}>{meta.emoji}</Text>
            </LinearGradient>
          ) : dmAvatar ? (
            <View style={{ width: 54, height: 54, borderRadius: 27, overflow: 'hidden',
              borderWidth: 1.5, borderColor: hasUnread ? colors.pink : 'transparent' }}>
              <Image source={{ uri: dmAvatar }} style={{ width: 54, height: 54 }} />
            </View>
          ) : (
            <LinearGradient
              colors={[colors.purple, colors.pink]}
              style={{ width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 19 }}>{initials}</Text>
            </LinearGradient>
          )}

          {/* Unread ring on channel avatar */}
          {isChannel && hasUnread && (
            <View style={{
              position: 'absolute', inset: -2, borderRadius: 19,
              borderWidth: 2, borderColor: colors.pink,
            }} />
          )}

          {/* Online dot for DMs */}
          {!isChannel && (
            <View style={{
              position: 'absolute', bottom: 1, right: 1,
              width: 13, height: 13, borderRadius: 7,
              backgroundColor: '#10B981', borderWidth: 2, borderColor: colors.bg,
            }} />
          )}
        </View>

        {/* ── Body ── */}
        <View style={{ flex: 1, minWidth: 0 }}>
          {/* Row 1: name + time */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Text
              style={{
                color: hasUnread ? '#fff' : colors.text,
                fontWeight: hasUnread ? '700' : '500',
                fontSize: 15.5, flex: 1, letterSpacing: 0.1,
              }}
              numberOfLines={1}
            >
              {displayName}
            </Text>
            <Text style={{
              color: hasUnread ? colors.pink : colors.muted,
              fontSize: 12,
              fontWeight: hasUnread ? '600' : '400',
              marginLeft: 8,
            }}>
              {formatTime(conversation.lastMessageAt)}
            </Text>
          </View>

          {/* Row 2: preview + badge */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text
              style={{
                color: hasUnread ? '#D1D5DB' : '#6B7280',
                fontSize: 13.5,
                flex: 1,
                fontWeight: hasUnread ? '500' : '400',
                lineHeight: 18,
              }}
              numberOfLines={1}
            >
              {preview}
            </Text>

            {hasUnread ? (
              <View style={{
                backgroundColor: colors.pink, borderRadius: 11,
                minWidth: 22, height: 22, alignItems: 'center',
                justifyContent: 'center', paddingHorizontal: 6, marginLeft: 8,
              }}>
                <Text style={{ color: '#fff', fontSize: 11.5, fontWeight: '800' }}>
                  {unread > 99 ? '99+' : unread}
                </Text>
              </View>
            ) : (
              // Delivered checkmark (decorative for now)
              conversation.lastMessage ? (
                <Ionicons name="checkmark-done" size={15} color="#4B5563" style={{ marginLeft: 6 }} />
              ) : null
            )}
          </View>
        </View>
      </Animated.View>

      {/* Separator */}
      <View style={{ height: 0.5, backgroundColor: '#1F1F2E', marginLeft: 83 }} />
    </Pressable>
  );
});
