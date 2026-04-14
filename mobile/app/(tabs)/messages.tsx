import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useCallback, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  Animated,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { trpc } from '../../lib/trpc';
import { colors } from '../../lib/colors';
import ConversationItem from '../../components/ConversationItem';

// ── Skeleton loader ───────────────────────────────────────────────────────────
function ConversationSkeleton() {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 700, useNativeDriver: true }),
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
        borderBottomColor: colors.border,
        borderBottomWidth: 1,
      }}
    >
      {/* Avatar circle */}
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: colors.border,
        }}
      />
      <View style={{ marginLeft: 12, gap: 8, flex: 1 }}>
        <View style={{ width: '55%', height: 13, borderRadius: 6, backgroundColor: colors.border }} />
        <View style={{ width: '80%', height: 11, borderRadius: 5, backgroundColor: colors.border }} />
      </View>
    </Animated.View>
  );
}

export default function MessagesScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = trpc.messages.conversations.useQuery(undefined, {
    staleTime: 10_000,
    refetchInterval: 15_000,
  });

  const markAllRead = trpc.messages.markAllConversationsRead.useMutation({
    onSuccess: () => {
      console.log('[Messages] marked all conversations read');
      refetch();
    },
  });

  // Map server fields to ConversationItem expected fields
  // Server returns updatedAt (not lastMessageAt) and may not include unreadCount
  const conversations = ((data as any[]) ?? []).map((c: any) => ({
    ...c,
    lastMessageAt: c.lastMessageAt ?? c.updatedAt ?? null,
    lastMessage: c.lastMessage ?? c.lastMessageContent ?? null,
    unreadCount: c.unreadCount ?? 0,
    name: c.name ?? c.otherUserName ?? null,
  }));
  const hasUnread = conversations.some((c: any) => (c.unreadCount ?? 0) > 0);

  const renderConversation = useCallback(
    ({ item }: { item: any }) => (
      <ConversationItem
        conversation={item}
        onPress={() => router.push(`/chat/${item.id}` as any)}
        onLongPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          Alert.alert(
            item.name ?? 'Conversation',
            'What would you like to do?',
            [
              {
                text: 'Mark as Read',
                onPress: () => {
                  // mark individual conversation read
                  console.log('[Messages] marking conversation read:', item.id);
                },
              },
              { text: 'Cancel', style: 'cancel' },
            ],
          );
        }}
      />
    ),
    [router],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingVertical: 14,
          borderBottomColor: colors.border,
          borderBottomWidth: 1,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: 28, fontWeight: '700', flex: 1 }}>
          Messages
        </Text>
        {hasUnread && (
          <TouchableOpacity
            onPress={() => { Haptics.selectionAsync(); markAllRead.mutate(); }}
            disabled={markAllRead.isPending}
            style={{ marginRight: 14 }}
          >
            <Text style={{ color: colors.pink, fontWeight: '600', fontSize: 13 }}>Mark all read</Text>
          </TouchableOpacity>
        )}
        <Pressable
          style={({ pressed }) => ({
            transform: [{ scale: pressed ? 0.9 : 1 }],
          })}
          onPress={() => { Haptics.selectionAsync(); router.push('/members' as any); }}
        >
          <Ionicons name="create-outline" size={24} color={colors.pink} />
        </Pressable>
      </View>

      {isLoading ? (
        <View>
          <ConversationSkeleton />
          <ConversationSkeleton />
          <ConversationSkeleton />
          <ConversationSkeleton />
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item: any) => String(item.id)}
          renderItem={renderConversation}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={10}
          updateCellsBatchingPeriod={50}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.pink}
            />
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 }}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>💬</Text>
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: 18,
                  fontWeight: '600',
                  textAlign: 'center',
                  marginBottom: 8,
                }}
              >
                No conversations yet
              </Text>
              <Text
                style={{
                  color: '#9CA3AF',
                  fontSize: 15,
                  fontWeight: '400',
                  textAlign: 'center',
                  marginBottom: 24,
                }}
              >
                Find a member and say hello
              </Text>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/members' as any);
                }}
                style={({ pressed }) => ({
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: colors.pink,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                })}
              >
                <Text style={{ color: colors.pink, fontWeight: '700', fontSize: 15 }}>
                  Browse Members
                </Text>
              </Pressable>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
