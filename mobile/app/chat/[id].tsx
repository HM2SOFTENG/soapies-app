import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { trpc } from '../../lib/trpc';
import { colors } from '../../lib/colors';
import Avatar from '../../components/Avatar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatDistanceToNow } from '../../lib/utils';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const utils = trpc.useUtils();

  const { data: meData } = trpc.auth.me.useQuery();
  const me = meData as any;

  const { data, isLoading, refetch } = trpc.messages.messages.useQuery(
    { conversationId: Number(id) },
    { refetchInterval: 5_000 },
  );

  const sendMutation = trpc.messages.send.useMutation({
    onSuccess: () => {
      setText('');
      refetch();
    },
    onError: (e) => Alert.alert('Error', e.message),
  });

  const messages = (data as any)?.messages ?? data ?? [];

  function sendMessage() {
    const trimmed = text.trim();
    if (!trimmed) return;
    sendMutation.mutate({ conversationId: Number(id), content: trimmed });
  }

  const renderMessage = useCallback(({ item }: { item: any }) => {
    const isMe = item.senderId === me?.id || item.sender?.id === me?.id;
    return (
      <View
        style={{
          flexDirection: 'row',
          justifyContent: isMe ? 'flex-end' : 'flex-start',
          marginVertical: 4,
          paddingHorizontal: 12,
        }}
      >
        {!isMe && (
          <Avatar
            name={item.sender?.name ?? '?'}
            url={item.sender?.avatarUrl}
            size={28}
            style={{ marginRight: 8, marginTop: 2 }}
          />
        )}
        <View style={{ maxWidth: '75%' }}>
          <View
            style={{
              borderRadius: 18,
              paddingVertical: 10,
              paddingHorizontal: 14,
              overflow: 'hidden',
              backgroundColor: isMe ? undefined : colors.card,
            }}
          >
            {isMe ? (
              <LinearGradient
                colors={[colors.pink, colors.purple]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                }}
              />
            ) : null}
            <Text style={{ color: '#fff', fontSize: 15, lineHeight: 21, position: 'relative' }}>
              {item.content}
            </Text>
          </View>
          <Text style={{ color: colors.border, fontSize: 10, marginTop: 3, textAlign: isMe ? 'right' : 'left' }}>
            {item.createdAt ? formatDistanceToNow(new Date(item.createdAt)) : ''}
          </Text>
        </View>
      </View>
    );
  }, [me]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 10,
          paddingBottom: 12,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          borderBottomColor: colors.border,
          borderBottomWidth: 1,
          backgroundColor: colors.bg,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700', flex: 1 }}>
          Conversation
        </Text>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={colors.pink} size="large" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={[...messages].reverse()}
          inverted
          keyExtractor={(item: any) => String(item.id)}
          renderItem={renderMessage}
          contentContainerStyle={{ paddingVertical: 12 }}
          onContentSizeChange={() => flatListRef.current?.scrollToOffset({ offset: 0, animated: false })}
        />
      )}

      {/* Input */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          paddingHorizontal: 12,
          paddingTop: 10,
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
          placeholder="Type a message..."
          placeholderTextColor={colors.muted}
          multiline
          style={{
            flex: 1,
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 20,
            paddingHorizontal: 16,
            paddingVertical: 10,
            color: colors.text,
            fontSize: 15,
            maxHeight: 120,
          }}
        />
        <TouchableOpacity
          onPress={sendMessage}
          disabled={!text.trim() || sendMutation.isPending}
          activeOpacity={0.8}
          style={{ borderRadius: 22, overflow: 'hidden' }}
        >
          <LinearGradient
            colors={text.trim() ? [colors.pink, colors.purple] : [colors.border, colors.border]}
            style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
