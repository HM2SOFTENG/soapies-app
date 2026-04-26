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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { trpc } from '../../lib/trpc';
import { FONT } from '../../lib/fonts';
import Avatar from '../../components/Avatar';
import { formatDistanceToNow } from '../../lib/utils';
import { useAuth } from '../../lib/auth';
import { useTheme, type ThemeColors } from '../../lib/theme';

const REACTIONS = ['❤️', '😂', '😮', '👍', '🔥', '💀'];

export default function ChatScreen() {
  const { id, returnTo } = useLocalSearchParams<{ id: string; returnTo?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { colors, alpha } = useTheme();
  const styles = useMemo(() => createStyles(colors, alpha), [colors, alpha]);
  const [text, setText] = useState('');
  const [selectedMessageId, setSelectedMessageId] = useState<number | null>(null);
  const [showReactions, setShowReactions] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const sendScale = useRef(new Animated.Value(0.85)).current;

  const conversationId = Number(id);
  const backTarget = typeof returnTo === 'string' && returnTo.length > 0 ? returnTo : null;

  // Spring-animate send button when text becomes non-empty
  useEffect(() => {
    Animated.spring(sendScale, {
      toValue: text.trim() ? 1 : 0.85,
      useNativeDriver: true,
      friction: 6,
      tension: 80,
    }).start();
  }, [sendScale, text]);

  // ── Data ──────────────────────────────────────────────────────────────────
  const {
    data: messages,
    isLoading,
    isError: messagesIsError,
    error: messagesError,
    refetch,
  } = trpc.messages.messages.useQuery(
    { conversationId, limit: 100 },
    { enabled: !!id, staleTime: 5_000, refetchInterval: 5_000 }
  );

  const {
    data: conversations,
    isError: conversationsIsError,
    error: conversationsError,
    refetch: refetchConversations,
  } = trpc.messages.conversations.useQuery(undefined, {
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
    onSuccess: () => {
      setText('');
      refetch();
    },
    onError: (err: any) => Alert.alert('Could not send message', err.message),
  });

  const reactMutation = trpc.messages.addReaction.useMutation({
    onSuccess: () => {
      setShowReactions(false);
      setSelectedMessageId(null);
      refetch();
    },
    onError: (err: any) => Alert.alert('Could not add reaction', err.message),
  });

  const markRead = trpc.messages.markRead.useMutation({
    onError: (err: any) => {
      if (__DEV__) console.error('[chat] markRead failed:', err?.message);
    },
  });

  const blockMutation = trpc.blocking.block.useMutation({
    onSuccess: () => {
      Alert.alert('Blocked', 'This member has been blocked.');
      router.back();
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const reportMutation = trpc.blocking.report.useMutation({
    onSuccess: () =>
      Alert.alert('Report Submitted', 'Thank you. Our team will review this report.'),
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  function handleChatOptions() {
    const otherId = conversation?.otherUserId;
    if (!otherId || conversation?.type !== 'dm') return;
    Alert.alert('Options', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block Member',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Block Member', 'They will not be able to see your profile or message you.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Block',
              style: 'destructive',
              onPress: () => blockMutation.mutate({ userId: otherId }),
            },
          ]),
      },
      {
        text: 'Report Member',
        onPress: () =>
          Alert.alert('Report', 'Select a reason:', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Harassment',
              onPress: () => reportMutation.mutate({ userId: otherId, reason: 'harassment' }),
            },
            {
              text: 'Spam',
              onPress: () => reportMutation.mutate({ userId: otherId, reason: 'spam' }),
            },
            {
              text: 'Fake Profile',
              onPress: () => reportMutation.mutate({ userId: otherId, reason: 'fake_profile' }),
            },
            {
              text: 'Inappropriate Content',
              onPress: () =>
                reportMutation.mutate({ userId: otherId, reason: 'inappropriate_content' }),
            },
          ]),
      },
    ]);
  }

  // Mark conversation as read on mount
  React.useEffect(() => {
    if (conversationId) markRead.mutate({ conversationId });
  }, [conversationId, markRead]);

  const msgList = useMemo(() => (messages as any[]) ?? [], [messages]);

  // Memoize reversed list to prevent new array allocation every render
  const reversedMessages = useMemo(() => [...msgList].reverse(), [msgList]);
  const chatLoadError = messagesIsError || conversationsIsError;
  const chatLoadErrorMessage =
    (messagesError as any)?.message ?? (conversationsError as any)?.message;

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

  const handleReact = useCallback(
    (emoji: string) => {
      if (!selectedMessageId) return;
      reactMutation.mutate({ messageId: selectedMessageId, emoji });
    },
    [selectedMessageId, reactMutation]
  );

  const renderMessage = useCallback(
    ({ item }: { item: any }) => {
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
                colors={[colors.pink, colors.purple]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.bubbleSent}
              >
                {item.isDeleted ? (
                  <Text style={styles.deletedTextSent}>Message deleted</Text>
                ) : (
                  <Text style={styles.bubbleTextSent}>{item.content}</Text>
                )}
              </LinearGradient>
            ) : (
              <View style={styles.bubbleReceived}>
                {item.isDeleted ? (
                  <Text style={styles.deletedTextReceived}>Message deleted</Text>
                ) : (
                  <Text style={styles.bubbleTextReceived}>{item.content}</Text>
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
                    <Text style={styles.reactionText}>
                      {r.emoji} {r.count}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </TouchableOpacity>
      );
    },
    [colors.pink, colors.purple, handleLongPress, router, styles, user?.id]
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 56 : 0}
      >
        {/* ── Header ── */}
        <LinearGradient
          colors={[colors.pageHeader, colors.background, colors.backgroundDeep]}
          style={[styles.header, { paddingTop: insets.top + 12 }]}
        >
          <TouchableOpacity
            onPress={() => {
              if (backTarget) {
                router.replace(backTarget as any);
                return;
              }
              router.back();
            }}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
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
              <Text style={styles.headerName} numberOfLines={1}>
                {headerName}
              </Text>
              <Text style={styles.headerMeta} numberOfLines={1}>
                {conversation?.type === 'dm'
                  ? 'Private conversation'
                  : `${msgList.length} messages in the room`}
              </Text>
            </View>
            {conversation?.type === 'dm' && conversation?.otherUserId && (
              <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
            )}
          </TouchableOpacity>
          {conversation?.type === 'dm' && conversation?.otherUserId && (
            <TouchableOpacity
              onPress={handleChatOptions}
              accessibilityLabel="Chat options"
              accessibilityRole="button"
              style={{ padding: 8, marginLeft: 4 }}
            >
              <Ionicons name="ellipsis-vertical" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </LinearGradient>

        {/* ── Messages ── */}
        {isLoading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator color={colors.pink} size="large" />
          </View>
        ) : chatLoadError ? (
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              paddingHorizontal: 28,
            }}
          >
            <Ionicons name="cloud-offline-outline" size={42} color={colors.textMuted} />
            <Text
              style={{
                color: colors.text,
                fontSize: 20,
                fontWeight: '800',
                textAlign: 'center',
                marginTop: 14,
              }}
            >
              Could not load this chat
            </Text>
            <Text
              style={{
                color: colors.textMuted,
                fontSize: 14,
                textAlign: 'center',
                lineHeight: 21,
                marginTop: 8,
              }}
            >
              {chatLoadErrorMessage ?? 'Please try again in a moment.'}
            </Text>
            <TouchableOpacity
              onPress={() => {
                refetch();
                refetchConversations();
              }}
              style={{
                marginTop: 18,
                paddingHorizontal: 18,
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ color: colors.text, fontWeight: '800' }}>Retry</Text>
            </TouchableOpacity>
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
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 18,
                    fontWeight: '800',
                    fontFamily: FONT.displayBold,
                  }}
                >
                  No messages yet
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 6 }}>
                  Say hello! 👋
                </Text>
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
            placeholderTextColor={colors.textMuted}
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
                  <ActivityIndicator color={colors.white} size="small" />
                </View>
              ) : text.trim() ? (
                <LinearGradient colors={[colors.pink, colors.purple]} style={styles.sendBtn}>
                  <Ionicons name="send" size={18} color={colors.white} />
                </LinearGradient>
              ) : (
                <View style={[styles.sendBtn, styles.sendBtnDisabled]}>
                  <Ionicons name="send" size={18} color={colors.textMuted} />
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
          onPress={() => {
            setShowReactions(false);
            setSelectedMessageId(null);
          }}
        >
          <View style={styles.reactionPicker}>
            {/* Blur-like gradient overlay */}
            <LinearGradient
              colors={[colors.surfaceHigh, colors.surface]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {REACTIONS.map((emoji) => (
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

function createStyles(colors: ThemeColors, alpha: (color: string, opacity: number) => string) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.page },

    // ── Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingBottom: 12,
      gap: 12,
      shadowColor: colors.shadow,
      shadowOpacity: 0.18,
      shadowRadius: 8,
      elevation: 8,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerAvatarWrap: {
      borderColor: alpha(colors.primary, 0.38),
      borderWidth: 2,
      borderRadius: 22,
      overflow: 'hidden',
      shadowColor: colors.primary,
      shadowOpacity: 0.28,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
    },
    headerName: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
      fontFamily: FONT.displayBold,
      letterSpacing: -0.3,
    },
    headerMeta: {
      color: colors.textSecondary,
      fontSize: 12,
      marginTop: 2,
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
      backgroundColor: colors.success,
    },
    onlineText: {
      color: colors.success,
      fontSize: 11,
      fontWeight: '600',
    },

    // ── Avatars in message list
    avatarGlow: {
      borderColor: alpha(colors.primary, 0.38),
      borderWidth: 2,
      borderRadius: 22,
      overflow: 'hidden',
    },

    // ── Bubbles
    senderName: {
      color: colors.secondary,
      fontSize: 11,
      fontWeight: '700',
      marginBottom: 3,
      marginLeft: 4,
    },
    bubbleSent: {
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderRadius: 18,
      borderBottomRightRadius: 4,
      overflow: 'hidden',
    },
    bubbleReceived: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 18,
      borderBottomLeftRadius: 4,
      backgroundColor: colors.surfaceHigh,
      borderColor: alpha(colors.border, 0.92),
      borderWidth: 1,
      shadowColor: colors.shadow,
      shadowOpacity: 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 1,
    },
    bubbleTextSent: {
      color: colors.white,
      fontSize: 15,
      lineHeight: 20,
    },
    bubbleTextReceived: {
      color: colors.text,
      fontSize: 15,
      lineHeight: 20,
    },
    deletedTextSent: {
      color: alpha(colors.white, 0.78),
      fontStyle: 'italic',
      fontSize: 14,
    },
    deletedTextReceived: {
      color: alpha(colors.text, 0.5),
      fontStyle: 'italic',
      fontSize: 14,
    },
    timestamp: {
      color: colors.textMuted,
      fontSize: 10,
      marginTop: 3,
      marginHorizontal: 4,
    },
    reactionChip: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: 10,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderColor: colors.border,
      borderWidth: 1,
    },
    reactionText: {
      color: colors.text,
      fontSize: 12,
    },

    // ── Input bar
    inputBar: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderTopColor: colors.border,
      borderTopWidth: 1,
      backgroundColor: colors.floating,
      gap: 8,
      shadowColor: colors.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: -4 },
      elevation: 8,
    },
    textInput: {
      flex: 1,
      backgroundColor: colors.surface,
      borderColor: alpha(colors.primary, 0.18),
      borderWidth: 1,
      borderRadius: 24,
      paddingHorizontal: 16,
      paddingVertical: 10,
      color: colors.text,
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
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.border,
    },

    // ── Reaction picker
    reactionOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
    },
    reactionPicker: {
      flexDirection: 'row',
      borderRadius: 24,
      padding: 10,
      gap: 8,
      borderColor: colors.border,
      borderWidth: 1,
      overflow: 'hidden',
      backgroundColor: colors.surface,
      shadowColor: colors.shadow,
      shadowOpacity: 0.12,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8,
    },
    reactionBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceHigh,
      borderWidth: 1,
      borderColor: alpha(colors.border, 0.85),
    },
  });
}
