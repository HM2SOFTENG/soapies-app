import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from './Avatar';
import { colors } from '../lib/colors';
import { formatDistanceToNow, communityColor } from '../lib/utils';

export interface PostCardPost {
  id: string | number;
  authorName?: string | null;
  authorInitials?: string | null;
  content?: string | null;
  mediaUrl?: string | null;
  likeCount?: number | null;
  commentCount?: number | null;
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

export default function PostCard({ post, onLike, onComment, onPress }: PostCardProps) {
  const community = post.community ?? post.communityId;
  const badgeColor = communityColor(community);
  const timeAgo = post.createdAt ? formatDistanceToNow(new Date(post.createdAt)) : '';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.92}
      style={{
        backgroundColor: colors.card,
        borderRadius: 16,
        marginHorizontal: 16,
        marginBottom: 12,
        borderColor: colors.border,
        borderWidth: 1,
        overflow: 'hidden',
      }}
    >
      {/* Author row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14 }}>
        <Avatar name={post.authorName} size="sm" />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>
            {post.authorName ?? 'Member'}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>{timeAgo}</Text>
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
            <Text style={{ color: badgeColor, fontSize: 11, fontWeight: '700' }}>
              {community.charAt(0).toUpperCase() + community.slice(1)}
            </Text>
          </View>
        )}
      </View>

      {/* Content */}
      {post.content ? (
        <Text style={{ color: colors.text, fontSize: 15, lineHeight: 22, paddingHorizontal: 14, paddingBottom: 12 }}>
          {post.content}
        </Text>
      ) : null}

      {/* Media */}
      {post.mediaUrl ? (
        <Image
          source={{ uri: post.mediaUrl }}
          style={{ width: '100%', height: 200 }}
          resizeMode="cover"
        />
      ) : null}

      {/* Actions */}
      <View
        style={{
          flexDirection: 'row',
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          gap: 20,
        }}
      >
        <TouchableOpacity onPress={onLike} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons
            name={post.isLiked ? 'heart' : 'heart-outline'}
            size={20}
            color={post.isLiked ? colors.pink : colors.muted}
          />
          <Text style={{ color: colors.muted, fontSize: 13 }}>{post.likeCount ?? 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onComment} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="chatbubble-outline" size={19} color={colors.muted} />
          <Text style={{ color: colors.muted, fontSize: 13 }}>{post.commentCount ?? 0}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}
