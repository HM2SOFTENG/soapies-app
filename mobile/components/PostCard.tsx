import React, { useRef, useMemo } from 'react';
import { View, Text, Image, Animated, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  onLike?: () => void;
  onComment?: () => void;
  onPress?: () => void;
  onRefresh?: () => void;
}

const PostCard = React.memo(function PostCard({ post, onLike, onComment, onPress }: PostCardProps) {
  const community = post.community ?? post.communityId;
  const badgeColor = useMemo(() => communityColor(community), [community]);
  const timeAgo = useMemo(
    () => (post.createdAt ? formatDistanceToNow(new Date(post.createdAt)) : ''),
    [post.createdAt],
  );

  // Like button spring animation
  const likeScale = useRef(new Animated.Value(1)).current;

  function handleLike() {
    if (!onLike) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.spring(likeScale, {
        toValue: 1.35,
        useNativeDriver: true,
        speed: 40,
        bounciness: 12,
      }),
      Animated.spring(likeScale, {
        toValue: 1.0,
        useNativeDriver: true,
        speed: 20,
        bounciness: 6,
      }),
    ]).start();
    onLike();
  }

  function handleComment() {
    if (!onComment) return;
    Haptics.selectionAsync();
    onComment();
  }

  return (
    <Pressable
      onPress={() => {
        if (onPress) {
          Haptics.selectionAsync();
          onPress();
        }
      }}
      style={({ pressed }) => ({
        backgroundColor: colors.card,
        borderRadius: 16,
        marginHorizontal: 16,
        marginBottom: 12,
        borderColor: colors.border,
        borderWidth: 1,
        overflow: 'hidden',
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
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 3,
              borderRadius: 12,
              backgroundColor: `${badgeColor}22`,
            }}
          >
            <Text style={{ color: badgeColor, fontSize: 11, fontWeight: '600' }}>
              {community.charAt(0).toUpperCase() + community.slice(1)}
            </Text>
          </View>
        )}
      </View>

      {/* Content */}
      {post.content ? (
        <Text
          style={{
            color: '#E5E7EB',
            fontSize: 15,
            fontWeight: '400',
            lineHeight: 22,
            paddingHorizontal: 16,
            paddingBottom: 14,
          }}
        >
          {post.content}
        </Text>
      ) : null}

      {/* Media — fixed dimensions prevent layout thrashing; bg color is a placeholder */}
      {post.mediaUrl ? (
        <View style={{ width: '100%', height: 200, backgroundColor: '#1a1a1a' }}>
          <Image
            source={{ uri: post.mediaUrl }}
            style={{ width: '100%', height: 200 }}
            resizeMode="cover"
          />
        </View>
      ) : null}

      {/* Actions */}
      <View
        style={{
          flexDirection: 'row',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          gap: 20,
        }}
      >
        {/* Like button with spring animation */}
        <Pressable
          onPress={handleLike}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            transform: [{ scale: pressed ? 0.92 : 1 }],
          })}
        >
          <Animated.View style={{ transform: [{ scale: likeScale }] }}>
            <Ionicons
              name={post.isLiked ? 'heart' : 'heart-outline'}
              size={20}
              color={post.isLiked ? colors.pink : colors.muted}
            />
          </Animated.View>
          <Text style={{ color: colors.muted, fontSize: 13 }}>{post.likeCount ?? post.likesCount ?? 0}</Text>
        </Pressable>

        {/* Comment button */}
        <Pressable
          onPress={handleComment}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            transform: [{ scale: pressed ? 0.96 : 1 }],
          })}
        >
          <Ionicons name="chatbubble-outline" size={19} color={colors.muted} />
          <Text style={{ color: colors.muted, fontSize: 13 }}>{post.commentCount ?? post.commentsCount ?? 0}</Text>
        </Pressable>
      </View>
    </Pressable>
  );
});

export default PostCard;
