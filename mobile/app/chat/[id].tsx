import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
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
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
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
  const sendScale = useRef(new Animated.Value(0.85)).current;

  const conversationId = Number(id);

  // Spring-animate send button when text becomes non-empty
  useEffect(() => {
    Animated.spring(sendScale, {
      toValue: text.trim() ? 1 : 0.85,
      useNativeDriver: true,
      friction: 6,
      tension: 80,
    }).start();
  }, [text]);

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
    onError: (err: any) => Alert.alert('Could not send message', err.message),
  });

  const reactMutation = trpc.messages.addReaction.useMutation({
    onSuccess: () => { setShowReactions(false); setSelectedMessageId(null); refetch(); },
  });

  const markRead = trpc.messages.markRead.useMutation();

  const blockMutation = trpc.blocking.block.useMutation({
    onSuccess: () => {
      Alert.alert('Blocked', 'This member has been blocked.');
      router.back();
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const reportMutation = trpc.blocking.report.useMutation({
    onSuccess: () => Alert.alert('Report Submitted', 'Thank you. Our team will review this report.'),
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  function handleChatOptions() {
    const otherId = conversation?.otherUserId;
    if (!otherId || conversation?.type !== 'dm') return;
    Alert.alert('Options', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block Member', style: 'destructive',
        onPress: () => Alert.alert('Block Member', 'They will not be able to see your profile or message you.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Block', style: 'destructive', onPress: () => blockMutation.mutate({ userId: otherId }) },
        ]),
      },
      {
        text: 'Report Member',
        onPress: () => Alert.alert('Report', 'Select a reason:', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Harassment', onPress: () => reportMutation.mutate({ userId: otherId, reason: 'harassment' }) },
          { text: 'Spam', onPress: () => reportMutation.mutate({ userId: otherId, reason: 'spam' }) },
          { text: 'Fake Profile', onPress: () => reportMutation.mutate({ userId: otherId, reason: 'fake_profile' }) },
          { text: 'Inappropriate Content', onPress: () => reportMutation.mutate({ userId: otherId, reason: 'inappropriate_content' }) },
        ]),
      },
    ]);
  }

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
          <TouchableOpacity
            onPress={() => item.senderId && router.push(`/member/${item.senderId}` as any)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <View style={styles.avatarGlow}>
              <Avatar name={item.senderName} size="sm" />
            </View>
          </TouchableOpacity>
        )}
        <View style={{ maxWidth: '75%' }}>
          {!isMine && item.senderName && (
            <TouchableOpacity
              onPress={() => item.senderId && router.push(`/member/${item.senderId}` as any)}
              activeOpacity={0.7}
            >
              <Text style={styles.senderName}>{item.senderName}</Text>
            </TouchableOpacity>
          )}

          {/* Bubble */}
          {isMine ? (
            <LinearGradient
              colors={['#EC4899', '#A855F7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.bubbleSent}
            >
              {item.isDeleted ? (
                <Text style={styles.deletedText}>Message deleted</Text>
              ) : (
                <Text style={styles.bubbleText}>{item.content}</Text>
              )}
            </LinearGradient>
          ) : (
            <View style={styles.bubbleReceived}>
              {item.isDeleted ? (
                <Text style={styles.deletedText}>Message deleted</Text>
              ) : (
                <Text style={styles.bubbleText}>{item.content}</Text>
              )}
            </View>
          )}

          <Text style={[styles.timestamp, { textAlign: isMine ? 'right' : 'left' }]}>
            {timeAgo}
          </Text>

          {/* Reactions */}
          {item.reactions && item.reactions.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
              {item.reactions.map((r: any, i: number) => (
                <View key={i} style={styles.reactionChip}>
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
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 56 : 0}
      >
        {/* ── Header ── */}
        <LinearGradient
          colors={['#12051E', '#080810']}
          style={[styles.header, { paddingTop: insets.top + 12 }]}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#F1F0FF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 }}
            onPress={() => {
              const otherId = conversation?.otherUserId;
              if (otherId && conversation?.type === 'dm') router.push(`/member/${otherId}` as any);
            }}
            activeOpacity={conversation?.type === 'dm' && conversation?.otherUserId ? 0.7 : 1}
          >
            <View style={styles.headerAvatarWrap}>
              <Avatar name={headerName} size="sm" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerName} numberOfLines={1}>{headerName}</Text>

            </View>
            {conversation?.type === 'dm' && conversation?.otherUserId && (
              <Ionicons name="chevron-forward" size={14} color="#5A5575" />
            )}
          </TouchableOpacity>
          {conversation?.type === 'dm' && conversation?.otherUserId && (
            <TouchableOpacity
              onPress={handleChatOptions}
              accessibilityLabel="Chat options"
              accessibilityRole="button"
              style={{ padding: 8, marginLeft: 4 }}
            >
              <Ionicons name="ellipsis-vertical" size={20} color="#5A5575" />
            </TouchableOpacity>
          )}
        </LinearGradient>

        {/* ── Messages ── */}
        {isLoading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator color="#EC4899" size="large" />
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
                <Text style={{ fontSize: 40, marginBottom: 12 }}>🌙</Text>
                <Text style={{ color: '#F1F0FF', fontSize: 16, fontWeight: '800' }}>No messages yet</Text>
                <Text style={{ color: '#5A5575', fontSize: 13, marginTop: 6 }}>Say hello! 👋</Text>
              </View>
            }
          />
        )}

        {/* ── Input bar ── */}
        <View style={[styles.inputBar, { paddingBottom: insets.bottom + 10 }]}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Message…"
            placeholderTextColor="#5A5575"
            multiline
            maxLength={2000}
            style={styles.textInput}
          />
          <Animated.View style={{ transform: [{ scale: sendScale }] }}>
            <TouchableOpacity
              onPress={handleSend}
              disabled={!text.trim() || sendMutation.isPending}
              activeOpacity={0.85}
            >
              {sendMutation.isPending ? (
                <View style={[styles.sendBtn, styles.sendBtnDisabled]}>
                  <ActivityIndicator color="#fff" size="small" />
                </View>
              ) : text.trim() ? (
                <LinearGradient colors={['#EC4899', '#A855F7']} style={styles.sendBtn}>
                  <Ionicons name="send" size={18} color="#fff" />
                </LinearGradient>
              ) : (
                <View style={[styles.sendBtn, styles.sendBtnDisabled]}>
                  <Ionicons name="send" size={18} color="#5A5575" />
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>

      {/* ── Reaction picker ── */}
      <Modal visible={showReactions} transparent animationType="fade">
        <TouchableOpacity
          style={styles.reactionOverlay}
          activeOpacity={1}
          onPress={() => { setShowReactions(false); setSelectedMessageId(null); }}
        >
          <View style={styles.reactionPicker}>
            {/* Blur-like gradient overlay */}
            <LinearGradient
              colors={['#1A1A30', '#10101C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {REACTIONS.map(emoji => (
              <TouchableOpacity
                key={emoji}
                onPress={() => handleReact(emoji)}
                style={styles.reactionBtn}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080810' },

  // ── Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10101C',
    borderColor: '#1A1A30',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarWrap: {
    borderColor: '#EC489960',
    borderWidth: 2,
    borderRadius: 22,
    overflow: 'hidden',
  },
  headerName: {
    color: '#F1F0FF',
    fontSize: 16,
    fontWeight: '800',
  },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ADE80',
  },
  onlineText: {
    color: '#4ADE80',
    fontSize: 11,
    fontWeight: '600',
  },

  // ── Avatars in message list
  avatarGlow: {
    borderColor: '#EC489960',
    borderWidth: 2,
    borderRadius: 22,
    overflow: 'hidden',
  },

  // ── Bubbles
  senderName: {
    color: '#A855F7',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 3,
    marginLeft: 4,
  },
  bubbleSent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    overflow: 'hidden',
  },
  bubbleReceived: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    backgroundColor: '#10101C',
    borderColor: '#1A1A30',
    borderWidth: 1,
  },
  bubbleText: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 20,
  },
  deletedText: {
    color: 'rgba(255,255,255,0.5)',
    fontStyle: 'italic',
    fontSize: 14,
  },
  timestamp: {
    color: '#5A5575',
    fontSize: 10,
    marginTop: 3,
    marginHorizontal: 4,
  },
  reactionChip: {
    backgroundColor: '#10101C',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderColor: '#1A1A30',
    borderWidth: 1,
  },

  // ── Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopColor: '#1A1A30',
    borderTopWidth: 1,
    backgroundColor: '#080810',
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#10101C',
    borderColor: '#EC489928',
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#F1F0FF',
    fontSize: 15,
    maxHeight: 120,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  sendBtnDisabled: {
    backgroundColor: '#1A1A30',
  },

  // ── Reaction picker
  reactionOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionPicker: {
    flexDirection: 'row',
    borderRadius: 24,
    padding: 10,
    gap: 8,
    borderColor: '#1A1A30',
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: '#10101C',
  },
  reactionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1A30',
  },
});
