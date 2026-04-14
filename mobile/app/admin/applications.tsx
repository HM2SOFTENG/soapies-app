import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../../lib/trpc';
import { colors } from '../../lib/colors';
import { useAuth } from '../../lib/auth';

export default function AdminApplicationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const { data: meData } = trpc.auth.me.useQuery(undefined, { staleTime: 60_000 });
  const isAdmin = user?.role === 'admin' || (meData as any)?.role === 'admin';

  const { data, isLoading, refetch } = trpc.admin.pendingApplications.useQuery(
    undefined,
    { enabled: isAdmin }
  );
  const applications = (data as any[]) ?? [];

  const reviewMutation = trpc.admin.reviewApplication.useMutation({
    onSuccess: () => {
      utils.admin.pendingApplications.invalidate();
      utils.admin.stats.invalidate();
    },
    onError: (e) => Alert.alert('Error', e.message),
  });

  // Guard AFTER all hooks
  if (!isAdmin) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 16 }}>Access Denied</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ paddingVertical: 12, paddingHorizontal: 24, backgroundColor: colors.card, borderRadius: 12 }}>
          <Text style={{ color: colors.pink, fontWeight: '700' }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  function handleAction(profileId: number, displayName: string, action: 'approve' | 'reject') {
    const status = action === 'approve' ? 'approved' : 'rejected';
    Alert.alert(
      action === 'approve' ? 'Approve Application' : 'Reject Application',
      `${action === 'approve' ? 'Approve' : 'Reject'} application from ${displayName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action === 'approve' ? 'Approve' : 'Reject',
          style: action === 'reject' ? 'destructive' : 'default',
          onPress: () => reviewMutation.mutate({ profileId, status: status as 'approved' | 'rejected' | 'waitlisted' }),
        },
      ]
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomColor: colors.border, borderBottomWidth: 1 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 14 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800', flex: 1 }}>Pending Applications</Text>
        <View style={{ backgroundColor: `${colors.pink}22`, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
          <Text style={{ color: colors.pink, fontWeight: '700', fontSize: 13 }}>{applications.length}</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={colors.pink} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
          {applications.length === 0 && (
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Ionicons name="checkmark-circle-outline" size={48} color="#10B981" />
              <Text style={{ color: colors.muted, marginTop: 12, fontSize: 15 }}>No pending applications</Text>
            </View>
          )}
          {applications.map((app: any) => {
            const displayName = app.displayName ?? app.name ?? 'Unknown';
            const email = app.email ?? app.user?.email ?? '';
            const photos = app.photos ?? app.applicationPhotos ?? [];
            const status = app.applicationStatus ?? app.status ?? 'pending';

            return (
              <View
                key={app.id ?? app.profileId}
                style={{
                  backgroundColor: colors.card,
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 14,
                  borderColor: colors.border,
                  borderWidth: 1,
                }}
              >
                {/* Top stripe */}
                <LinearGradient
                  colors={[colors.pink, colors.purple]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ height: 3, marginHorizontal: -16, marginTop: -16, marginBottom: 14, borderTopLeftRadius: 16, borderTopRightRadius: 16 }}
                />

                <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: '700', fontSize: 17, marginBottom: 4 }}>{displayName}</Text>
                    {email ? <Text style={{ color: colors.muted, fontSize: 13 }}>{email}</Text> : null}
                  </View>
                  <View style={{
                    backgroundColor: '#F59E0B22',
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 20,
                    borderColor: '#F59E0B44',
                    borderWidth: 1,
                  }}>
                    <Text style={{ color: '#F59E0B', fontSize: 11, fontWeight: '700', textTransform: 'capitalize' }}>
                      {status}
                    </Text>
                  </View>
                </View>

                {/* Photos row */}
                {photos.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                    {photos.slice(0, 5).map((photo: any, idx: number) => (
                      <Image
                        key={idx}
                        source={{ uri: photo.url ?? photo.photoUrl ?? photo }}
                        style={{ width: 72, height: 72, borderRadius: 10, marginRight: 8 }}
                        resizeMode="cover"
                      />
                    ))}
                  </ScrollView>
                )}

                {/* Action buttons */}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    onPress={() => handleAction(app.id ?? app.profileId, displayName, 'approve')}
                    disabled={reviewMutation.isPending}
                    style={{ flex: 1, borderRadius: 10, overflow: 'hidden' }}
                  >
                    <LinearGradient
                      colors={['#10B981', '#059669']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{ paddingVertical: 12, alignItems: 'center', opacity: reviewMutation.isPending ? 0.7 : 1 }}
                    >
                      {reviewMutation.isPending ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>✓ Approve</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleAction(app.id ?? app.profileId, displayName, 'reject')}
                    disabled={reviewMutation.isPending}
                    style={{
                      flex: 1,
                      borderRadius: 10,
                      paddingVertical: 12,
                      alignItems: 'center',
                      backgroundColor: '#EF444422',
                      borderColor: '#EF444444',
                      borderWidth: 1,
                    }}
                  >
                    <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 14 }}>✕ Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
