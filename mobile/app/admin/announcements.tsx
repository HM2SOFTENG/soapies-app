import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import BrandGradient from '../../components/BrandGradient';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../../lib/trpc';
import { colors } from '../../lib/colors';
import { useTheme } from '../../lib/theme';
import AdminAccessGate from '../../components/AdminAccessGate';
import { useAdminAccess } from '../../lib/useAdminAccess';

export default function AdminAnnouncementsScreen() {
  const router = useRouter();
  const { isAdmin, isCheckingAdmin } = useAdminAccess();
  const theme = useTheme();
  const utils = trpc.useUtils();

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: '',
    content: '',
    isPinned: false,
    dismissible: true,
  });

  const { data, isLoading, isError, error, refetch } = trpc.announcements.list.useQuery(
    {},
    { enabled: isAdmin }
  );
  const announcements = (data as any[]) ?? [];

  const createMutation = trpc.announcements.create.useMutation({
    onSuccess: () => {
      utils.announcements.list.invalidate();
      setShowCreate(false);
      setForm({ title: '', content: '', isPinned: false, dismissible: true });
      Alert.alert('✅ Created', 'Announcement published successfully.');
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const deactivateMutation = trpc.announcements.deactivate.useMutation({
    onSuccess: () => utils.announcements.list.invalidate(),
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  if (isCheckingAdmin) return <AdminAccessGate mode="loading" />;
  if (!isAdmin) return <AdminAccessGate mode="denied" onBack={() => router.back()} />;

  function handleCreate() {
    if (!form.title.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }
    if (!form.content.trim()) {
      Alert.alert('Error', 'Content is required');
      return;
    }
    createMutation.mutate({
      title: form.title,
      content: form.content,
      isPinned: form.isPinned,
      dismissible: form.dismissible,
      isActive: true,
    });
  }

  function handleDeactivate(id: number, title: string) {
    Alert.alert('Deactivate Announcement', `Deactivate "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Deactivate',
        style: 'destructive',
        onPress: () => deactivateMutation.mutate({ id }),
      },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingVertical: 14,
          borderBottomColor: theme.colors.border,
          borderBottomWidth: 1,
          backgroundColor: theme.colors.pageHeader,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 14 }}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: '800', flex: 1 }}>
          Announcements
        </Text>
        <TouchableOpacity
          onPress={() => setShowCreate(true)}
          style={{
            backgroundColor: `${colors.pink}22`,
            borderRadius: 20,
            padding: 8,
            borderColor: `${colors.pink}44`,
            borderWidth: 1,
          }}
        >
          <Ionicons name="add" size={22} color={colors.pink} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={colors.pink} size="large" />
        </View>
      ) : isError ? (
        <View
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 }}
        >
          <Ionicons name="cloud-offline-outline" size={42} color={theme.colors.textMuted} />
          <Text
            style={{
              color: theme.colors.text,
              fontSize: 20,
              fontWeight: '800',
              textAlign: 'center',
              marginTop: 14,
            }}
          >
            Could not load announcements
          </Text>
          <Text
            style={{
              color: theme.colors.textMuted,
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
              backgroundColor: theme.colors.surface,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            <Text style={{ color: theme.colors.text, fontWeight: '800' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
          {announcements.length === 0 && (
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Ionicons name="megaphone-outline" size={48} color={theme.colors.textMuted} />
              <Text style={{ color: theme.colors.textMuted, marginTop: 12, fontSize: 15 }}>
                No announcements yet
              </Text>
            </View>
          )}
          {announcements.map((ann: any) => {
            const isActive = ann.isActive !== false;
            return (
              <View
                key={ann.id}
                style={{
                  backgroundColor: theme.colors.surface,
                  borderRadius: 14,
                  padding: 16,
                  marginBottom: 12,
                  borderColor: isActive ? `${colors.pink}44` : colors.border,
                  borderWidth: 1,
                  opacity: isActive ? 1 : 0.6,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }}>
                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 4,
                      }}
                    >
                      {ann.isPinned && <Ionicons name="pin" size={14} color={colors.pink} />}
                      <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 15 }}>
                        {ann.title}
                      </Text>
                    </View>
                    <Text style={{ color: theme.colors.textMuted, fontSize: 13, lineHeight: 18 }}>
                      {ann.content}
                    </Text>
                  </View>
                  <View style={{ gap: 4, alignItems: 'flex-end' }}>
                    <View
                      style={{
                        backgroundColor: isActive ? '#10B98122' : '#6B728022',
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 12,
                      }}
                    >
                      <Text
                        style={{
                          color: isActive ? '#10B981' : '#6B7280',
                          fontSize: 11,
                          fontWeight: '700',
                        }}
                      >
                        {isActive ? 'ACTIVE' : 'INACTIVE'}
                      </Text>
                    </View>
                    {!ann.dismissible && (
                      <View
                        style={{
                          backgroundColor: '#F59E0B22',
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 12,
                        }}
                      >
                        <Text style={{ color: '#F59E0B', fontSize: 11, fontWeight: '700' }}>
                          STICKY
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {ann.publishedAt && (
                  <Text style={{ color: theme.colors.textMuted, fontSize: 11, marginBottom: 12 }}>
                    Published: {new Date(ann.publishedAt).toLocaleDateString()}
                  </Text>
                )}

                {isActive && (
                  <TouchableOpacity
                    onPress={() => handleDeactivate(ann.id, ann.title)}
                    disabled={deactivateMutation.isPending}
                    style={{
                      borderRadius: 10,
                      paddingVertical: 10,
                      alignItems: 'center',
                      backgroundColor: '#EF444422',
                      borderColor: '#EF444444',
                      borderWidth: 1,
                    }}
                  >
                    <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 14 }}>
                      Deactivate
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Create Modal */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 20,
                paddingVertical: 14,
                borderBottomColor: theme.colors.border,
                borderBottomWidth: 1,
                backgroundColor: theme.colors.pageHeader,
              }}
            >
              <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: '800', flex: 1 }}>
                New Announcement
              </Text>
              <TouchableOpacity onPress={() => setShowCreate(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
              <Text
                style={{
                  color: theme.colors.textMuted,
                  fontSize: 12,
                  fontWeight: '600',
                  marginBottom: 6,
                  textTransform: 'uppercase',
                }}
              >
                Title *
              </Text>
              <TextInput
                value={form.title}
                onChangeText={(v) => setForm((f) => ({ ...f, title: v }))}
                placeholder="Announcement title"
                placeholderTextColor={theme.colors.textMuted}
                style={{
                  backgroundColor: theme.colors.surface,
                  color: theme.colors.text,
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderColor: theme.colors.border,
                  borderWidth: 1,
                  fontSize: 15,
                  marginBottom: 16,
                }}
              />

              <Text
                style={{
                  color: theme.colors.textMuted,
                  fontSize: 12,
                  fontWeight: '600',
                  marginBottom: 6,
                  textTransform: 'uppercase',
                }}
              >
                Content *
              </Text>
              <TextInput
                value={form.content}
                onChangeText={(v) => setForm((f) => ({ ...f, content: v }))}
                placeholder="Announcement message"
                placeholderTextColor={theme.colors.textMuted}
                multiline
                style={{
                  backgroundColor: theme.colors.surface,
                  color: theme.colors.text,
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderColor: theme.colors.border,
                  borderWidth: 1,
                  fontSize: 15,
                  minHeight: 100,
                  textAlignVertical: 'top',
                  marginBottom: 24,
                }}
              />

              {/* Toggles */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 16,
                  backgroundColor: colors.card,
                  padding: 14,
                  borderRadius: 12,
                  borderColor: colors.border,
                  borderWidth: 1,
                }}
              >
                <View>
                  <Text style={{ color: colors.text, fontWeight: '600', fontSize: 15 }}>
                    Pin Announcement
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>
                    Show at top of announcements
                  </Text>
                </View>
                <Switch
                  value={form.isPinned}
                  onValueChange={(v) => setForm((f) => ({ ...f, isPinned: v }))}
                  trackColor={{ false: colors.border, true: `${colors.pink}88` }}
                  thumbColor={form.isPinned ? colors.pink : colors.muted}
                />
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 28,
                  backgroundColor: colors.card,
                  padding: 14,
                  borderRadius: 12,
                  borderColor: colors.border,
                  borderWidth: 1,
                }}
              >
                <View>
                  <Text style={{ color: colors.text, fontWeight: '600', fontSize: 15 }}>
                    Dismissible
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>
                    Users can dismiss this banner
                  </Text>
                </View>
                <Switch
                  value={form.dismissible}
                  onValueChange={(v) => setForm((f) => ({ ...f, dismissible: v }))}
                  trackColor={{ false: colors.border, true: `${colors.pink}88` }}
                  thumbColor={form.dismissible ? colors.pink : colors.muted}
                />
              </View>

              <TouchableOpacity
                onPress={handleCreate}
                disabled={createMutation.isPending}
                activeOpacity={0.85}
              >
                <BrandGradient
                  style={{
                    borderRadius: 14,
                    paddingVertical: 16,
                    alignItems: 'center',
                    opacity: createMutation.isPending ? 0.7 : 1,
                  }}
                >
                  {createMutation.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
                      Publish Announcement
                    </Text>
                  )}
                </BrandGradient>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
