import React from 'react';
import {
  View,
  Text,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../../lib/trpc';
import { colors } from '../../lib/colors';
import ConversationItem from '../../components/ConversationItem';

export default function MessagesScreen() {
  const router = useRouter();
  const { data, isLoading } = trpc.messages.conversations.useQuery(undefined, {
    refetchInterval: 15_000,
  });

  const conversations = (data as any)?.conversations ?? data ?? [];

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
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800', flex: 1 }}>
          Messages
        </Text>
        <TouchableOpacity>
          <Ionicons name="create-outline" size={24} color={colors.pink} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={colors.pink} size="large" />
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item: any) => String(item.id)}
          renderItem={({ item }) => (
            <ConversationItem
              conversation={item}
              onPress={() => router.push(`/chat/${item.id}`)}
            />
          )}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 80 }}>
              <Ionicons name="chatbubbles-outline" size={48} color={colors.border} />
              <Text style={{ color: colors.muted, marginTop: 12, fontSize: 16 }}>
                No conversations yet
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
