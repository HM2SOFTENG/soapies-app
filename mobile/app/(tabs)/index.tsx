import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../../lib/trpc';
import { colors } from '../../lib/colors';
import PostCard from '../../components/PostCard';

export default function FeedScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [showComposer, setShowComposer] = useState(false);

  const { data, isLoading, refetch } = trpc.wall.list.useQuery(
    { limit: 20 },
    { refetchInterval: 30_000 },
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const posts = (data as any)?.posts ?? data ?? [];

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
          renderItem={({ item }) => <PostCard post={item} onRefresh={onRefresh} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.pink}
            />
          }
          contentContainerStyle={{ paddingBottom: 100 }}
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
    </SafeAreaView>
  );
}
