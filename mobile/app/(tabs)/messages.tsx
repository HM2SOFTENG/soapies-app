import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useCallback, useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  SectionList,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { trpc } from '../../lib/trpc';
import { colors } from '../../lib/colors';
import { useAuth } from '../../lib/auth';
import ConversationItem from '../../components/ConversationItem';

// ── Skeleton loader ───────────────────────────────────────────────────────────
function ConversationSkeleton() {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.85, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={{
        opacity,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
      }}
    >
      <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: colors.border }} />
      <View style={{ marginLeft: 14, gap: 8, flex: 1 }}>
        <View style={{ width: '50%', height: 13, borderRadius: 6, backgroundColor: colors.border }} />
        <View style={{ width: '75%', height: 11, borderRadius: 5, backgroundColor: colors.border }} />
      </View>
    </Animated.View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function MessagesScreen() {
  const router = useRouter();
  const { hasToken } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, refetch } = trpc.messages.conversations.useQuery(undefined, {
    enabled: hasToken,
    staleTime: 10_000,
    refetchInterval: 15_000,
  });

  const markAllRead = trpc.messages.markAllConversationsRead.useMutation({
    onSuccess: () => refetch(),
  });

  const markReadMutation = trpc.messages.markRead.useMutation({
    onSuccess: () => refetch(),
  });

  // Normalize server fields
  const conversations = useMemo(() => {
    const raw = (data as any[]) ?? [];
    return raw.map(c => ({
      ...c,
      lastMessageAt: c.lastMessageAt ?? c.updatedAt ?? null,
      lastMessage: c.lastMessage ?? c.lastMessagePreview ?? c.lastMessageContent ?? null,
      unreadCount: c.unreadCount ?? 0,
      name: c.name ?? c.otherUserName ?? null,
    }));
  }, [data]);

  // Total unread badge
  const totalUnread = useMemo(
    () => conversations.reduce((sum: number, c: any) => sum + (c.unreadCount ?? 0), 0),
    [conversations],
  );

  // Filtered + sectioned
  const sections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = q
      ? conversations.filter((c: any) => {
          const name =
            c.name ??
            c.participants?.map((p: any) => p.displayName ?? p.name ?? '').join(' ') ??
            '';
          return (
            name.toLowerCase().includes(q) ||
            (c.lastMessage ?? '').toLowerCase().includes(q)
          );
        })
      : conversations;

    const channels = filtered.filter((c: any) => c.type === 'channel');
    const dms = filtered.filter((c: any) => c.type !== 'channel');

    const result: { title: string; data: any[] }[] = [];
    if (channels.length) result.push({ title: 'CHANNELS', data: channels });
    if (dms.length) result.push({ title: 'DIRECT MESSAGES', data: dms });
    return result;
  }, [conversations, searchQuery]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  function handleLongPress(conv: any) {
    Alert.alert(
      conv.name ?? 'Conversation',
      '',
      [
        {
          text: 'Mark as Read',
          onPress: () => markReadMutation.mutate({ conversationId: conv.id }),
        },
        {
          text: 'Mute Notifications',
          onPress: () => {
            // TODO: implement mute
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>

      {/* ── Header ── */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: 12,
        }}
      >
        <Text style={{ color: colors.text, fontSize: 28, fontWeight: '900', flex: 1 }}>
          Messages
        </Text>

        {/* Unread count badge next to title */}
        {totalUnread > 0 && (
          <View
            style={{
              backgroundColor: colors.pink,
              borderRadius: 10,
              paddingHorizontal: 8,
              paddingVertical: 2,
              marginLeft: 10,
              marginRight: 6,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>
              {totalUnread > 99 ? '99+' : totalUnread}
            </Text>
          </View>
        )}

        {/* Mark all read */}
        <TouchableOpacity
          onPress={() => { Haptics.selectionAsync(); markAllRead.mutate(); }}
          disabled={markAllRead.isPending || totalUnread === 0}
          style={{ marginRight: 4, padding: 8, opacity: totalUnread > 0 ? 1 : 0.35 }}
        >
          <Ionicons name="checkmark-done-outline" size={22} color={colors.muted} />
        </TouchableOpacity>

        {/* New DM (future) */}
        <TouchableOpacity
          onPress={() => { Haptics.selectionAsync(); router.push('/members' as any); }}
          style={{ padding: 8 }}
        >
          <Ionicons name="create-outline" size={22} color={colors.pink} />
        </TouchableOpacity>
      </View>

      {/* ── Search bar ── */}
      <View
        style={{
          marginHorizontal: 16,
          marginBottom: 12,
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.card,
          borderRadius: 14,
          paddingHorizontal: 14,
          borderColor: colors.border,
          borderWidth: 1,
        }}
      >
        <Ionicons name="search-outline" size={17} color={colors.muted} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search conversations..."
          placeholderTextColor={colors.muted}
          style={{
            flex: 1,
            color: colors.text,
            paddingVertical: 11,
            paddingLeft: 10,
            fontSize: 15,
          }}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Content ── */}
      {isLoading ? (
        <View>
          {[1, 2, 3, 4, 5].map(i => <ConversationSkeleton key={i} />)}
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item: any) => String(item.id)}
          renderItem={({ item }) => (
            <ConversationItem
              conversation={item}
              onPress={() =>
                router.push({
                  pathname: '/chat/[id]',
                  params: { id: item.id },
                } as any)
              }
              onLongPress={() => handleLongPress(item)}
            />
          )}
          renderSectionHeader={({ section }) => (
            <View
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                paddingTop: 14,
                backgroundColor: colors.bg,
              }}
            >
              <Text
                style={{
                  color: colors.muted,
                  fontSize: 11,
                  fontWeight: '700',
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                }}
              >
                {section.title}
              </Text>
            </View>
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.pink}
            />
          }
          ListEmptyComponent={
            searchQuery ? (
              <View style={{ alignItems: 'center', paddingTop: 60 }}>
                <Ionicons name="search-outline" size={48} color={colors.border} />
                <Text style={{ color: colors.muted, marginTop: 12, fontSize: 15 }}>
                  No conversations found
                </Text>
              </View>
            ) : (
              <View style={{ alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 }}>
                <Text style={{ fontSize: 48, marginBottom: 12 }}>💬</Text>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 18,
                    fontWeight: '700',
                    marginBottom: 6,
                  }}
                >
                  No messages yet
                </Text>
                <Text
                  style={{
                    color: colors.muted,
                    textAlign: 'center',
                  }}
                >
                  Your community channels will appear here
                </Text>
              </View>
            )
          }
          stickySectionHeadersEnabled
          removeClippedSubviews
          maxToRenderPerBatch={10}
          windowSize={5}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}
    </SafeAreaView>
  );
}
