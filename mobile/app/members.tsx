import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  ActivityIndicator, RefreshControl, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../lib/trpc';
import { colors } from '../lib/colors';
import Avatar from '../components/Avatar';
import { useAuth } from '../lib/auth';

const PAGE_SIZE = 20;

const COMMUNITY_FILTERS = [
  { label: 'My Community', value: undefined }, // defaults to user's own community server-side
  { label: '🎉 Soapies', value: 'soapies' },
  { label: '💑 Groupus', value: 'groupus' },
  { label: '🌈 Gaypeez', value: 'gaypeez' },
];

const ORIENTATION_FILTERS = [
  { label: 'Any', value: undefined },
  { label: 'Bisexual', value: 'bisexual' },
  { label: 'Straight', value: 'straight' },
  { label: 'Gay', value: 'gay' },
  { label: 'Lesbian', value: 'lesbian' },
  { label: 'Queer', value: 'queer' },
  { label: 'Pansexual', value: 'pansexual' },
];

function MemberCard({ member, onPress }: { member: any; onPress: () => void }) {
  const name = member.displayName ?? 'Member';
  const avatarUrl = member.avatarUrl;
  const location = member.location;
  const orientation = member.orientation;
  const community = member.communityId;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 13,
        borderBottomColor: colors.border,
        borderBottomWidth: 1,
      }}
    >
      <Avatar name={name} url={avatarUrl} size={48} style={{ marginRight: 14 }} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>{name}</Text>
          {community && (
            <View style={{ backgroundColor: `${colors.purple}22`, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 }}>
              <Text style={{ color: colors.purple, fontSize: 10, fontWeight: '700', textTransform: 'capitalize' }}>{community}</Text>
            </View>
          )}
        </View>
        {(orientation || location) && (
          <Text style={{ color: colors.muted, fontSize: 13 }}>
            {[orientation, location].filter(Boolean).join(' · ')}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.muted} />
    </TouchableOpacity>
  );
}

function FilterChips({ options, selected, onSelect }: {
  options: { label: string; value: string | undefined }[];
  selected: string | undefined;
  onSelect: (v: string | undefined) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
      {options.map((opt) => {
        const active = selected === opt.value;
        return (
          <TouchableOpacity
            key={opt.label}
            onPress={() => onSelect(opt.value)}
            style={{
              paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
              backgroundColor: active ? colors.pink : colors.card,
              borderWidth: 1,
              borderColor: active ? colors.pink : colors.border,
            }}
          >
            <Text style={{ color: active ? '#fff' : colors.muted, fontWeight: '600', fontSize: 13 }}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

export default function MembersScreen() {
  const router = useRouter();
  const { hasToken } = useAuth();
  const [query, setQuery] = useState('');
  const [community, setCommunity] = useState<string | undefined>(undefined);
  const [orientation, setOrientation] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(0);
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const queryInput = useMemo(() => ({
    page,
    search: query || undefined,
    community,
    orientation,
  }), [page, query, community, orientation]);

  const { data, isLoading, refetch } = trpc.members.browse.useQuery(
    queryInput,
    {
      staleTime: 0,
      enabled: hasToken,
      onSuccess: (newData: any) => {
        const rows = (newData as any[]) ?? [];
        if (page === 0) {
          setAllMembers(rows);
        } else {
          setAllMembers(prev => {
            const existingIds = new Set(prev.map((m: any) => m.id));
            const fresh = rows.filter((m: any) => !existingIds.has(m.id));
            return [...prev, ...fresh];
          });
        }
        setHasMore(rows.length === PAGE_SIZE);
        setLoadingMore(false);
      },
    } as any,
  );

  // Reset to page 0 when filters change
  const applyFilter = useCallback((type: 'community' | 'orientation' | 'search', value: any) => {
    setPage(0);
    setAllMembers([]);
    setHasMore(true);
    if (type === 'community') setCommunity(value);
    else if (type === 'orientation') setOrientation(value);
    else setQuery(value);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(0);
    setAllMembers([]);
    setHasMore(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore || isLoading) return;
    setLoadingMore(true);
    setPage(p => p + 1);
  }, [hasMore, loadingMore, isLoading]);

  // When page 0 data comes back via initial load, populate from data
  const displayMembers = allMembers.length > 0 ? allMembers : ((data as any[]) ?? []);
  const totalShown = displayMembers.length;

  const renderItem = useCallback(({ item }: { item: any }) => {
    const userId = item.id ?? item.userId;
    return (
      <MemberCard
        member={item}
        onPress={() => { if (userId) router.push(`/member/${userId}` as any); }}
      />
    );
  }, [router]);

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={{ paddingVertical: 20, alignItems: 'center' }}>
        <ActivityIndicator color={colors.pink} />
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingVertical: 14, borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 14 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800', flex: 1 }}>Members</Text>
        {totalShown > 0 && (
          <View style={{ backgroundColor: `${colors.pink}22`, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ color: colors.pink, fontWeight: '700', fontSize: 13 }}>{totalShown}{hasMore ? '+' : ''}</Text>
          </View>
        )}
      </View>

      {/* Search */}
      <View style={{ margin: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, borderColor: colors.border, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 }}>
        <Ionicons name="search" size={18} color={colors.muted} style={{ marginRight: 10 }} />
        <TextInput
          value={query}
          onChangeText={(v) => applyFilter('search', v)}
          placeholder="Search members..."
          placeholderTextColor={colors.muted}
          style={{ flex: 1, color: colors.text, fontSize: 15 }}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => applyFilter('search', '')}>
            <Ionicons name="close-circle" size={18} color={colors.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Community filter */}
      <View style={{ marginBottom: 6 }}>
        <FilterChips options={COMMUNITY_FILTERS} selected={community} onSelect={(v) => applyFilter('community', v)} />
      </View>

      {/* Orientation filter */}
      <View style={{ marginBottom: 8 }}>
        <FilterChips options={ORIENTATION_FILTERS} selected={orientation} onSelect={(v) => applyFilter('orientation', v)} />
      </View>

      {isLoading && page === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={colors.pink} size="large" />
        </View>
      ) : (
        <FlatList
          data={displayMembers}
          keyExtractor={(item: any) => String(item.id ?? item.userId)}
          renderItem={renderItem}
          removeClippedSubviews
          maxToRenderPerBatch={20}
          windowSize={7}
          initialNumToRender={20}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.pink} />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 }}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>👥</Text>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: 8 }}>
                {query ? 'No members found' : 'No members yet'}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 15, textAlign: 'center' }}>
                {query ? 'Try a different search term' : 'Check back soon!'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
