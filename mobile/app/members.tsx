import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  ActivityIndicator, RefreshControl, ScrollView, Switch, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../lib/trpc';
import { colors } from '../lib/colors';
import Avatar from '../components/Avatar';
import { useAuth } from '../lib/auth';

const PAGE_SIZE = 20;

// ─── Filter Options ───────────────────────────────────────────────────────────

const GENDER_OPTIONS = [
  { label: 'Any', value: undefined },
  { label: '♀️ Female', value: 'female' },
  { label: '♂️ Male', value: 'male' },
  { label: '⚧️ Non-binary', value: 'non-binary' },
  { label: '🏳️‍⚧️ Trans Female', value: 'trans female' },
  { label: '🏳️‍⚧️ Trans Male', value: 'trans male' },
];

const ORIENTATION_OPTIONS = [
  { label: 'Any', value: undefined },
  { label: '💗 Bisexual', value: 'bisexual' },
  { label: '🩷 Straight', value: 'straight' },
  { label: '🌈 Queer', value: 'queer' },
  { label: '💜 Gay', value: 'gay' },
  { label: '🌸 Lesbian', value: 'lesbian' },
  { label: '💛 Pansexual', value: 'pansexual' },
];

const LOOKING_FOR_OPTIONS = [
  { label: 'Any', value: undefined },
  { label: '💬 Chat', value: 'connection' },
  { label: '🫂 Friendship', value: 'friendship' },
  { label: '🎉 Event Buddy', value: 'event_buddy' },
  { label: '🔥 Play Date', value: 'play_date' },
  { label: '💑 Couple Play', value: 'couple_play' },
];

const ROLE_OPTIONS = [
  { label: 'Any', value: undefined },
  { label: '✨ Member', value: 'member' },
  { label: '💗 Angel', value: 'angel' },
];

const COMMUNITY_OPTIONS = [
  { label: 'My Community', value: undefined },
  { label: '🎉 Soapies', value: 'soapies' },
  { label: '💑 Groupus', value: 'groupus' },
  { label: '🌈 Gaypeez', value: 'gaypeez' },
];

// ─── Chip Row ─────────────────────────────────────────────────────────────────

