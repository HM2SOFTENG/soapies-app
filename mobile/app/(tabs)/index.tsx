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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { trpc } from '../../lib/trpc';
import { colors } from '../../lib/colors';
import PostCard from '../../components/PostCard';

const COMMUNITIES = [
  { id: 'soapies', label: 'Soapies' },
  { id: 'groupus', label: 'Groupus' },
  { id: 'gaypeez', label: 'Gaypeez' },
];

// ── Skeleton loader ───────────────────────────────────────────────────────────
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
        <View style={{ width: '85%', height: 12, borderRadius: 6, backgroundColor: colors.border }} />
        <View style={{ width: '65%', height: 12, borderRadius: 6, backgroundColor: colors.border }} />
      </View>
    </Animated.View>
  );
}

// ── Announcement Banner ──────────────────────────────────────────────────────
function AnnouncementBanner({ announcement, onDismiss }: { announcement: any; onDismiss: (id: number) => void }) {
  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: 12,
        backgroundColor: `${colors.purple}22`,
        borderRadius: 14,
        borderColor: `${colors.purple}44`,
        borderWidth: 1,
        padding: 14,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <Ionicons name="megaphone" size={18} color={colors.purple} style={{ marginTop: 1, marginRight: 10 }} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14, marginBottom: 4 }}>
            {announcement.title}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 18 }}>
            {announcement.content}
          </Text>
        </View>
        {announcement.dismissible !== false && (
          <TouchableOpacity onPress={() => onDismiss(announcement.id)} style={{ marginLeft: 8 }}>
            <Ionicons name="close" size={18} color={colors.muted} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ── Comments Sheet ──────────────────────────────────────────────────────────
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
    onSuccess: () => {
      console.log('[Feed] comment added to post:', postId);
      setCommentText('');
      refetchComments();
    },
    onError: (err) => Alert.alert('Error', err.message),
  });

  const deletePost = trpc.wall.deletePost.useMutation({
    onSuccess: () => {
      console.log('[Feed] post deleted:', postId);
      onClose();
      onRefreshFeed();
    },
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
    Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deletePost.mutate({ postId }),
      },
    ]);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
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
            {/* Header */}
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

            {/* Comments list */}
            <ScrollView
              style={{ maxHeight: 320 }}
              contentContainerStyle={{ padding: 16, gap: 12 }}
            >
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
                        {(c.authorName ?? c.author?.name ?? '?').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>
                          {c.authorName ?? c.author?.name ?? 'Member'}
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

            {/* Input */}
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

export default function FeedScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [selectedCommunity, setSelectedCommunity] = useState('soapies');
  const [commentsPost, setCommentsPost] = useState<{ id: number; authorId?: number } | null>(null);
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<Set<number>>(new Set());

  const fabAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(fabAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 7 }).start();
  }, [fabAnim]);

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data, isLoading, refetch } = trpc.wall.posts.useQuery(
    { limit: 40 },
    { staleTime: 30_000, refetchOnWindowFocus: false, refetchInterval: 60_000 },
  );

  const { data: announcementsData } = trpc.announcements.active.useQuery(undefined, {
    staleTime: 60_000,
  });

  const dismissAnnouncement = trpc.announcements.dismiss.useMutation();

  const myLikes = trpc.wall.myLikes.useQuery(undefined, {
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const likeMutation = trpc.wall.like.useMutation({
    onSuccess: () => { refetch(); myLikes.refetch(); },
    onError: (err) => Alert.alert('Could not like post', err.message),
  });

  const createPost = trpc.wall.create.useMutation({
    onSuccess: () => {
      setShowComposer(false);
      setPostContent('');
      refetch();
    },
    onError: (err) => Alert.alert('Error', err.message),
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const likedPostIds = useMemo(
    () => new Set<number>((myLikes.data as number[] | undefined) ?? []),
    [myLikes.data],
  );

  const posts = useMemo(() => {
    const rawPosts = (data as any[]) ?? [];
    return rawPosts.map((p: any) => ({ ...p, isLiked: likedPostIds.has(p.id) }));
  }, [data, likedPostIds]);

  const announcements = useMemo(() => {
    const all = (announcementsData as any[]) ?? [];
    return all.filter((a: any) => !dismissedAnnouncements.has(a.id));
  }, [announcementsData, dismissedAnnouncements]);

  const handleLike = useCallback(
    (postId: number) => likeMutation.mutate({ postId }),
    [likeMutation],
  );

  const handleComment = useCallback((post: any) => {
    setCommentsPost({ id: post.id, authorId: post.authorId });
  }, []);

  function handleDismissAnnouncement(id: number) {
    setDismissedAnnouncements((prev) => new Set([...prev, id]));
    dismissAnnouncement.mutate({ announcementId: id });
  }

  // ── Composer ──────────────────────────────────────────────────────────────
  const submitPost = useCallback(() => {
    if (!postContent.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    createPost.mutate({ content: postContent.trim(), communityId: selectedCommunity, visibility: 'members' });
  }, [postContent, selectedCommunity, createPost]);

  const openComposer = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowComposer(true);
  }, []);

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
        <Text style={{ color: '#FFFFFF', fontSize: 28, fontWeight: '700', flex: 1 }}>Feed</Text>
        <Pressable onPress={openComposer} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.9 : 1 }] })}>
          <Ionicons name="create-outline" size={24} color={colors.pink} />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={{ paddingTop: 12 }}>
          <PostSkeleton />
          <PostSkeleton />
          <PostSkeleton />
        </View>
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
          ListHeaderComponent={
            announcements.length > 0 ? (
              <View style={{ paddingTop: 12 }}>
                {announcements.map((a: any) => (
                  <AnnouncementBanner key={a.id} announcement={a} onDismiss={handleDismissAnnouncement} />
                ))}
              </View>
            ) : null
          }
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={8}
          updateCellsBatchingPeriod={50}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.pink} />
          }
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 }}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>💫</Text>
              <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: 8 }}>
                It's quiet in here...
              </Text>
              <Text style={{ color: '#9CA3AF', fontSize: 15, textAlign: 'center', marginBottom: 24 }}>
                Be the first to share something with the community
              </Text>
              <Pressable onPress={openComposer} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.96 : 1 }] })}>
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

      {/* FAB */}
      <Animated.View style={{ position: 'absolute', bottom: 20, right: 20, transform: [{ scale: fabAnim }] }}>
        <Pressable
          onPress={openComposer}
          style={({ pressed }) => ({
            borderRadius: 30,
            overflow: 'hidden',
            shadowColor: colors.pink,
            shadowOpacity: 0.5,
            shadowRadius: 12,
            elevation: 8,
            transform: [{ scale: pressed ? 0.93 : 1 }],
          })}
        >
          <LinearGradient
            colors={[colors.pink, colors.purple]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ width: 56, height: 56, justifyContent: 'center', alignItems: 'center' }}
          >
            <Ionicons name="add" size={28} color="#fff" />
          </LinearGradient>
        </Pressable>
      </Animated.View>

      {/* Post Composer Modal */}
      <Modal visible={showComposer} animationType="slide" transparent>
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
                <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '700', flex: 1 }}>New Post</Text>
                <Pressable
                  onPress={() => { setShowComposer(false); setPostContent(''); }}
                  style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.9 : 1 }] })}
                >
                  <Ionicons name="close" size={24} color={colors.muted} />
                </Pressable>
              </View>

              {/* Community selector */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {COMMUNITIES.map((c) => (
                    <Pressable
                      key={c.id}
                      onPress={() => { Haptics.selectionAsync(); setSelectedCommunity(c.id); }}
                      style={({ pressed }) => ({
                        paddingHorizontal: 14,
                        paddingVertical: 7,
                        borderRadius: 20,
                        backgroundColor: selectedCommunity === c.id ? colors.pink : colors.card,
                        borderColor: selectedCommunity === c.id ? colors.pink : colors.border,
                        borderWidth: 1,
                        transform: [{ scale: pressed ? 0.96 : 1 }],
                      })}
                    >
                      <Text style={{ color: selectedCommunity === c.id ? '#fff' : colors.muted, fontWeight: '600', fontSize: 13 }}>
                        {c.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>

              <TextInput
                value={postContent}
                onChangeText={setPostContent}
                placeholder="What's on your mind?"
                placeholderTextColor="#6B7280"
                multiline
                maxLength={1000}
                style={{
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  color: '#FFFFFF',
                  fontSize: 15,
                  minHeight: 120,
                  textAlignVertical: 'top',
                  marginBottom: 16,
                }}
              />

              <Pressable
                onPress={submitPost}
                disabled={!postContent.trim() || createPost.isPending}
                style={({ pressed }) => ({
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                  opacity: !postContent.trim() || createPost.isPending ? 0.5 : 1,
                })}
              >
                <LinearGradient
                  colors={[colors.pink, colors.purple]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}
                >
                  {createPost.isPending ? <ActivityIndicator color="#fff" /> : (
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
