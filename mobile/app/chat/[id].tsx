import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  
  Alert,
  Animated,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { trpc } from '../../lib/trpc';
import { colors } from '../../lib/colors';
import Avatar from '../../components/Avatar';
import { formatDistanceToNow } from '../../lib/utils';
import { useAuth } from '../../lib/auth';

const REACTIONS = ['❤️', '😂', '😮', '👍', '🔥', '💀'];

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [selectedMessageId, setSelectedMessageId] = useState<number | null>(null);
  const [showReactions, setShowReactions] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const conversationId = Number(id);

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: messages, isLoading, refetch } = trpc.messages.messages.useQuery(
    { conversationId, limit: 100 },
    { enabled: !!id, staleTime: 5_000, refetchInterval: 5_000 },
  );

  const { data: conversations } = trpc.messages.conversations.useQuery(undefined, {
    enabled: !!id,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const conversation = (conversations as any[])?.find((c: any) => c.id === conversationId);
  const headerName =
    conversation?.name ??
    conversation?.participants
      ?.filter((p: any) => p.userId !== user?.id)
      .map((p: any) => p.displayName ?? p.name ?? '?')
      .join(', ') ??
    'Chat';

  const sendMutation = trpc.messages.send.useMutation({
    onSuccess: () => { setText(''); refetch(); },
    onError: (err) => Alert.alert('Could not send message', err.message),
  });

  const reactMutation = trpc.messages.addReaction.useMutation({
    onSuccess: () => { setShowReactions(false); setSelectedMessageId(null); refetch(); },
  });

  const markRead = trpc.messages.markRead.useMutation();

  // Mark conversation as read on mount
  React.useEffect(() => {
    if (conversationId) markRead.mutate({ conversationId });
  }, [conversationId]);

  const msgList = (messages as any[]) ?? [];

  // Memoize reversed list to prevent new array allocation every render
  const reversedMessages = useMemo(() => [...msgList].reverse(), [msgList]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    sendMutation.mutate({ conversationId, content: trimmed });
  }, [text, conversationId, sendMutation]);

  const handleLongPress = useCallback((messageId: number) => {
    setSelectedMessageId(messageId);
    setShowReactions(true);
  }, []);

  const handleReact = useCallback((emoji: string) => {
    if (!selectedMessageId) return;
    reactMutation.mutate({ messageId: selectedMessageId, emoji });
  }, [selectedMessageId, reactMutation]);

  const renderMessage = useCallback(({ item }: { item: any }) => {
    const isMine = item.senderId === user?.id;
    const timeAgo = item.createdAt ? formatDistanceToNow(new Date(item.createdAt)) : '';

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onLongPress={() => handleLongPress(item.id)}
        style={{
          flexDirection: isMine ? 'row-reverse' : 'row',
          alignItems: 'flex-end',
          marginHorizontal: 12,
          marginBottom: 10,
          gap: 8,
        }}
      >
        {!isMine && (
          <Avatar name={item.senderName} size="sm" />
        )}
        <View style={{ maxWidth: '75%' }}>
          {!isMine && item.senderName && (
            <Text style={{ color: colors.muted, fontSize: 11, marginBottom: 3, marginLeft: 4 }}>
              {item.senderName}
            </Text>
          )}
          <View
            style={{
              padding: 12,
              borderRadius: 18,
              borderBottomRightRadius: isMine ? 4 : 18,
              borderBottomLeftRadius: isMine ? 18 : 4,
              backgroundColor: isMine ? colors.pink : colors.card,
            }}
          >
            {item.isDeleted ? (
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontStyle: 'italic', fontSize: 14 }}>
                Message deleted
              </Text>
            ) : (
              <Text style={{ color: '#fff', fontSize: 15, lineHeight: 20 }}>
                {item.content}
              </Text>
            )}
          </View>
          <Text
            style={{
              color: colors.muted,
              fontSize: 10,
              marginTop: 3,
              textAlign: isMine ? 'right' : 'left',
              marginHorizontal: 4,
            }}
          >
            {timeAgo}
          </Text>
          {/* Reactions */}
          {item.reactions && item.reactions.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
              {item.reactions.map((r: any, i: number) => (
                <View
                  key={i}
                  style={{
                    backgroundColor: colors.card,
                    borderRadius: 10,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderColor: colors.border,
                    borderWidth: 1,
                  }}
                >
                  <Text style={{ fontSize: 12 }}>{r.emoji} {r.count}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [user?.id]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 14,
            paddingVertical: 12,
            borderBottomColor: colors.border,
            borderBottomWidth: 1,
            gap: 12,
          }}
        >
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Avatar name={headerName} size="sm" />
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', flex: 1 }} numberOfLines={1}>
            {headerName}
          </Text>
        </View>

        {/* Messages */}
        {isLoading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator color={colors.pink} size="large" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={reversedMessages}
            keyExtractor={(item: any) => String(item.id)}
            renderItem={renderMessage}
            inverted
            removeClippedSubviews={true}
            maxToRenderPerBatch={15}
            windowSize={7}
            initialNumToRender={20}
            updateCellsBatchingPeriod={50}
            contentContainerStyle={{ paddingVertical: 12 }}
            ListEmptyComponent={
              <View style={{ flex: 1, alignItems: 'center', paddingTop: 60 }}>
                <Text style={{ color: colors.muted, fontSize: 15 }}>No messages yet</Text>
                <Text style={{ color: colors.border, fontSize: 13, marginTop: 4 }}>
                  Say hello! 👋
                </Text>
              </View>
            }
          />
        )}

        {/* Input bar */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            paddingHorizontal: 12,
            paddingVertical: 10,
            paddingBottom: insets.bottom + 10,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            backgroundColor: colors.bg,
            gap: 8,
          }}
        >
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Message…"
            placeholderTextColor="#6B7280"
            multiline
            maxLength={2000}
            style={{
              flex: 1,
              backgroundColor: colors.card,
              borderColor: text.trim() ? colors.pink : colors.border,
              borderWidth: 1,
              borderRadius: 20,
              paddingHorizontal: 14,
              paddingVertical: 10,
              color: '#FFFFFF',
              fontSize: 15,
              maxHeight: 120,
            }}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!text.trim() || sendMutation.isPending}
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: text.trim() ? colors.pink : colors.border,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {sendMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="send" size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Reaction picker */}
      <Modal visible={showReactions} transparent animationType="fade">
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}
          activeOpacity={1}
          onPress={() => { setShowReactions(false); setSelectedMessageId(null); }}
        >
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: colors.card,
              borderRadius: 30,
              padding: 10,
              gap: 8,
              borderColor: colors.border,
              borderWidth: 1,
            }}
          >
            {REACTIONS.map(emoji => (
              <TouchableOpacity
                key={emoji}
                onPress={() => handleReact(emoji)}
                style={{ padding: 8 }}
              >
                <Text style={{ fontSize: 26 }}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
