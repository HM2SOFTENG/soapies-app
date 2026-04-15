import React, { useRef, useMemo, useState, useEffect } from 'react';
import { View, Text, Image, Animated, Pressable, TouchableOpacity, Alert, Share, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import Avatar from './Avatar';
import { colors } from '../lib/colors';
import { formatDistanceToNow, communityColor } from '../lib/utils';

export interface PostCardPost {
  id: string | number;
  authorName?: string | null;
  resolvedAuthorName?: string | null;
  resolvedAvatarUrl?: string | null;
  authorInitials?: string | null;
  content?: string | null;
  mediaUrl?: string | null;
  mediaType?: string | null;
  likeCount?: number | null;
  commentCount?: number | null;
  likesCount?: number | null;
  commentsCount?: number | null;
  createdAt?: string | null;
  isLiked?: boolean | null;
  community?: string | null;
  communityId?: string | null;
  // server-side shape aliases
  authorId?: number | null;
  visibility?: string | null;
}

interface PostCardProps {
  post: PostCardPost;
  onLike?: (postId: number) => void;
  onComment?: (post: any) => void;
  onShare?: (post: any) => void;
  onBookmark?: (postId: number) => void;
  onReact?: (postId: number, emoji: string) => void;
  onReport?: (postId: number) => void;
  onDelete?: (postId: number) => void;
  onPress?: () => void;
  onRefresh?: () => void;
  currentUserId?: number;
  isLiked?: boolean;
  isBookmarked?: boolean;
}

const REACTIONS = ['❤️', '🔥', '😍', '😂', '🙌', '💜'];
const BOOKMARKS_KEY = 'wall_bookmarks';

const PostCard = React.memo(function PostCard({
  post,
  onLike,
  onComment,
  onShare,
  onBookmark,
  onReact,
  onReport,
  onDelete,
  onPress,
  currentUserId,
  isLiked: isLikedProp,
  isBookmarked: isBookmarkedProp,
}: PostCardProps) {
  const community = post.community ?? post.communityId;
  const badgeColor = useMemo(() => communityColor(community), [community]);
  const timeAgo = useMemo(
    () => (post.createdAt ? formatDistanceToNow(new Date(post.createdAt)) : ''),
    [post.createdAt],
  );

  // Like button spring animation
  const likeScale = useRef(new Animated.Value(1)).current;

  // Local state
  const [showReactions, setShowReactions] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(isBookmarkedProp ?? false);

  // Load bookmark state from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem(BOOKMARKS_KEY).then((raw) => {
      if (!raw) return;
      try {
        const ids: number[] = JSON.parse(raw);
        setIsBookmarked(ids.includes(Number(post.id)));
      } catch (_) {}
    });
  }, [post.id]);

  function handleLike() {
    if (!onLike) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.spring(likeScale, { toValue: 1.35, useNativeDriver: true, speed: 40, bounciness: 12 }),
      Animated.spring(likeScale, { toValue: 1.0, useNativeDriver: true, speed: 20, bounciness: 6 }),
    ]).start();
    onLike(Number(post.id));
  }

  function handleLikeLongPress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowReactions(true);
  }

  function handleComment() {
    if (!onComment) return;
    Haptics.selectionAsync();
    onComment(post);
  }

  async function handleShare() {
    try {
      await Share.share({
        message: `${post.content ?? ''}\n\n— Shared from Soapies Community`,
        title: 'Soapies Community Post',
      });
      onShare?.(post);
    } catch (_) {}
  }

  async function handleBookmark() {
    const postId = Number(post.id);
    const raw = await AsyncStorage.getItem(BOOKMARKS_KEY).catch(() => null);
    let ids: number[] = [];
    try { ids = raw ? JSON.parse(raw) : []; } catch (_) {}
    const already = ids.includes(postId);
    const next = already ? ids.filter((x) => x !== postId) : [...ids, postId];
    await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(next));
    setIsBookmarked(!already);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onBookmark?.(postId);
  }

  function handleMore() {
    const isOwn = post.authorId != null && currentUserId != null && post.authorId === currentUserId;
    if (isOwn) {
      Alert.alert('Post Options', '', [
        {
          text: 'Delete Post',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Delete Post', 'Are you sure?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => onDelete?.(Number(post.id)) },
            ]);
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } else {
      Alert.alert('Post Options', '', [
        { text: 'Report Post', style: 'destructive', onPress: () => onReport?.(Number(post.id)) },
        {
          text: 'Hide Post',
          onPress: () => {
            // Future: hide locally
            Alert.alert('Post hidden', "You won't see this post again.");
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }

  const effectiveLiked = isLikedProp ?? post.isLiked ?? false;

  return (
    <Pressable
      onPress={() => {
        if (showReactions) { setShowReactions(false); return; }
        if (onPress) { Haptics.selectionAsync(); onPress(); }
      }}
      style={({ pressed }) => ({
        backgroundColor: colors.card,
        borderRadius: 16,
        marginHorizontal: 16,
        marginBottom: 12,
        borderColor: colors.border,
        borderWidth: 1,
        overflow: 'visible',
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      {/* Author row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
        <Avatar name={post.resolvedAuthorName ?? post.authorName} url={post.resolvedAvatarUrl} size="sm" />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>
            {post.resolvedAuthorName ?? post.authorName ?? 'Member'}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '400' }}>{timeAgo}</Text>
        </View>
        {community && (
          <View style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, backgroundColor: `${badgeColor}22` }}>
            <Text style={{ color: badgeColor, fontSize: 11, fontWeight: '600' }}>
              {community.charAt(0).toUpperCase() + community.slice(1)}
            </Text>
          </View>
        )}
      </View>

      {/* Content */}
      {post.content ? (
        <Text style={{ color: '#E5E7EB', fontSize: 15, fontWeight: '400', lineHeight: 22, paddingHorizontal: 16, paddingBottom: 14 }}>
          {post.content}
        </Text>
      ) : null}

      {/* Media image */}
      {post.mediaUrl && post.mediaType !== 'link' ? (
        <View style={{ width: '100%', height: 200, backgroundColor: '#1a1a1a' }}>
          <Image
            source={{ uri: post.mediaUrl }}
            style={{ width: '100%', height: 200 }}
            resizeMode="cover"
            onError={(e) => console.log('[PostCard] image load error:', e.nativeEvent.error, 'url:', post.mediaUrl)}
          />
        </View>
      ) : null}

      {/* Link preview */}
      {post.mediaType === 'link' && post.mediaUrl ? (
        <TouchableOpacity
          onPress={() => Linking.openURL(post.mediaUrl!)}
          style={{ borderColor: colors.border, borderWidth: 1, borderRadius: 12, overflow: 'hidden', marginTop: 4, marginHorizontal: 16, marginBottom: 8 }}
        >
          <View style={{ backgroundColor: colors.card, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="link" size={20} color="#10B981" />
            <Text style={{ color: '#10B981', fontSize: 13, flex: 1 }} numberOfLines={1}>{post.mediaUrl}</Text>
            <Ionicons name="open-outline" size={16} color={colors.muted} />
          </View>
        </TouchableOpacity>
      ) : null}

      {/* Actions */}
      <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4, borderTopColor: colors.border, borderTopWidth: 1, marginTop: 4 }}>
        <View style={{ flexDirection: 'row', gap: 4 }}>

          {/* Like with long-press reactions */}
          <View style={{ position: 'relative', flex: 1 }}>
            {showReactions && (
              <View style={{
                position: 'absolute', bottom: 36, left: 0,
                flexDirection: 'row', gap: 6, backgroundColor: colors.card,
                borderRadius: 24, padding: 8, borderColor: colors.border, borderWidth: 1,
                shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8,
                elevation: 8, zIndex: 999,
              }}>
                {REACTIONS.map(emoji => (
                  <TouchableOpacity
                    key={emoji}
                    onPress={() => { onReact?.(Number(post.id), emoji); setShowReactions(false); }}
                    style={{ padding: 4 }}
                  >
                    <Text style={{ fontSize: 24 }}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <Pressable
              onPress={handleLike}
              onLongPress={handleLikeLongPress}
              style={({ pressed }) => ({
                flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 6,
                transform: [{ scale: pressed ? 0.92 : 1 }],
              })}
            >
              <Animated.View style={{ transform: [{ scale: likeScale }] }}>
                <Ionicons
                  name={effectiveLiked ? 'heart' : 'heart-outline'}
                  size={20}
                  color={effectiveLiked ? colors.pink : colors.muted}
                />
              </Animated.View>
              <Text style={{ color: colors.muted, fontSize: 13 }}>{post.likeCount ?? post.likesCount ?? 0}</Text>
            </Pressable>
          </View>

          {/* Comment */}
          <Pressable
            onPress={handleComment}
            style={({ pressed }) => ({
              flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 6,
              transform: [{ scale: pressed ? 0.96 : 1 }],
            })}
          >
            <Ionicons name="chatbubble-outline" size={19} color={colors.muted} />
            <Text style={{ color: colors.muted, fontSize: 13 }}>{post.commentCount ?? post.commentsCount ?? 0}</Text>
          </Pressable>

          {/* Share */}
          <TouchableOpacity
            onPress={handleShare}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, padding: 6 }}
          >
            <Ionicons name="arrow-redo-outline" size={18} color={colors.muted} />
            <Text style={{ color: colors.muted, fontSize: 13 }}>Share</Text>
          </TouchableOpacity>

          {/* Bookmark */}
          <TouchableOpacity
            onPress={handleBookmark}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, padding: 6 }}
          >
            <Ionicons
              name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
              size={18}
              color={isBookmarked ? colors.pink : colors.muted}
            />
          </TouchableOpacity>

          {/* More (⋯) */}
          <TouchableOpacity
            onPress={handleMore}
            style={{ padding: 6, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="ellipsis-horizontal" size={18} color={colors.muted} />
          </TouchableOpacity>
        </View>
      </View>
    </Pressable>
  );
});

export default PostCard;
