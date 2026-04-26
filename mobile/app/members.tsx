import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Switch,
  Alert,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../lib/trpc';
import Avatar from '../components/Avatar';
import { useAuth } from '../lib/auth';
import { FONT } from '../lib/fonts';
import { useTheme } from '../lib/theme';

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
  { label: '💑 Groupies', value: 'groupies' },
  { label: '🌈 Gaypeez', value: 'gaypeez' },
];

// ─── Animated Chip ────────────────────────────────────────────────────────────

function AnimatedChip({
  option,
  active,
  onSelect,
}: {
  option: { label: string; value: string | undefined };
  active: boolean;
  onSelect: (v: string | undefined) => void;
}) {
  const { colors } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, {
      toValue: 0.92,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 0 }).start();

  return (
    <TouchableOpacity
      onPress={() => onSelect(option.value)}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      activeOpacity={1}
    >
      <Animated.View
        style={{
          transform: [{ scale }],
          paddingHorizontal: 14,
          paddingVertical: 7,
          borderRadius: 20,
          backgroundColor: active ? '#EC489920' : colors.card,
          borderWidth: 1,
          borderColor: active ? '#EC4899' : colors.border,
        }}
      >
        <Text
          style={{
            color: active ? '#EC4899' : '#5A5575',
            fontWeight: active ? '800' : '700',
            fontSize: 12,
          }}
        >
          {option.label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Chip Row ─────────────────────────────────────────────────────────────────

function ChipRow({
  options,
  selected,
  onSelect,
}: {
  options: { label: string; value: string | undefined }[];
  selected: string | undefined;
  onSelect: (v: string | undefined) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 4 }}
    >
      {options.map((opt) => (
        <AnimatedChip
          key={opt.label}
          option={opt}
          active={selected === opt.value}
          onSelect={onSelect}
        />
      ))}
    </ScrollView>
  );
}

// ─── Filter Label Helper ──────────────────────────────────────────────────────

function filterLabel(type: string, value: string): string {
  const allOptions = [
    ...GENDER_OPTIONS,
    ...ORIENTATION_OPTIONS,
    ...LOOKING_FOR_OPTIONS,
    ...ROLE_OPTIONS,
    ...COMMUNITY_OPTIONS,
  ];
  const found = allOptions.find((o) => o.value === value);
  return found ? found.label : value;
}

// ─── Member Card ──────────────────────────────────────────────────────────────

