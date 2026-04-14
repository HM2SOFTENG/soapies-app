import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../lib/trpc';
import { colors } from '../lib/colors';
import Avatar from '../components/Avatar';

function MemberCard({ member, onPress }: { member: any; onPress: () => void }) {
  const name = member.displayName ?? member.user?.name ?? 'Member';
  const avatarUrl = member.avatarUrl ?? member.user?.avatarUrl;
  const location = member.location ?? member.city;
  const orientation = member.orientation;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomColor: colors.border,
        borderBottomWidth: 1,
      }}
    >
      <Avatar name={name} url={avatarUrl} size={48} style={{ marginRight: 14 }} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>{name}</Text>
        {(location || orientation) && (
          <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>
            {[orientation, location].filter(Boolean).join(' · ')}
          </Text>
        )}
        {member.applicationStatus && (
          <View style={{ marginTop: 4 }}>
            <Text style={{
              color: member.applicationStatus === 'approved' ? '#10B981' : colors.muted,
              fontSize: 11,
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}>
              {member.applicationStatus}
            </Text>
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </TouchableOpacity>
  );
}

export default function MembersScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = trpc.members.browse.useQuery(
    { page: 0, search: query || undefined },
    { staleTime: 0 },
  );

  const members = (data as any[]) ?? [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const renderItem = useCallback(({ item }: { item: any }) => {
    const userId = item.userId ?? item.user?.id ?? item.id;
    return (
      <MemberCard
        member={item}
        onPress={() => {
          if (userId) {
            router.push(`/member/${userId}` as any);
          }
        }}
      />
    );
  }, [router]);

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
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 14 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800', flex: 1 }}>Members</Text>
      </View>

      {/* Search bar */}
      <View
        style={{
          margin: 16,
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.card,
          borderRadius: 12,
          borderColor: colors.border,
          borderWidth: 1,
          paddingHorizontal: 14,
          paddingVertical: 10,
        }}
      >
        <Ionicons name="search" size={18} color={colors.muted} style={{ marginRight: 10 }} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search members..."
          placeholderTextColor={colors.muted}
          style={{ flex: 1, color: colors.text, fontSize: 15 }}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.muted} />
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={colors.pink} size="large" />
        </View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item: any) => String(item.id ?? item.userId)}
          renderItem={renderItem}
          removeClippedSubviews={true}
          maxToRenderPerBatch={15}
          windowSize={5}
          initialNumToRender={15}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.pink} />
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 }}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>👥</Text>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: 8 }}>
                {query ? 'No members found' : 'No members yet'}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 15, textAlign: 'center' }}>
                {query ? `Try a different search term` : 'Check back soon!'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