function ChipRow({ options, selected, onSelect }: {
  options: { label: string; value: string | undefined }[];
  selected: string | undefined;
  onSelect: (v: string | undefined) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 4 }}>
      {options.map((opt) => {
        const active = selected === opt.value;
        return (
          <TouchableOpacity
            key={opt.label}
            onPress={() => onSelect(opt.value)}
            style={{
              paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
              backgroundColor: active ? colors.pink : '#1A1A2E',
              borderWidth: 1,
              borderColor: active ? colors.pink : '#2D2D3A',
            }}
          >
            <Text style={{ color: active ? '#fff' : colors.muted, fontWeight: '600', fontSize: 12 }}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ─── Filter Label Helper ──────────────────────────────────────────────────────

function filterLabel(type: string, value: string): string {
  const allOptions = [...GENDER_OPTIONS, ...ORIENTATION_OPTIONS, ...LOOKING_FOR_OPTIONS, ...ROLE_OPTIONS, ...COMMUNITY_OPTIONS];
  const found = allOptions.find(o => o.value === value);
  return found ? found.label : value;
}

// ─── Member Card ──────────────────────────────────────────────────────────────

function MemberCard({ member, onPress, isComposeMode }: { member: any; onPress: () => void; isComposeMode: boolean }) {
  const name = member.displayName ?? 'Member';
  const avatarUrl = member.avatarUrl;
  const location = member.location;
  const orientation = member.orientation;
  const gender = member.gender;
  const community = member.communityId;
  const memberRole = member.memberRole;
  const isAngel = memberRole === 'angel';

  // Parse lookingFor from preferences JSON
  const preferences = member.preferences as any;
  const lookingForArr: string[] = Array.isArray(preferences?.lookingFor) ? preferences.lookingFor : [];
  const lookingForDisplay = lookingForArr.slice(0, 2).map((v: string) => {
    const found = LOOKING_FOR_OPTIONS.find(o => o.value === v);
    return found ? found.label : v;
  });

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
        {/* Name + badges */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>{name}</Text>
          {community && (
            <View style={{ backgroundColor: `${colors.purple}22`, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 }}>
              <Text style={{ color: colors.purple, fontSize: 10, fontWeight: '700', textTransform: 'capitalize' }}>{community}</Text>
            </View>
          )}
          {isAngel && (
            <View style={{ backgroundColor: `${colors.pink}22`, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 }}>
              <Text style={{ color: colors.pink, fontSize: 10, fontWeight: '700' }}>💗 Angel</Text>
            </View>
          )}
        </View>

        {/* Orientation + gender */}
        {(orientation || gender) && (
          <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 3 }}>
            {[orientation, gender].filter(Boolean).join(' · ')}
          </Text>
        )}

        {/* Looking for tags */}
        {lookingForDisplay.length > 0 && (
          <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap', marginBottom: 2 }}>
            {lookingForDisplay.map((tag, i) => (
              <View key={i} style={{ backgroundColor: '#1A1A2E', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ color: colors.muted, fontSize: 10 }}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Location */}
        {location && (
          <Text style={{ color: colors.muted, fontSize: 12 }}>{location}</Text>
        )}
      </View>

      {isComposeMode
        ? <Ionicons name="chatbubble-outline" size={20} color={colors.pink} />
        : <Ionicons name="chevron-forward" size={16} color={colors.muted} />
      }
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function MembersScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const isComposeMode = params.mode === 'compose';
  const { hasToken } = useAuth();

  // Search & filter state
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [community, setCommunity] = useState<string | undefined>(undefined);
  const [orientation, setOrientation] = useState<string | undefined>(undefined);
  const [gender, setGender] = useState<string | undefined>(undefined);
  const [memberRole, setMemberRole] = useState<string | undefined>(undefined);
  const [lookingFor, setLookingFor] = useState<string | undefined>(undefined);
  const [hasPhoto, setHasPhoto] = useState(false);

  // Pending filter state (applied only on "Apply" tap)
  const [pendingCommunity, setPendingCommunity] = useState<string | undefined>(undefined);
  const [pendingOrientation, setPendingOrientation] = useState<string | undefined>(undefined);
  const [pendingGender, setPendingGender] = useState<string | undefined>(undefined);
  const [pendingMemberRole, setPendingMemberRole] = useState<string | undefined>(undefined);
  const [pendingLookingFor, setPendingLookingFor] = useState<string | undefined>(undefined);
  const [pendingHasPhoto, setPendingHasPhoto] = useState(false);

  // Pagination
  const [page, setPage] = useState(0);
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const activeFilterCount = [community, orientation, gender, memberRole, lookingFor, hasPhoto || undefined]
    .filter(Boolean).length;

  const pendingFilterCount = [pendingCommunity, pendingOrientation, pendingGender, pendingMemberRole, pendingLookingFor, pendingHasPhoto || undefined]
    .filter(Boolean).length;

  const queryInput = useMemo(() => ({
    page,
    search: query || undefined,
    community,
    orientation,
    gender,
    memberRole,
    lookingFor,
    hasPhoto: hasPhoto || undefined,
  }), [page, query, community, orientation, gender, memberRole, lookingFor, hasPhoto]);

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

  const createConversation = trpc.messages.createConversation.useMutation({
    onSuccess: (convId: any) => {
      router.push(`/chat/${convId}` as any);
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const resetPagination = useCallback(() => {
    setPage(0);
    setAllMembers([]);
    setHasMore(true);
  }, []);

  const applyFilters = useCallback(() => {
    setCommunity(pendingCommunity);
    setOrientation(pendingOrientation);
    setGender(pendingGender);
    setMemberRole(pendingMemberRole);
    setLookingFor(pendingLookingFor);
    setHasPhoto(pendingHasPhoto);
    resetPagination();
    setShowFilters(false);
  }, [pendingCommunity, pendingOrientation, pendingGender, pendingMemberRole, pendingLookingFor, pendingHasPhoto, resetPagination]);

  const clearAllFilters = useCallback(() => {
    setPendingCommunity(undefined);
    setPendingOrientation(undefined);
    setPendingGender(undefined);
    setPendingMemberRole(undefined);
    setPendingLookingFor(undefined);
    setPendingHasPhoto(false);
    setCommunity(undefined);
    setOrientation(undefined);
    setGender(undefined);
    setMemberRole(undefined);
    setLookingFor(undefined);
    setHasPhoto(false);
    resetPagination();
  }, [resetPagination]);

  const removeFilter = useCallback((type: 'community' | 'orientation' | 'gender' | 'memberRole' | 'lookingFor' | 'hasPhoto') => {
    resetPagination();
    if (type === 'community') { setCommunity(undefined); setPendingCommunity(undefined); }
    else if (type === 'orientation') { setOrientation(undefined); setPendingOrientation(undefined); }
    else if (type === 'gender') { setGender(undefined); setPendingGender(undefined); }
    else if (type === 'memberRole') { setMemberRole(undefined); setPendingMemberRole(undefined); }
    else if (type === 'lookingFor') { setLookingFor(undefined); setPendingLookingFor(undefined); }
    else if (type === 'hasPhoto') { setHasPhoto(false); setPendingHasPhoto(false); }
  }, [resetPagination]);

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

  const handleSearchChange = useCallback((v: string) => {
    setQuery(v);
    resetPagination();
  }, [resetPagination]);

  const displayMembers = allMembers.length > 0 ? allMembers : ((data as any[]) ?? []);
  const totalShown = displayMembers.length;

  const handleMemberPress = useCallback((member: any) => {
    const userId = member.id ?? member.userId;
    if (isComposeMode) {
      if (userId) createConversation.mutate({ participantIds: [userId] });
    } else {
      if (userId) router.push(`/member/${userId}` as any);
    }
  }, [isComposeMode, router, createConversation]);

  const renderItem = useCallback(({ item }: { item: any }) => (
    <MemberCard
      member={item}
      onPress={() => handleMemberPress(item)}
      isComposeMode={isComposeMode}
    />
  ), [handleMemberPress, isComposeMode]);

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={{ paddingVertical: 20, alignItems: 'center' }}>
        <ActivityIndicator color={colors.pink} />
      </View>
    );
  };

  // Active filter chips data
  const activeFilterChips: { label: string; onRemove: () => void }[] = [];
  if (community) activeFilterChips.push({ label: filterLabel('community', community), onRemove: () => removeFilter('community') });
  if (orientation) activeFilterChips.push({ label: filterLabel('orientation', orientation), onRemove: () => removeFilter('orientation') });
  if (gender) activeFilterChips.push({ label: filterLabel('gender', gender), onRemove: () => removeFilter('gender') });
  if (memberRole) activeFilterChips.push({ label: filterLabel('memberRole', memberRole), onRemove: () => removeFilter('memberRole') });
  if (lookingFor) activeFilterChips.push({ label: filterLabel('lookingFor', lookingFor), onRemove: () => removeFilter('lookingFor') });
  if (hasPhoto) activeFilterChips.push({ label: '📷 Has Photo', onRemove: () => removeFilter('hasPhoto') });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{
        paddingHorizontal: 16, paddingVertical: 14,
        borderBottomColor: colors.border, borderBottomWidth: 1,
        flexDirection: 'row', alignItems: 'center',
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12, padding: 4 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800', flex: 1 }}>
          {isComposeMode ? 'New Message' : 'Members'}
        </Text>
        {/* Filter toggle button */}
        <TouchableOpacity
          onPress={() => {
            // Sync pending state with current applied state when opening
            if (!showFilters) {
              setPendingCommunity(community);
              setPendingOrientation(orientation);
              setPendingGender(gender);
              setPendingMemberRole(memberRole);
              setPendingLookingFor(lookingFor);
              setPendingHasPhoto(hasPhoto);
            }
            setShowFilters(v => !v);
          }}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 5,
            paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
            backgroundColor: activeFilterCount > 0 ? `${colors.pink}22` : colors.card,
            borderWidth: 1,
            borderColor: activeFilterCount > 0 ? colors.pink : colors.border,
          }}
        >
          <Text style={{ fontSize: 16 }}>🎛️</Text>
          {activeFilterCount > 0 && (
            <View style={{ backgroundColor: colors.pink, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 }}>
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={{
        margin: 12, marginBottom: 8,
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.card, borderRadius: 12,
        borderColor: colors.border, borderWidth: 1,
        paddingHorizontal: 14, paddingVertical: 10,
      }}>
        <Ionicons name="search" size={18} color={colors.muted} style={{ marginRight: 10 }} />
        <TextInput
          value={query}
          onChangeText={handleSearchChange}
          placeholder="Search members..."
          placeholderTextColor={colors.muted}
          style={{ flex: 1, color: colors.text, fontSize: 15 }}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => handleSearchChange('')}>
            <Ionicons name="close-circle" size={18} color={colors.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Result count */}
      {totalShown > 0 && (
        <Text style={{ color: colors.muted, fontSize: 12, paddingHorizontal: 16, marginBottom: 4 }}>
          Showing {totalShown}{hasMore ? '+' : ''} member{totalShown !== 1 ? 's' : ''}
        </Text>
      )}

      {/* Active filter summary chips */}
      {activeFilterChips.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingHorizontal: 12, paddingVertical: 6 }}
        >
          {activeFilterChips.map((chip, i) => (
            <View key={i} style={{
              flexDirection: 'row', alignItems: 'center', gap: 4,
              backgroundColor: `${colors.pink}22`, borderRadius: 16,
              paddingHorizontal: 10, paddingVertical: 5,
              borderWidth: 1, borderColor: colors.pink,
            }}>
              <Text style={{ color: colors.pink, fontSize: 12, fontWeight: '600' }}>{chip.label}</Text>
              <TouchableOpacity onPress={chip.onRemove}>
                <Text style={{ color: colors.pink, fontSize: 14, fontWeight: '800', lineHeight: 16 }}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Collapsible filter panel */}
      {showFilters && (
        <View style={{
          backgroundColor: '#0F0F1A',
          borderBottomLeftRadius: 16, borderBottomRightRadius: 16,
          borderWidth: 1, borderColor: '#2D2D3A',
          marginHorizontal: 0,
          paddingVertical: 12,
        }}>
          {/* GENDER */}
          <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1, paddingHorizontal: 16, marginBottom: 4 }}>GENDER</Text>
          <ChipRow options={GENDER_OPTIONS} selected={pendingGender} onSelect={setPendingGender} />

          {/* ORIENTATION */}
          <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1, paddingHorizontal: 16, marginTop: 10, marginBottom: 4 }}>ORIENTATION</Text>
          <ChipRow options={ORIENTATION_OPTIONS} selected={pendingOrientation} onSelect={setPendingOrientation} />

          {/* LOOKING FOR */}
          <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1, paddingHorizontal: 16, marginTop: 10, marginBottom: 4 }}>LOOKING FOR</Text>
          <ChipRow options={LOOKING_FOR_OPTIONS} selected={pendingLookingFor} onSelect={setPendingLookingFor} />

          {/* ROLE */}
          <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1, paddingHorizontal: 16, marginTop: 10, marginBottom: 4 }}>ROLE</Text>
          <ChipRow options={ROLE_OPTIONS} selected={pendingMemberRole} onSelect={setPendingMemberRole} />

          {/* COMMUNITY */}
          <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1, paddingHorizontal: 16, marginTop: 10, marginBottom: 4 }}>COMMUNITY</Text>
          <ChipRow options={COMMUNITY_OPTIONS} selected={pendingCommunity} onSelect={setPendingCommunity} />

          {/* Has Photo toggle */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 12 }}>
            <Text style={{ color: colors.text, fontSize: 14 }}>📷  Has Profile Photo</Text>
            <Switch
              value={pendingHasPhoto}
              onValueChange={setPendingHasPhoto}
              trackColor={{ false: '#2D2D3A', true: colors.pink }}
              thumbColor="#fff"
            />
          </View>

          {/* Bottom buttons */}
          <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 16 }}>
            <TouchableOpacity
              onPress={clearAllFilters}
              style={{
                flex: 1, paddingVertical: 11, borderRadius: 12,
                backgroundColor: '#1A1A2E', borderWidth: 1, borderColor: '#2D2D3A',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: colors.muted, fontWeight: '700', fontSize: 14 }}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={applyFilters}
              style={{
                flex: 2, paddingVertical: 11, borderRadius: 12,
                backgroundColor: colors.pink, alignItems: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>
                Apply{pendingFilterCount > 0 ? ` (${pendingFilterCount})` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

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
                {query || activeFilterCount > 0 ? 'No members found' : 'No members yet'}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 15, textAlign: 'center' }}>
                {query ? 'Try a different search term' : activeFilterCount > 0 ? 'Try clearing some filters' : 'Check back soon!'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