function MemberCard({
  member,
  onPress,
  isComposeMode,
}: {
  member: any;
  onPress: () => void;
  isComposeMode: boolean;
}) {
  const { colors, alpha } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 0 }).start();

  const name = member.displayName ?? 'Member';
  const avatarUrl = member.avatarUrl;
  const location = member.location;
  const orientation = member.orientation;
  const gender = member.gender;
  const community = member.communityId;
  const memberRole = member.memberRole;
  const isAngel = memberRole === 'angel';
  const signalType = member.signal?.signalType;
  const canPoke = signalType === 'available';

  const preferences = member.preferences as any;
  const lookingForArr: string[] = Array.isArray(preferences?.lookingFor)
    ? preferences.lookingFor
    : [];
  const lookingForDisplay = lookingForArr.slice(0, 2).map((v: string) => {
    const found = LOOKING_FOR_OPTIONS.find((o) => o.value === v);
    return found ? found.label : v;
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      activeOpacity={1}
    >
      <Animated.View
        style={{
          transform: [{ scale }],
          flexDirection: 'row',
          alignItems: 'center',
          marginHorizontal: 16,
          marginBottom: 10,
          padding: 16,
          backgroundColor: colors.card,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        {/* Avatar with glow border */}
        <View
          style={{
            borderRadius: 28,
            borderWidth: 1.5,
            borderColor: '#EC489930',
            marginRight: 14,
          }}
        >
          <Avatar name={name} url={avatarUrl} size={48} />
        </View>

        <View style={{ flex: 1 }}>
          {/* Name + badges */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              marginBottom: 3,
              flexWrap: 'wrap',
            }}
          >
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>{name}</Text>
            {community && (
              <View
                style={{
                  backgroundColor: '#A855F722',
                  borderRadius: 8,
                  paddingHorizontal: 7,
                  paddingVertical: 2,
                }}
              >
                <Text
                  style={{
                    color: '#A855F7',
                    fontSize: 10,
                    fontWeight: '700',
                    textTransform: 'capitalize',
                  }}
                >
                  {community}
                </Text>
              </View>
            )}
            {isAngel && (
              <View
                style={{
                  backgroundColor: '#EC489922',
                  borderRadius: 8,
                  paddingHorizontal: 7,
                  paddingVertical: 2,
                }}
              >
                <Text
                  style={{
                    color: '#EC4899',
                    fontSize: 10,
                    fontWeight: '700',
                    fontFamily: FONT.displaySemiBold,
                  }}
                >
                  💗 Angel
                </Text>
              </View>
            )}
          </View>

          {/* Orientation + gender */}
          {(orientation || gender) && (
            <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 3 }}>
              {[orientation, gender].filter(Boolean).join(' · ')}
            </Text>
          )}

          {canPoke && (
            <View
              style={{
                alignSelf: 'flex-start',
                marginTop: 6,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                backgroundColor: alpha('#22c55e', 0.12),
                borderColor: alpha('#22c55e', 0.28),
                borderWidth: 1,
                borderRadius: 999,
                paddingHorizontal: 8,
                paddingVertical: 4,
              }}
            >
              <Ionicons name="hand-left-outline" size={12} color="#22c55e" />
              <Text style={{ color: '#22c55e', fontSize: 11, fontWeight: '700' }}>
                Available to poke
              </Text>
            </View>
          )}

          {/* Looking for tags */}
          {lookingForDisplay.length > 0 && (
            <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap', marginBottom: 2 }}>
              {lookingForDisplay.map((tag, i) => (
                <View
                  key={i}
                  style={{
                    backgroundColor: '#1A1A30',
                    borderRadius: 6,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                  }}
                >
                  <Text style={{ color: colors.textMuted, fontSize: 10 }}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Location */}
          {location && <Text style={{ color: colors.textMuted, fontSize: 12 }}>{location}</Text>}
        </View>

        {isComposeMode ? (
          <Ionicons name="chatbubble-outline" size={20} color="#EC4899" />
        ) : (
          <Ionicons name="chevron-forward" size={16} color="#5A5575" />
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function MembersScreen() {
  const theme = useTheme();
  const t = {
    page: theme.colors.background,
    surface: theme.colors.card,
    elevated: theme.colors.floating,
    border: theme.colors.border,
    text: theme.colors.text,
    subtext: theme.colors.textSecondary,
    muted: theme.colors.textMuted,
    headerGradient: theme.gradients.screen,
    searchSurface: theme.isDark ? '#0F0F1B' : theme.colors.surfaceHigh,
    searchBorder: theme.isDark ? '#EC489930' : theme.colors.borderAccent,
    searchBorderFocus: theme.colors.focusRing,
  };
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ mode?: string; returnTo?: string }>();
  const isComposeMode = params.mode === 'compose' || params.mode === 'message';
  const composeReturnTo =
    typeof params.returnTo === 'string' && params.returnTo.length > 0
      ? params.returnTo
      : '/(tabs)/messages';
  const { hasToken } = useAuth();

  // Search & filter state
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
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

  const activeFilterCount = [
    community,
    orientation,
    gender,
    memberRole,
    lookingFor,
    hasPhoto || undefined,
  ].filter(Boolean).length;

  const pendingFilterCount = [
    pendingCommunity,
    pendingOrientation,
    pendingGender,
    pendingMemberRole,
    pendingLookingFor,
    pendingHasPhoto || undefined,
  ].filter(Boolean).length;

  const queryInput = useMemo(
    () => ({
      page,
      search: query || undefined,
      community,
      orientation,
      gender,
      memberRole,
      lookingFor,
      hasPhoto: hasPhoto || undefined,
    }),
    [page, query, community, orientation, gender, memberRole, lookingFor, hasPhoto]
  );

  const { data, isLoading, isError, error, refetch } = trpc.members.browse.useQuery(queryInput, {
    staleTime: 0,
    enabled: hasToken,
    onSuccess: (newData: any) => {
      const rows = (newData as any[]) ?? [];
      if (page === 0) {
        setAllMembers(rows);
      } else {
        setAllMembers((prev) => {
          const existingIds = new Set(prev.map((m: any) => m.id));
          const fresh = rows.filter((m: any) => !existingIds.has(m.id));
          return [...prev, ...fresh];
        });
      }
      setHasMore(rows.length === PAGE_SIZE);
      setLoadingMore(false);
    },
    onError: () => {
      setLoadingMore(false);
    },
  } as any);

  const createConversation = trpc.messages.createConversation.useMutation({
    onSuccess: (convId: any) => {
      router.replace({
        pathname: '/chat/[id]',
        params: { id: String(convId), returnTo: composeReturnTo },
      } as any);
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
  }, [
    pendingCommunity,
    pendingOrientation,
    pendingGender,
    pendingMemberRole,
    pendingLookingFor,
    pendingHasPhoto,
    resetPagination,
  ]);

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

  const removeFilter = useCallback(
    (type: 'community' | 'orientation' | 'gender' | 'memberRole' | 'lookingFor' | 'hasPhoto') => {
      resetPagination();
      if (type === 'community') {
        setCommunity(undefined);
        setPendingCommunity(undefined);
      } else if (type === 'orientation') {
        setOrientation(undefined);
        setPendingOrientation(undefined);
      } else if (type === 'gender') {
        setGender(undefined);
        setPendingGender(undefined);
      } else if (type === 'memberRole') {
        setMemberRole(undefined);
        setPendingMemberRole(undefined);
      } else if (type === 'lookingFor') {
        setLookingFor(undefined);
        setPendingLookingFor(undefined);
      } else if (type === 'hasPhoto') {
        setHasPhoto(false);
        setPendingHasPhoto(false);
      }
    },
    [resetPagination]
  );

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
    setPage((p) => p + 1);
  }, [hasMore, loadingMore, isLoading]);

  const handleSearchChange = useCallback(
    (v: string) => {
      setQuery(v);
      resetPagination();
    },
    [resetPagination]
  );

  const displayMembers = allMembers.length > 0 ? allMembers : ((data as any[]) ?? []);
  const quickFilterLower = filterQuery.trim().toLowerCase();
  const filteredDisplayMembers = !quickFilterLower
    ? displayMembers
    : displayMembers.filter((member: any) =>
        [member.displayName, member.bio, member.location, member.city]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(quickFilterLower)
      );
  const totalShown = filteredDisplayMembers.length;

  const handleMemberPress = useCallback(
    (member: any) => {
      const userId = member.id ?? member.userId;
      if (isComposeMode) {
        if (userId) createConversation.mutate({ participantIds: [userId] });
      } else {
        if (userId) router.push(`/member/${userId}` as any);
      }
    },
    [isComposeMode, router, createConversation]
  );

  const renderItem = useCallback(
    ({ item }: { item: any }) => (
      <MemberCard
        member={item}
        onPress={() => handleMemberPress(item)}
        isComposeMode={isComposeMode}
      />
    ),
    [handleMemberPress, isComposeMode]
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={{ paddingVertical: 20, alignItems: 'center' }}>
        <ActivityIndicator color="#EC4899" />
      </View>
    );
  };

  // Active filter chips data
  const activeFilterChips: { label: string; onRemove: () => void }[] = [];
  if (community)
    activeFilterChips.push({
      label: filterLabel('community', community),
      onRemove: () => removeFilter('community'),
    });
  if (orientation)
    activeFilterChips.push({
      label: filterLabel('orientation', orientation),
      onRemove: () => removeFilter('orientation'),
    });
  if (gender)
    activeFilterChips.push({
      label: filterLabel('gender', gender),
      onRemove: () => removeFilter('gender'),
    });
  if (memberRole)
    activeFilterChips.push({
      label: filterLabel('memberRole', memberRole),
      onRemove: () => removeFilter('memberRole'),
    });
  if (lookingFor)
    activeFilterChips.push({
      label: filterLabel('lookingFor', lookingFor),
      onRemove: () => removeFilter('lookingFor'),
    });
  if (hasPhoto)
    activeFilterChips.push({
      label: '📷 Has Photo',
      onRemove: () => removeFilter('hasPhoto'),
    });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.page }} edges={['bottom', 'left', 'right']}>
      {/* Header */}
      <LinearGradient
        colors={t.headerGradient as any}
        style={{
          paddingTop: insets.top + 14,
          paddingBottom: 18,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <TouchableOpacity
          onPress={() => {
            if (isComposeMode) {
              router.replace(composeReturnTo as any);
              return;
            }
            router.back();
          }}
          style={{
            marginRight: 12,
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: t.elevated,
            borderWidth: 1,
            borderColor: t.border,
          }}
        >
          <Ionicons name="arrow-back" size={22} color={t.text} />
        </TouchableOpacity>

        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text
            style={{
              color: t.text,
              fontSize: 28,
              fontWeight: '900',
              letterSpacing: -0.3,
              fontFamily: FONT.displayBold,
            }}
          >
            {isComposeMode ? 'New Message' : 'Members 👥'}
          </Text>
          {totalShown > 0 && (
            <View
              style={{
                backgroundColor: '#EC489920',
                borderWidth: 1,
                borderColor: '#EC489940',
                borderRadius: 10,
                paddingHorizontal: 8,
                paddingVertical: 3,
              }}
            >
              <Text style={{ color: '#EC4899', fontSize: 11, fontWeight: '800' }}>
                {totalShown}
                {hasMore ? '+' : ''}
              </Text>
            </View>
          )}
        </View>

        {/* Filter toggle button */}
        <TouchableOpacity
          onPress={() => {
            if (!showFilters) {
              setPendingCommunity(community);
              setPendingOrientation(orientation);
              setPendingGender(gender);
              setPendingMemberRole(memberRole);
              setPendingLookingFor(lookingFor);
              setPendingHasPhoto(hasPhoto);
            }
            setShowFilters((v) => !v);
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            paddingHorizontal: 12,
            paddingVertical: 7,
            borderRadius: 20,
            backgroundColor: activeFilterCount > 0 ? '#EC489920' : '#10101C',
            borderWidth: 1,
            borderColor: activeFilterCount > 0 ? '#EC4899' : '#1A1A30',
          }}
        >
          <Text style={{ fontSize: 16 }}>🎛️</Text>
          {activeFilterCount > 0 && (
            <View
              style={{
                backgroundColor: '#EC4899',
                borderRadius: 10,
                minWidth: 20,
                height: 20,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 5,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>
                {activeFilterCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </LinearGradient>

      {/* Search bar */}
      <View
        style={{
          margin: 12,
          marginBottom: 8,
          backgroundColor: t.searchSurface,
          borderRadius: 22,
          borderWidth: 1,
          borderColor: searchFocused ? t.searchBorderFocus : t.searchBorder,
          paddingHorizontal: 14,
          paddingVertical: 14,
        }}
      >
        <Text
          style={{
            color: '#8B84A7',
            fontSize: 11,
            fontWeight: '800',
            letterSpacing: 1.1,
            marginBottom: 10,
            fontFamily: FONT.displaySemiBold,
          }}
        >
          DISCOVER
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="search" size={18} color="#5A5575" style={{ marginRight: 10 }} />
          <TextInput
            value={query}
            onChangeText={handleSearchChange}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search members..."
            placeholderTextColor={t.muted}
            style={{ flex: 1, color: t.text, fontSize: 15 }}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => handleSearchChange('')}>
              <Ionicons name="close-circle" size={18} color="#5A5575" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View
        style={{
          marginHorizontal: 12,
          marginBottom: 8,
          backgroundColor: t.searchSurface,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: t.searchBorder,
          paddingHorizontal: 14,
          paddingVertical: 10,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons
            name="options-outline"
            size={18}
            color={t.subtext}
            style={{ marginRight: 10 }}
          />
          <TextInput
            value={filterQuery}
            onChangeText={setFilterQuery}
            placeholder="Quick filter by name, bio, city"
            placeholderTextColor={t.muted}
            style={{ flex: 1, color: t.text, fontSize: 14, paddingVertical: 4 }}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {filterQuery.length > 0 && (
            <TouchableOpacity onPress={() => setFilterQuery('')}>
              <Ionicons name="close-circle" size={18} color={t.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Active filter summary chips */}
      {activeFilterChips.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingHorizontal: 12, paddingVertical: 6 }}
        >
          {activeFilterChips.map((chip, i) => (
            <View
              key={i}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: '#EC489920',
                borderRadius: 16,
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderWidth: 1,
                borderColor: '#EC4899',
              }}
            >
              <Text style={{ color: '#EC4899', fontSize: 12, fontWeight: '600' }}>
                {chip.label}
              </Text>
              <TouchableOpacity onPress={chip.onRemove}>
                <Text style={{ color: '#EC4899', fontSize: 14, fontWeight: '800', lineHeight: 16 }}>
                  ✕
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Collapsible filter panel */}
      {showFilters && (
        <View
          style={{
            backgroundColor: t.elevated,
            borderBottomLeftRadius: 16,
            borderBottomRightRadius: 16,
            borderTopWidth: 1,
            borderWidth: 1,
            borderColor: t.border,
            marginHorizontal: 0,
            paddingVertical: 12,
          }}
        >
          {/* GENDER */}
          <Text
            style={{
              color: t.muted,
              fontSize: 11,
              fontWeight: '800',
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              paddingHorizontal: 16,
              marginBottom: 4,
            }}
          >
            GENDER
          </Text>
          <ChipRow options={GENDER_OPTIONS} selected={pendingGender} onSelect={setPendingGender} />

          {/* ORIENTATION */}
          <Text
            style={{
              color: t.muted,
              fontSize: 11,
              fontWeight: '800',
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              paddingHorizontal: 16,
              marginTop: 10,
              marginBottom: 4,
            }}
          >
            ORIENTATION
          </Text>
          <ChipRow
            options={ORIENTATION_OPTIONS}
            selected={pendingOrientation}
            onSelect={setPendingOrientation}
          />

          {/* LOOKING FOR */}
          <Text
            style={{
              color: t.muted,
              fontSize: 11,
              fontWeight: '800',
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              paddingHorizontal: 16,
              marginTop: 10,
              marginBottom: 4,
            }}
          >
            LOOKING FOR
          </Text>
          <ChipRow
            options={LOOKING_FOR_OPTIONS}
            selected={pendingLookingFor}
            onSelect={setPendingLookingFor}
          />

          {/* ROLE */}
          <Text
            style={{
              color: t.muted,
              fontSize: 11,
              fontWeight: '800',
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              paddingHorizontal: 16,
              marginTop: 10,
              marginBottom: 4,
            }}
          >
            ROLE
          </Text>
          <ChipRow
            options={ROLE_OPTIONS}
            selected={pendingMemberRole}
            onSelect={setPendingMemberRole}
          />

          {/* COMMUNITY */}
          <Text
            style={{
              color: t.muted,
              fontSize: 11,
              fontWeight: '800',
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              paddingHorizontal: 16,
              marginTop: 10,
              marginBottom: 4,
            }}
          >
            COMMUNITY
          </Text>
          <ChipRow
            options={COMMUNITY_OPTIONS}
            selected={pendingCommunity}
            onSelect={setPendingCommunity}
          />

          {/* Has Photo toggle */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              marginTop: 12,
            }}
          >
            <Text style={{ color: t.text, fontSize: 14 }}>📷 Has Profile Photo</Text>
            <Switch
              value={pendingHasPhoto}
              onValueChange={setPendingHasPhoto}
              trackColor={{ false: '#1A1A30', true: '#EC4899' }}
              thumbColor="#fff"
            />
          </View>

          {/* Bottom buttons */}
          <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 16 }}>
            <TouchableOpacity
              onPress={clearAllFilters}
              style={{
                flex: 1,
                paddingVertical: 11,
                borderRadius: 12,
                backgroundColor: t.surface,
                borderWidth: 1,
                borderColor: t.border,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: t.muted, fontWeight: '700', fontSize: 14 }}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={applyFilters}
              style={{
                flex: 2,
                paddingVertical: 11,
                borderRadius: 12,
                backgroundColor: '#EC4899',
                alignItems: 'center',
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
          <ActivityIndicator color="#EC4899" size="large" />
        </View>
      ) : isError && displayMembers.length === 0 ? (
        <View
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 }}
        >
          <Ionicons name="cloud-offline-outline" size={42} color={t.muted} />
          <Text
            style={{
              color: t.text,
              fontSize: 20,
              fontWeight: '800',
              textAlign: 'center',
              marginTop: 14,
            }}
          >
            Could not load members
          </Text>
          <Text
            style={{
              color: t.muted,
              fontSize: 14,
              textAlign: 'center',
              lineHeight: 21,
              marginTop: 8,
            }}
          >
            {(error as any)?.message ?? 'Please try again in a moment.'}
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            style={{
              marginTop: 18,
              paddingHorizontal: 18,
              paddingVertical: 12,
              borderRadius: 12,
              backgroundColor: t.surface,
              borderWidth: 1,
              borderColor: t.border,
            }}
          >
            <Text style={{ color: t.text, fontWeight: '800' }}>Retry</Text>
          </TouchableOpacity>
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
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 120 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#EC4899" />
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 }}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>👥</Text>
              <Text
                style={{
                  color: t.text,
                  fontSize: 18,
                  fontWeight: '800',
                  textAlign: 'center',
                  marginBottom: 8,
                }}
              >
                {query || activeFilterCount > 0 ? 'No members found' : 'No members yet'}
              </Text>
              <Text style={{ color: t.muted, fontSize: 15, textAlign: 'center' }}>
                {query
                  ? 'Try a different search term'
                  : activeFilterCount > 0
                    ? 'Try clearing some filters'
                    : 'Check back soon!'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
