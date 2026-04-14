import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  Pressable,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { trpc } from '../../lib/trpc';
import { useAuth } from '../../lib/auth';
import { colors } from '../../lib/colors';
import PostCard from '../../components/PostCard';
import Avatar from '../../components/Avatar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Quick Actions ─────────────────────────────────────────────────────────────

const quickActions = [
  { label: 'Events', icon: 'calendar' as const, route: '/(tabs)/events', color: colors.pink },
  { label: 'Messages', icon: 'chatbubbles' as const, route: '/messages', color: colors.purple },
  { label: 'Members', icon: 'people' as const, route: '/members', color: '#10B981' },
  { label: 'My Tickets', icon: 'ticket-outline' as const, route: '/tickets', color: '#F59E0B' },
  { label: 'Credits', icon: 'gift' as const, route: '/credits', color: '#EC4899' },
  { label: 'Invite', icon: 'share-social' as const, route: '/referrals', color: '#8B5CF6' },
];

function QuickActionGrid() {
  const router = useRouter();
  const scales = useRef(quickActions.map(() => new Animated.Value(1))).current;

  function onPressIn(i: number) {
    Animated.spring(scales[i], { toValue: 0.92, useNativeDriver: true, speed: 40 }).start();
  }
  function onPressOut(i: number) {
    Animated.spring(scales[i], { toValue: 1, useNativeDriver: true, speed: 20 }).start();
  }
  function onPress(item: typeof quickActions[number]) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      router.push(item.route as any);
    } catch (_) {}
  }

  // 3-column grid
  const rows: typeof quickActions[] = [];
  for (let i = 0; i < quickActions.length; i += 3) {
    rows.push(quickActions.slice(i, i + 3));
  }

  return (
    <View style={{ marginHorizontal: 16, marginBottom: 4 }}>
      {rows.map((row, ri) => (
        <View key={ri} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
          {row.map((item, ci) => {
            const idx = ri * 3 + ci;
            return (
              <Animated.View key={item.label} style={{ transform: [{ scale: scales[idx] }], flex: 1, marginHorizontal: 4 }}>
                <TouchableOpacity
                  activeOpacity={1}
                  onPressIn={() => onPressIn(idx)}
                  onPressOut={() => onPressOut(idx)}
                  onPress={() => onPress(item)}
                  style={{
                    backgroundColor: colors.card,
                    borderRadius: 14,
                    borderColor: colors.border,
                    borderWidth: 1,
                    paddingVertical: 14,
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: `${item.color}22`,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Ionicons name={item.icon} size={20} color={item.color} />
                  </View>
                  <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600', textAlign: 'center' }}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ── Announcement Banner ───────────────────────────────────────────────────────

function AnnouncementCard({ announcement, onDismiss }: { announcement: any; onDismiss: (id: number) => void }) {
  return (
    <View
      style={{
        minWidth: SCREEN_WIDTH * 0.75,
        backgroundColor: `${colors.purple}22`,
        borderRadius: 14,
        borderColor: `${colors.purple}44`,
        borderWidth: 1,
        padding: 14,
        marginRight: 10,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <Ionicons name="megaphone" size={16} color={colors.purple} style={{ marginTop: 1, marginRight: 10 }} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13, marginBottom: 3 }}>
            {announcement.title}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17 }} numberOfLines={3}>
            {announcement.content}
          </Text>
        </View>
        {announcement.dismissible !== false && (
          <TouchableOpacity onPress={() => onDismiss(announcement.id)} style={{ marginLeft: 8, padding: 2 }}>
            <Ionicons name="close" size={16} color={colors.muted} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function AnnouncementSection({
  announcements,
  onDismiss,
}: {
  announcements: any[];
  onDismiss: (id: number) => void;
}) {
  if (!announcements.length) return null;

  if (announcements.length === 1) {
    return (
      <View style={{ marginHorizontal: 16, marginBottom: 14 }}>
        <AnnouncementCard announcement={announcements[0]} onDismiss={onDismiss} />
      </View>
    );
  }

  return (
    <View style={{ marginBottom: 14 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      >
        {announcements.map((a: any) => (
          <AnnouncementCard key={a.id} announcement={a} onDismiss={onDismiss} />
        ))}
      </ScrollView>
    </View>
  );
}

// ── Upcoming Event Teaser ─────────────────────────────────────────────────────

function EventTeaser({ event }: { event: any }) {
  const router = useRouter();
  if (!event) return null;

  const diff = new Date(event.startDate).getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  const label = days <= 0 ? 'Today!' : days === 1 ? 'Tomorrow' : `In ${days} days`;

  return (
    <TouchableOpacity
      onPress={() => {
        Haptics.selectionAsync();
        try { (router as any).push('/(tabs)/events'); } catch (_) {}
      }}
      style={{ marginHorizontal: 16, marginBottom: 14 }}
    >
      <LinearGradient
        colors={[`${colors.purple}44`, `${colors.pink}33`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 14,
          borderColor: `${colors.purple}55`,
          borderWidth: 1,
          padding: 14,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: `${colors.pink}33`,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12,
          }}
        >
          <Ionicons name="calendar" size={22} color={colors.pink} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 }}>
            Next Event
          </Text>
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }} numberOfLines={1}>
            {event.title}
          </Text>
          <Text style={{ color: colors.purple, fontSize: 12, fontWeight: '600', marginTop: 2 }}>{label}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ── Post Skeleton ─────────────────────────────────────────────────────────────

function PostSkeleton() {
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
        backgroundColor: colors.card,
        borderRadius: 16,
        marginHorizontal: 16,
        marginBottom: 12,
        borderColor: colors.border,
        borderWidth: 1,
        padding: 16,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.border }} />
        <View style={{ marginLeft: 10, gap: 6 }}>
          <View style={{ width: 100, height: 12, borderRadius: 6, backgroundColor: colors.border }} />
          <View style={{ width: 60, height: 10, borderRadius: 5, backgroundColor: colors.border }} />
        </View>
      </View>
      <View style={{ gap: 8 }}>
        <View style={{ width: '100%', height: 12, borderRadius: 6, backgroundColor: colors.border }} />
        <View style={{ width: '80%', height: 12, borderRadius: 6, backgroundColor: colors.border }} />
        <View style={{ width: '60%', height: 12, borderRadius: 6, backgroundColor: colors.border }} />
      </View>
    </Animated.View>
  );
}

// ── Comments Sheet ────────────────────────────────────────────────────────────

function CommentsSheet({
  postId,
  postAuthorId,
  visible,
  onClose,
  onRefreshFeed,
}: {
  postId: number | null;
  postAuthorId?: number;
  visible: boolean;
  onClose: () => void;
  onRefreshFeed: () => void;
}) {
  const [commentText, setCommentText] = useState('');
  const { data: meData } = trpc.auth.me.useQuery();
  const me = meData as any;

  const { data: commentsData, isLoading: loadingComments, refetch: refetchComments } = trpc.wall.comments.useQuery(
    { postId: postId ?? 0 },
    { enabled: !!postId && visible },
  );

  const addComment = trpc.wall.addComment.useMutation({
    onSuccess: () => { setCommentText(''); refetchComments(); },
    onError: (err) => Alert.alert('Error', err.message),
  });

  const deletePost = trpc.wall.deletePost.useMutation({
    onSuccess: () => { onClose(); onRefreshFeed(); },
    onError: (err) => Alert.alert('Error', err.message),
  });

  const comments = (commentsData as any[]) ?? [];
  const isOwn = me?.id === postAuthorId;

  function submitComment() {
    if (!commentText.trim() || !postId) return;
    addComment.mutate({ postId, content: commentText.trim() });
  }

  function handleDeletePost() {
    if (!postId) return;
    Alert.alert('Delete Post', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deletePost.mutate({ postId }) },
    ]);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: colors.bg,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: '80%',
              borderColor: colors.border,
              borderTopWidth: 1,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 20,
                paddingBottom: 12,
                borderBottomColor: colors.border,
                borderBottomWidth: 1,
              }}
            >
              <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700', flex: 1 }}>
                Comments {comments.length > 0 ? `(${comments.length})` : ''}
              </Text>
              {isOwn && (
                <TouchableOpacity onPress={handleDeletePost} style={{ marginRight: 14 }} disabled={deletePost.isPending}>
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color={colors.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 320 }} contentContainerStyle={{ padding: 16, gap: 12 }}>
              {loadingComments ? (
                <ActivityIndicator color={colors.pink} style={{ paddingVertical: 20 }} />
              ) : comments.length === 0 ? (
                <Text style={{ color: colors.muted, textAlign: 'center', paddingVertical: 20 }}>
                  No comments yet. Be the first!
                </Text>
              ) : (
                comments.map((c: any) => (
                  <View key={c.id} style={{ flexDirection: 'row', gap: 10 }}>
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: colors.card,
                        justifyContent: 'center',
                        alignItems: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Text style={{ color: colors.pink, fontWeight: '700', fontSize: 12 }}>
                        {(c.resolvedAuthorName ?? c.authorName ?? c.author?.name ?? '?').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>
                          {c.resolvedAuthorName ?? c.authorName ?? c.author?.name ?? 'Member'}
                        </Text>
                        <Text style={{ color: colors.muted, fontSize: 11 }}>
                          {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ''}
                        </Text>
                      </View>
                      <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 19 }}>{c.content}</Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 16,
                borderTopColor: colors.border,
                borderTopWidth: 1,
                gap: 10,
              }}
            >
              <TextInput
                value={commentText}
                onChangeText={setCommentText}
                placeholder="Add a comment..."
                placeholderTextColor={colors.muted}
                multiline
                style={{
                  flex: 1,
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: 20,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  color: colors.text,
                  fontSize: 14,
                  maxHeight: 100,
                }}
              />
              <TouchableOpacity
                onPress={submitComment}
                disabled={!commentText.trim() || addComment.isPending}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: commentText.trim() ? colors.pink : colors.card,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                {addComment.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Ionicons name="send" size={18} color={commentText.trim() ? '#fff' : colors.muted} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [composerText, setComposerText] = useState('');
  const [dismissedIds, setDismissedIds] = useState<number[]>([]);
  const [commentsPost, setCommentsPost] = useState<{ id: number; authorId?: number } | null>(null);

  // ── Data ────────────────────────────────────────────────────────────────────
  const { hasToken } = useAuth();

  const { data: meData } = trpc.auth.me.useQuery(undefined, { staleTime: 0, enabled: hasToken });
  const me = meData as any;

  const { data: profileData } = trpc.profile.me.useQuery(undefined, { staleTime: 0, enabled: hasToken });
  const profile = profileData as any;

  const {
    data: postsData,
    isLoading,
    refetch: refetchPosts,
  } = trpc.wall.posts.useQuery(
    { communityId: 'soapies', limit: 50 },
    { staleTime: 30_000, refetchOnWindowFocus: false, refetchInterval: 60_000, enabled: hasToken },
  );

  const { data: announcementsRaw } = trpc.announcements.active.useQuery(undefined, { staleTime: 60_000, enabled: hasToken });
  const dismissAnnouncement = trpc.announcements.dismiss.useMutation();

  const { data: eventsRaw } = trpc.events.list.useQuery({ communityId: 'soapies' }, { staleTime: 120_000 });

  const myLikes = trpc.wall.myLikes.useQuery(undefined, { staleTime: 30_000, refetchOnWindowFocus: false, enabled: hasToken });

  const utils = trpc.useUtils();

  const likeMutation = trpc.wall.like.useMutation({
    onSuccess: () => { refetchPosts(); myLikes.refetch(); },
    onError: (err) => Alert.alert('Could not like post', err.message),
  });

  const createPostMutation = trpc.wall.create.useMutation({
    onSuccess: () => {
      utils.wall.posts.invalidate();
      setComposerText('');
      setShowComposer(false);
    },
    onError: (err) => Alert.alert('Error', err.message),
  });

  // ── Derived data ────────────────────────────────────────────────────────────
  const likedPostIds = useMemo(
    () => new Set<number>((myLikes.data as number[] | undefined) ?? []),
    [myLikes.data],
  );

  const allEvents = useMemo(() => {
    const raw = (eventsRaw as any)?.events ?? eventsRaw ?? [];
    return (raw as any[]) ?? [];
  }, [eventsRaw]);

  const nextEvent = useMemo(
    () => allEvents.find((e: any) => e.status === 'published' && new Date(e.startDate) >= new Date()) ?? null,
    [allEvents],
  );

  const announcements = useMemo(() => {
    const all = (announcementsRaw as any[]) ?? [];
    return all.filter((a: any) => !dismissedIds.includes(a.id));
  }, [announcementsRaw, dismissedIds]);

  const posts = useMemo(() => {
    const rawPosts = (postsData as any[]) ?? [];
    return rawPosts.map((p: any) => ({
      ...p,
      authorName: p.authorName ?? p.profile?.displayName ?? 'Soapies Member',
      resolvedAuthorName: p.authorName ?? p.profile?.displayName ?? 'Soapies Member',
      resolvedAvatarUrl: p.avatarUrl ?? p.profile?.avatarUrl ?? null,
      likesCount: p.likesCount ?? p._count?.likes ?? 0,
      commentsCount: p.commentsCount ?? p._count?.comments ?? 0,
      isLiked: likedPostIds.has(p.id),
    }));
  }, [postsData, likedPostIds]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchPosts();
    setRefreshing(false);
  }, [refetchPosts]);

  const handleLike = useCallback((postId: number) => likeMutation.mutate({ postId }), [likeMutation]);
  const handleComment = useCallback((post: any) => setCommentsPost({ id: post.id, authorId: post.authorId }), []);

  function handleDismiss(id: number) {
    setDismissedIds((prev) => [...prev, id]);
    dismissAnnouncement.mutate({ announcementId: id });
  }

  function submitPost() {
    if (!composerText.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    createPostMutation.mutate({ content: composerText.trim(), communityId: 'soapies', visibility: 'members' } as any);
  }

  const displayName = profile?.displayName ?? me?.name ?? 'there';

  // ── List header (rendered above posts) ──────────────────────────────────────
  const ListHeader = useMemo(() => (
    <View>
      {/* Greeting + search */}
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
        <Text style={{ color: colors.text, fontSize: 26, fontWeight: '800', marginBottom: 10 }}>
          Hey {displayName} 👋
        </Text>
        <TouchableOpacity
          activeOpacity={0.7}
          style={{
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
          <Ionicons name="search" size={16} color={colors.muted} />
          <Text style={{ color: colors.muted, marginLeft: 8, fontSize: 14 }}>Search community…</Text>
        </TouchableOpacity>
      </View>

      {/* Quick actions */}
      <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: 20, marginBottom: 10 }}>
        Quick Actions
      </Text>
      <QuickActionGrid />

      {/* Announcements */}
      {announcements.length > 0 && (
        <View style={{ marginBottom: 4 }}>
          <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: 20, marginBottom: 10 }}>
            Announcements
          </Text>
          <AnnouncementSection announcements={announcements} onDismiss={handleDismiss} />
        </View>
      )}

      {/* Next event teaser */}
      {nextEvent && (
        <View style={{ marginBottom: 4 }}>
          <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: 20, marginBottom: 10 }}>
            Upcoming
          </Text>
          <EventTeaser event={nextEvent} />
        </View>
      )}

      {/* Feed header + composer */}
      <View style={{ paddingHorizontal: 20, marginBottom: 10 }}>
        <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
          Community Feed
        </Text>
        {/* Composer trigger */}
        <TouchableOpacity
          onPress={() => { Haptics.selectionAsync(); setShowComposer(true); }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.card,
            borderRadius: 12,
            padding: 14,
            borderColor: colors.border,
            borderWidth: 1,
            marginBottom: 12,
          }}
        >
          <Avatar name={profile?.displayName ?? 'Me'} url={profile?.avatarUrl} size={32} />
          <Text style={{ color: colors.muted, marginLeft: 10, flex: 1, fontSize: 14 }}>What's on your mind?</Text>
          <Ionicons name="image-outline" size={20} color={colors.muted} />
        </TouchableOpacity>
      </View>
    </View>
  ), [displayName, announcements, nextEvent, profile]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {isLoading ? (
        <ScrollView>
          {ListHeader}
          <PostSkeleton />
          <PostSkeleton />
          <PostSkeleton />
        </ScrollView>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item: any) => String(item.id)}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              onLike={() => handleLike(item.id as number)}
              onComment={() => handleComment(item)}
              onPress={() => handleComment(item)}
              onRefresh={onRefresh}
            />
          )}
          ListHeaderComponent={ListHeader}
          removeClippedSubviews
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={8}
          updateCellsBatchingPeriod={50}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.pink} />
          }
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 40, paddingHorizontal: 32 }}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>💫</Text>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: 8 }}>
                It's quiet in here…
              </Text>
              <Text style={{ color: colors.muted, fontSize: 15, textAlign: 'center', marginBottom: 24 }}>
                Be the first to share something with the community
              </Text>
              <Pressable
                onPress={() => { Haptics.selectionAsync(); setShowComposer(true); }}
                style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.96 : 1 }] })}
              >
                <LinearGradient
                  colors={[colors.pink, colors.purple]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 8 }}
                >
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Create Post</Text>
                </LinearGradient>
              </Pressable>
            </View>
          }
        />
      )}

      {/* Post Composer Modal */}
      <Modal visible={showComposer} animationType="slide" transparent onRequestClose={() => setShowComposer(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
            <View
              style={{
                backgroundColor: colors.bg,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: 20,
                paddingBottom: 40,
                borderColor: colors.border,
                borderTopWidth: 1,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <Avatar name={profile?.displayName ?? 'Me'} url={profile?.avatarUrl} size={36} />
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', flex: 1, marginLeft: 10 }}>New Post</Text>
                <TouchableOpacity
                  onPress={() => { setShowComposer(false); setComposerText(''); }}
                >
                  <Ionicons name="close" size={24} color={colors.muted} />
                </TouchableOpacity>
              </View>

              <TextInput
                value={composerText}
                onChangeText={setComposerText}
                placeholder="What's on your mind?"
                placeholderTextColor={colors.muted}
                multiline
                maxLength={1000}
                autoFocus
                style={{
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  color: colors.text,
                  fontSize: 15,
                  minHeight: 130,
                  textAlignVertical: 'top',
                  marginBottom: 16,
                }}
              />

              <Pressable
                onPress={submitPost}
                disabled={!composerText.trim() || createPostMutation.isPending}
                style={({ pressed }) => ({
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                  opacity: !composerText.trim() || createPostMutation.isPending ? 0.5 : 1,
                })}
              >
                <LinearGradient
                  colors={[colors.pink, colors.purple]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}
                >
                  {createPostMutation.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Post</Text>
                  )}
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Comments Sheet */}
      <CommentsSheet
        postId={commentsPost?.id ?? null}
        postAuthorId={commentsPost?.authorId}
        visible={!!commentsPost}
        onClose={() => setCommentsPost(null)}
        onRefreshFeed={onRefresh}
      />
    </SafeAreaView>
  );
}
