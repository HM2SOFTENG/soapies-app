import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../../lib/trpc';
import { colors } from '../../lib/colors';
import PostCard from '../../components/PostCard';

const COMMUNITIES = [
  { id: 'soapies', label: 'Soapies' },
  { id: 'groupus', label: 'Groupus' },
  { id: 'gaypeez', label: 'Gaypeez' },
];

export default function FeedScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [selectedCommunity, setSelectedCommunity] = useState('soapies');

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data, isLoading, refetch } = trpc.wall.posts.useQuery(
    { limit: 40 },
    { refetchInterval: 30_000 },
  );
  const myLikes = trpc.wall.myLikes.useQuery();

  const likeMutation = trpc.wall.like.useMutation({
    onSuccess: () => { refetch(); myLikes.refetch(); },
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

  const likedPostIds = new Set<number>(
    (myLikes.data as number[] | undefined) ?? [],
  );

  const rawPosts = (data as any[]) ?? [];
  const posts = rawPosts.map((p: any) => ({
    ...p,
    isLiked: likedPostIds.has(p.id),
  }));

  // ── Composer ──────────────────────────────────────────────────────────────
  function submitPost() {
    if (!postContent.trim()) return;
    createPost.mutate({
      content: postContent.trim(),
      communityId: selectedCommunity,
      visibility: 'members',
    });
  }

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
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800', flex: 1 }}>
          Feed
        </Text>
        <TouchableOpacity onPress={() => setShowComposer(true)}>
          <Ionicons name="create-outline" size={24} color={colors.pink} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={colors.pink} size="large" />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item: any) => String(item.id)}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              onLike={() => likeMutation.mutate({ postId: item.id })}
              onComment={() => {/* TODO: open comments sheet */}}
              onPress={() => {/* TODO: post detail */}}
              onRefresh={onRefresh}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.pink}
            />
          }
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', paddingTop: 80 }}>
              <Ionicons name="sparkles-outline" size={48} color={colors.border} />
              <Text style={{ color: colors.muted, marginTop: 12, fontSize: 16 }}>
                Nothing here yet
              </Text>
              <Text style={{ color: colors.border, marginTop: 4, fontSize: 14 }}>
                Be the first to post!
              </Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        onPress={() => setShowComposer(true)}
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          borderRadius: 30,
          overflow: 'hidden',
          shadowColor: colors.pink,
          shadowOpacity: 0.5,
          shadowRadius: 12,
          elevation: 8,
        }}
      >
        <LinearGradient
          colors={[colors.pink, colors.purple]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: 56, height: 56, justifyContent: 'center', alignItems: 'center' }}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Post Composer Modal */}
      <Modal visible={showComposer} animationType="slide" transparent>
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
                padding: 20,
                paddingBottom: 40,
                borderColor: colors.border,
                borderTopWidth: 1,
              }}
            >
              {/* Modal header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', flex: 1 }}>
                  New Post
                </Text>
                <TouchableOpacity onPress={() => { setShowComposer(false); setPostContent(''); }}>
                  <Ionicons name="close" size={24} color={colors.muted} />
                </TouchableOpacity>
              </View>

              {/* Community selector */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {COMMUNITIES.map(c => (
                    <TouchableOpacity
                      key={c.id}
                      onPress={() => setSelectedCommunity(c.id)}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 7,
                        borderRadius: 20,
                        backgroundColor: selectedCommunity === c.id ? colors.pink : colors.card,
                        borderColor: selectedCommunity === c.id ? colors.pink : colors.border,
                        borderWidth: 1,
                      }}
                    >
                      <Text style={{ color: selectedCommunity === c.id ? '#fff' : colors.muted, fontWeight: '600', fontSize: 13 }}>
                        {c.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Text input */}
              <TextInput
                value={postContent}
                onChangeText={setPostContent}
                placeholder="What's on your mind?"
                placeholderTextColor={colors.muted}
                multiline
                maxLength={1000}
                style={{
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: 12,
                  padding: 14,
                  color: colors.text,
                  fontSize: 15,
                  minHeight: 120,
                  textAlignVertical: 'top',
                  marginBottom: 16,
                }}
              />

              {/* Submit */}
              <TouchableOpacity
                onPress={submitPost}
                disabled={!postContent.trim() || createPost.isPending}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[colors.pink, colors.purple]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    borderRadius: 14,
                    paddingVertical: 14,
                    alignItems: 'center',
                    opacity: !postContent.trim() || createPost.isPending ? 0.5 : 1,
                  }}
                >
                  {createPost.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Post</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
