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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import BrandGradient from '../../components/BrandGradient';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../../lib/trpc';
import { colors } from '../../lib/colors';
import { useAuth } from '../../lib/auth';

export default function AdminAnnouncementsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: '',
    content: '',
    isPinned: false,
    dismissible: true,
  });

  const { data: meData } = trpc.auth.me.useQuery(undefined, { staleTime: 60_000 });
  const isAdmin = user?.role === 'admin' || (meData as any)?.role === 'admin';

  const { data, isLoading } = trpc.announcements.list.useQuery(
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

  function handleCreate() {
    if (!form.title.trim()) { Alert.alert('Error', 'Title is required'); return; }
    if (!form.content.trim()) { Alert.alert('Error', 'Content is required'); return; }
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
      { text: 'Deactivate', style: 'destructive', onPress: () => deactivateMutation.mutate({ id }) },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomColor: colors.border, borderBottomWidth: 1 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 14 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800', flex: 1 }}>Announcements</Text>
        <TouchableOpacity
          onPress={() => setShowCreate(true)}
          style={{ backgroundColor: `${colors.pink}22`, borderRadius: 20, padding: 8, borderColor: `${colors.pink}44`, borderWidth: 1 }}
        >
          <Ionicons name="add" size={22} color={colors.pink} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={colors.pink} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
          {announcements.length === 0 && (
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Ionicons name="megaphone-outline" size={48} color={colors.muted} />
              <Text style={{ color: colors.muted, marginTop: 12, fontSize: 15 }}>No announcements yet</Text>
            </View>
          )}
          {announcements.map((ann: any) => {
            const isActive = ann.isActive !== false;
            return (
              <View
                key={ann.id}
                style={{
                  backgroundColor: colors.card,
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
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      {ann.isPinned && (
                        <Ionicons name="pin" size={14} color={colors.pink} />
                      )}
                      <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>{ann.title}</Text>
                    </View>
                    <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 18 }}>{ann.content}</Text>
                  </View>
                  <View style={{ gap: 4, alignItems: 'flex-end' }}>
                    <View style={{
                      backgroundColor: isActive ? '#10B98122' : '#6B728022',
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 12,
                    }}>
                      <Text style={{ color: isActive ? '#10B981' : '#6B7280', fontSize: 11, fontWeight: '700' }}>
                        {isActive ? 'ACTIVE' : 'INACTIVE'}
                      </Text>
                    </View>
                    {!ann.dismissible && (
                      <View style={{ backgroundColor: '#F59E0B22', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 }}>
                        <Text style={{ color: '#F59E0B', fontSize: 11, fontWeight: '700' }}>STICKY</Text>
                      </View>
                    )}
                  </View>
                </View>

                {ann.publishedAt && (
                  <Text style={{ color: colors.muted, fontSize: 11, marginBottom: 12 }}>
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
                    <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 14 }}>Deactivate</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Create Modal */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomColor: colors.border, borderBottomWidth: 1 }}>
              <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800', flex: 1 }}>New Announcement</Text>
              <TouchableOpacity onPress={() => setShowCreate(false)}>
                <Ionicons name="close" size={24} color={colors.muted} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
              <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase' }}>Title *</Text>
              <TextInput
                value={form.title}
                onChangeText={(v) => setForm(f => ({ ...f, title: v }))}
                placeholder="Announcement title"
                placeholderTextColor={colors.muted}
                style={{ backgroundColor: colors.card, color: colors.text, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, borderColor: colors.border, borderWidth: 1, fontSize: 15, marginBottom: 16 }}
              />

              <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase' }}>Content *</Text>
              <TextInput
                value={form.content}
                onChangeText={(v) => setForm(f => ({ ...f, content: v }))}
                placeholder="Announcement message"
                placeholderTextColor={colors.muted}
                multiline
                style={{ backgroundColor: colors.card, color: colors.text, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, borderColor: colors.border, borderWidth: 1, fontSize: 15, minHeight: 100, textAlignVertical: 'top', marginBottom: 24 }}
              />

              {/* Toggles */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, backgroundColor: colors.card, padding: 14, borderRadius: 12, borderColor: colors.border, borderWidth: 1 }}>
                <View>
                  <Text style={{ color: colors.text, fontWeight: '600', fontSize: 15 }}>Pin Announcement</Text>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>Show at top of announcements</Text>
                </View>
                <Switch
                  value={form.isPinned}
                  onValueChange={(v) => setForm(f => ({ ...f, isPinned: v }))}
                  trackColor={{ false: colors.border, true: `${colors.pink}88` }}
                  thumbColor={form.isPinned ? colors.pink : colors.muted}
                />
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, backgroundColor: colors.card, padding: 14, borderRadius: 12, borderColor: colors.border, borderWidth: 1 }}>
                <View>
                  <Text style={{ color: colors.text, fontWeight: '600', fontSize: 15 }}>Dismissible</Text>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>Users can dismiss this banner</Text>
                </View>
                <Switch
                  value={form.dismissible}
                  onValueChange={(v) => setForm(f => ({ ...f, dismissible: v }))}
                  trackColor={{ false: colors.border, true: `${colors.pink}88` }}
                  thumbColor={form.dismissible ? colors.pink : colors.muted}
                />
              </View>

              <TouchableOpacity onPress={handleCreate} disabled={createMutation.isPending} activeOpacity={0.85}>
                <BrandGradient
                  style={{ borderRadius: 14, paddingVertical: 16, alignItems: 'center', opacity: createMutation.isPending ? 0.7 : 1 }}
                >
                  {createMutation.isPending ? <ActivityIndicator color="#fff" /> : (
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Publish Announcement</Text>
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
