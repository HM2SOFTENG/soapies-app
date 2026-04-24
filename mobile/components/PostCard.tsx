import React, { useRef, useMemo, useState, useEffect } from 'react';
import { View, Text, Animated, Pressable, TouchableOpacity, Alert, Share, Linking, ActionSheetIOS, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import Avatar from './Avatar';
import { useTheme } from '../lib/theme';
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
  const theme = useTheme();
  const community = post.community ?? post.communityId;
  const badgeColor = useMemo(() => communityColor(community), [community]);
  const router = useRouter();

  function handleAuthorPress() {
    const authorId = post.authorId;
    if (!authorId || authorId === currentUserId) return;
    Haptics.selectionAsync();
    router.push(`/member/${authorId}` as any);
  }

  const timeAgo = useMemo(
    () => (post.createdAt ? formatDistanceToNow(new Date(post.createdAt)) : ''),
    [post.createdAt],
  );

  // Like button spring animation
  const likeScale = useRef(new Animated.Value(1)).current;

  const [showReactions, setShowReactions] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(isBookmarkedProp ?? false);

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
      Animated.spring(likeScale, { toValue: 1.3, useNativeDriver: true, speed: 40, bounciness: 12 }),
      Animated.spring(likeScale, { toValue: 1.0, useNativeDriver: true, speed: 20, bounciness: 12 }),
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

    const confirmDelete = () => {
      Alert.alert('Delete Post', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete?.(Number(post.id)) },
      ]);
    };

    const hidePost = () => {
      Alert.alert('Post hidden', "You won't see this post again.");
    };

    if (Platform.OS === 'ios') {
      const options = isOwn ? ['Delete Post', 'Cancel'] : ['Report Post', 'Hide Post', 'Cancel'];
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: options.length - 1,
          destructiveButtonIndex: 0,
          userInterfaceStyle: theme.scheme === 'dark' ? 'dark' : 'light',
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            if (isOwn) confirmDelete();
            else onReport?.(Number(post.id));
          } else if (!isOwn && buttonIndex === 1) {
            hidePost();
          }
        },
      );
      return;
    }

    if (isOwn) {
      Alert.alert('Post Options', '', [
        { text: 'Delete Post', style: 'destructive', onPress: confirmDelete },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } else {
      Alert.alert('Post Options', '', [
        { text: 'Report Post', style: 'destructive', onPress: () => onReport?.(Number(post.id)) },
        { text: 'Hide Post', onPress: hidePost },
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
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        marginHorizontal: 16,
        marginBottom: 0,
        borderColor: theme.colors.border,
        borderWidth: 1,
        overflow: 'hidden',
        shadowColor: theme.colors.shadow,
        shadowOpacity: 0.3,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
        transform: [{ scale: pressed ? 0.985 : 1 }],
      })}
    >
      {/* Community accent line */}
      <View style={{
        height: 2.5,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        backgroundColor: badgeColor ?? theme.colors.pink,
        opacity: 0.55,
      }} />

      {/* Author row — tappable to view profile */}
      <TouchableOpacity
        onPress={handleAuthorPress}
        activeOpacity={post.authorId && post.authorId !== currentUserId ? 0.7 : 1}
        style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}
      >
        <View style={{ borderWidth: 1, borderColor: theme.alpha(theme.colors.primary, 0.18), borderRadius: 50 }}>
          <Avatar name={post.resolvedAuthorName ?? post.authorName} url={post.resolvedAvatarUrl} size="sm" />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 14 }}>
            {post.resolvedAuthorName ?? post.authorName ?? 'Member'}
          </Text>
          <Text style={{ color: theme.colors.textMuted, fontSize: 11, fontWeight: '400' }}>{timeAgo}</Text>
        </View>
        {community && (
          <View style={{
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 10,
            backgroundColor: `${badgeColor}33`,
          }}>
            <Text style={{ color: badgeColor, fontSize: 10, fontWeight: '700' }}>
              {community.charAt(0).toUpperCase() + community.slice(1)}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Content */}
      {post.content ? (
        <Text style={{
          color: theme.colors.textSecondary,
          fontSize: 14,
          fontWeight: '400',
          lineHeight: 21,
          paddingHorizontal: 16,
          paddingBottom: 14,
        }}>
          {post.content}
        </Text>
      ) : null}

      {/* Media image — edge-to-edge within card */}
      {post.mediaUrl && post.mediaType !== 'link' ? (
        <View style={{ width: '100%', overflow: 'hidden', marginTop: 2 }}>
          <Image
            source={{ uri: post.mediaUrl }}
            style={{ width: '100%', height: 200 }}
            contentFit="cover"
            onError={(e) => { if (__DEV__) console.log('[PostCard] image load error:', e, 'url:', post.mediaUrl); }}
          />
        </View>
      ) : null}

      {/* Link preview */}
      {post.mediaType === 'link' && post.mediaUrl ? (
        <TouchableOpacity
          onPress={() => Linking.openURL(post.mediaUrl!)}
          style={{
            backgroundColor: theme.colors.surfaceMuted,
            borderColor: theme.colors.border,
            borderWidth: 1,
            borderRadius: 12,
            overflow: 'hidden',
            marginTop: 4,
            marginHorizontal: 16,
            marginBottom: 8,
          }}
        >
          <View style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="link" size={20} color="#10B981" />
            <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 13, flex: 1 }} numberOfLines={1}>
              {post.mediaUrl}
            </Text>
            <Text style={{ color: theme.colors.textMuted, fontSize: 11 }} numberOfLines={1}>
              {post.mediaUrl?.replace(/^https?:\/\//, '').split('/')[0]}
            </Text>
            <Ionicons name="open-outline" size={16} color={theme.colors.textMuted} />
          </View>
        </TouchableOpacity>
      ) : null}

      {/* ── Action bar ── */}
      <View style={{
        backgroundColor: theme.colors.surfaceMuted,
        borderTopColor: theme.colors.border,
        borderTopWidth: 1,
        paddingVertical: 10,
        paddingHorizontal: 16,
      }}>
        <View style={{ flexDirection: 'row', gap: 4 }}>

          {/* Like with long-press reactions */}
          <View style={{ position: 'relative', flex: 1 }}>
            {showReactions && (
              <View style={{
                position: 'absolute',
                bottom: 40,
                left: 0,
                flexDirection: 'row',
                gap: 4,
                backgroundColor: theme.colors.surfaceMuted,
                borderRadius: 20,
                padding: 8,
                borderColor: theme.colors.border,
                borderWidth: 1,
                shadowColor: theme.colors.shadow,
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
                zIndex: 999,
              }}>
                {REACTIONS.map(emoji => (
                  <TouchableOpacity
                    key={emoji}
                    onPress={() => { onReact?.(Number(post.id), emoji); setShowReactions(false); }}
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: theme.colors.surfaceHigh,
                    }}
                  >
                    <Text style={{ fontSize: 22 }}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <Pressable
              onPress={handleLike}
              onLongPress={handleLikeLongPress}
              style={({ pressed }) => ({
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                paddingVertical: 6,
                paddingHorizontal: effectiveLiked ? 10 : 6,
                borderRadius: effectiveLiked ? 20 : 6,
                backgroundColor: effectiveLiked ? theme.alpha(theme.colors.primary, 0.08) : 'transparent',
                transform: [{ scale: pressed ? 0.92 : 1 }],
              })}
            >
              <Animated.View style={{ transform: [{ scale: likeScale }] }}>
                <Ionicons
                  name={effectiveLiked ? 'heart' : 'heart-outline'}
                  size={20}
                  color={effectiveLiked ? theme.colors.primary : theme.colors.textMuted}
                />
              </Animated.View>
              <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>{post.likeCount ?? post.likesCount ?? 0}</Text>
            </Pressable>
          </View>

          {/* Comment */}
          <Pressable
            onPress={handleComment}
            style={({ pressed }) => ({
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              padding: 6,
              transform: [{ scale: pressed ? 0.96 : 1 }],
            })}
          >
            <Ionicons name="chatbubble-outline" size={19} color={theme.colors.textMuted} />
            <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>{post.commentCount ?? post.commentsCount ?? 0}</Text>
          </Pressable>

          {/* Share */}
          <TouchableOpacity
            onPress={handleShare}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, padding: 6 }}
          >
            <Ionicons name="arrow-redo-outline" size={18} color={theme.colors.textMuted} />
            <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>Share</Text>
          </TouchableOpacity>

          {/* Bookmark */}
          <TouchableOpacity
            onPress={handleBookmark}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, padding: 6 }}
          >
            <Ionicons
              name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
              size={18}
              color={isBookmarked ? theme.colors.pink : theme.colors.textMuted}
            />
          </TouchableOpacity>

          {/* More (⋯) */}
          <TouchableOpacity
            onPress={handleMore}
            style={{ padding: 6, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="ellipsis-horizontal" size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>
    </Pressable>
  );
});

export default PostCard;
