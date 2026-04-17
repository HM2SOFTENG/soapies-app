import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
  Dimensions,
  Share,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { LinearGradient } from 'expo-linear-gradient';
import BrandGradient from '../../components/BrandGradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { trpc } from '../../lib/trpc';
import { useAuth } from '../../lib/auth';
import { colors } from '../../lib/colors';
import { uploadPhoto } from '../../lib/uploadPhoto';
import PostCard from '../../components/PostCard';
import Avatar from '../../components/Avatar';
import { useToast } from '../../components/Toast';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Role config ───────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  admin:   { label: 'Admin',   color: '#fff',    bg: '#6366F1' },
  angel:   { label: 'Angel',   color: '#EC4899', bg: '#EC489922' },
  member:  { label: 'Member',  color: '#A855F7', bg: '#A855F722' },
  pending: { label: 'Pending', color: '#9CA3AF', bg: '#1A1A2E' },
};

function getGreeting(name: string) {
  const h = new Date().getHours();
  const emoji = h < 12 ? '☀️' : h < 17 ? '👋' : h < 21 ? '🌆' : '🌙';
  const word  = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 21 ? 'Good evening' : 'Good night';
  return { greeting: `${word}, ${name?.split(' ')[0] ?? 'there'}`, emoji };
}

// ── Animated Gradient Header ──────────────────────────────────────────────────

function AnimatedHeader({ me, profile }: { me: any; profile: any }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const headerY = useRef(new Animated.Value(24)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(headerY,       { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();
    const glow = Animated.loop(Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1, duration: 3000, useNativeDriver: false }),
      Animated.timing(glowAnim, { toValue: 0, duration: 3000, useNativeDriver: false }),
    ]));
    glow.start();
    return () => glow.stop();
  }, []);

  const displayName = profile?.displayName ?? me?.name ?? 'there';
  const { greeting, emoji } = getGreeting(displayName);
  const role = (me?.role ?? profile?.role ?? 'member') as string;
  const roleConfig = ROLE_CONFIG[role] ?? ROLE_CONFIG.member;
  const memberSince = new Date(me?.createdAt ?? profile?.createdAt ?? Date.now()).getFullYear();
  const { data: creditBalance, isLoading: creditsLoading } = trpc.credits.balance.useQuery(undefined, { staleTime: 60_000 });
  const { data: myReservationsData, isLoading: reservationsLoading } = trpc.reservations.myReservations.useQuery(undefined, { staleTime: 60_000 });
  const creditsRaw = typeof creditBalance === 'number' ? creditBalance : ((creditBalance as any)?.balance ?? 0);
  const credits = `$${Number(creditsRaw).toFixed(2)}`;
  const attended = ((myReservationsData as any[]) ?? []).filter((r: any) => r.status !== 'cancelled').length;
  const avatarGlowColor = glowAnim.interpolate({ inputRange: [0, 1], outputRange: ['#A855F740', '#EC489960'] });

  return (
    <LinearGradient
      colors={['#1A082E', '#12051E', '#080810']}
      start={{ x: 0, y: 0 }} end={{ x: 0.5, y: 1 }}
      style={{ paddingHorizontal: 20, paddingTop: insets.top + 18, paddingBottom: 28 }}
    >
      <Animated.View style={{ position: 'absolute', top: insets.top, right: -20, width: 140, height: 140, borderRadius: 70, backgroundColor: avatarGlowColor as any }} />
      <Animated.View style={{ opacity: headerOpacity, transform: [{ translateY: headerY }] }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
          <View style={{ flex: 1, paddingRight: 14 }}>
            <Text style={{ color: '#F1F0FF', fontSize: 30, fontWeight: '900', lineHeight: 36, letterSpacing: -0.5 }}>
              {greeting} {emoji}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8, flexWrap: 'wrap' }}>
              <View style={{ backgroundColor: roleConfig.bg, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: `${roleConfig.color}44` }}>
                <Text style={{ color: roleConfig.color, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>{roleConfig.label}</Text>
              </View>
              <Text style={{ color: '#5A5575', fontSize: 12, fontWeight: '600' }}>Soapies</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => { Haptics.selectionAsync(); try { (router as any).push('/(tabs)/profile'); } catch (_) {} }}
            style={{ width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: '#EC489960', overflow: 'hidden', shadowColor: '#EC4899', shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } }}
          >
            <Avatar name={profile?.displayName ?? 'Me'} url={profile?.avatarUrl} size={48} />
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
          <StatChip icon="calendar" value={reservationsLoading ? '—' : String(attended)} label="Events"   color="#EC4899" />
          <TouchableOpacity onPress={() => (router as any).push('/(tabs)/events')} activeOpacity={0.85} style={{ flex: 1 }}>
            <StatChip icon="gift"     value={creditsLoading ? '—'    : credits}          label="Credits"  color="#A855F7" />
          </TouchableOpacity>
          <StatChip icon="star"       value={String(memberSince)}                         label="Since"    color="#F59E0B" />
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

function StatChip({ icon, value, label, color = '#EC4899' }: { icon: any; value: string; label: string; color?: string; loading?: boolean }) {
  return (
    <View style={{ flex: 1, backgroundColor: `${color}12`, borderRadius: 14, borderColor: `${color}30`, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 10, alignItems: 'flex-start' }}>
      <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: `${color}25`, alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
        <Ionicons name={icon} size={15} color={color} />
      </View>
      <Text style={{ color: '#F1F0FF', fontSize: 16, fontWeight: '800', lineHeight: 18 }}>{value}</Text>
      <Text style={{ color: '#5A5575', fontSize: 10, fontWeight: '600', letterSpacing: 0.4, marginTop: 1 }}>{label}</Text>
    </View>
  );
}

// ── Quick Actions (2×2 grid) ──────────────────────────────────────────────────

const ACTIONS = [
  { icon: 'calendar'        as const, label: 'Events',     color: '#EC4899', route: '/(tabs)/events' },
  { icon: 'ticket-outline'  as const, label: 'My Tickets', color: '#A855F7', route: '/tickets' },
  { icon: 'people'          as const, label: 'Members',    color: '#6366F1', route: '/members' },
  { icon: 'radio-button-on' as const, label: 'Pulse 💗',   color: '#10B981', route: '/(tabs)/pulse' },
];

function QuickActionGrid() {
  const router = useRouter();
  const scales = useRef(ACTIONS.map(() => new Animated.Value(1))).current;

  function onPressIn(i: number) {
    Animated.spring(scales[i], { toValue: 0.92, useNativeDriver: true, speed: 40 }).start();
  }
  function onPressOut(i: number) {
    Animated.spring(scales[i], { toValue: 1, useNativeDriver: true, speed: 20 }).start();
  }
  function onPress(item: typeof ACTIONS[number]) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try { (router as any).push(item.route as any); } catch (_) {}
  }

  const rows: (typeof ACTIONS)[] = [];
  for (let i = 0; i < ACTIONS.length; i += 2) {
    rows.push(ACTIONS.slice(i, i + 2));
  }

  return (
    <View style={{ marginHorizontal: 16, marginBottom: 4 }}>
      {rows.map((row, ri) => (
        <View key={ri} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
          {row.map((item, ci) => {
            const idx = ri * 2 + ci;
            return (
              <Animated.View key={item.label} style={{ transform: [{ scale: scales[idx] }], flex: 1, marginHorizontal: 4 }}>
                <TouchableOpacity
                  activeOpacity={1}
                  onPressIn={() => onPressIn(idx)}
                  onPressOut={() => onPressOut(idx)}
                  onPress={() => onPress(item)}
                  style={{
                    backgroundColor: '#10101C',
                    borderRadius: 18,
                    borderColor: `${item.color}22`,
                    borderWidth: 1,
                    paddingVertical: 22,
                    alignItems: 'center',
                    gap: 10,
                    shadowColor: item.color,
                    shadowOpacity: 0.10,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 3 },
                  }}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: `${item.color}22`,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Ionicons name={item.icon} size={22} color={item.color} />
                  </View>
                  <Text style={{ color: '#F1F0FF', fontSize: 13, fontWeight: '800', textAlign: 'center' }}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ── Announcement Banner ───────────────────────────────────────────────────────

function AnnouncementCard({ announcement, onDismiss }: { announcement: any; onDismiss: (id: number) => void }) {
  const slideIn = useRef(new Animated.Value(-20)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideIn, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={{ opacity, transform: [{ translateY: slideIn }], minWidth: SCREEN_WIDTH * 0.78 }}>
      <View style={{ backgroundColor: '#10101C', borderRadius: 16, borderWidth: 1, borderColor: '#EC489930', marginRight: 10, overflow: 'hidden', flexDirection: 'row' }}>
        <LinearGradient colors={['#EC4899', '#A855F7']} style={{ width: 3 }} />
        <View style={{ flex: 1, padding: 14, flexDirection: 'row', alignItems: 'flex-start' }}>
          <Ionicons name="megaphone" size={16} color="#EC4899" style={{ marginTop: 1, marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#F1F0FF', fontWeight: '800', fontSize: 13, marginBottom: 3 }}>{announcement.title}</Text>
            <Text style={{ color: '#A09CB8', fontSize: 12, lineHeight: 17 }} numberOfLines={3}>{announcement.content}</Text>
          </View>
          {announcement.dismissible !== false && (
            <TouchableOpacity onPress={() => onDismiss(announcement.id)} style={{ marginLeft: 8, padding: 2 }}>
              <Ionicons name="close" size={16} color="#5A5575" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

function AnnouncementSection({
  announcements,
  onDismiss,
}: {
  announcements: any[];
  onDismiss: (id: number) => void;
}) {
  if (!announcements.length) return null;

  if (announcements.length === 1) {
    return (
      <View style={{ marginHorizontal: 16, marginBottom: 14 }}>
        <AnnouncementCard announcement={announcements[0]} onDismiss={onDismiss} />
      </View>
    );
  }

  return (
    <View style={{ marginBottom: 14 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      >
        {announcements.map((a: any) => (
          <AnnouncementCard key={a.id} announcement={a} onDismiss={onDismiss} />
        ))}
      </ScrollView>
    </View>
  );
}

// ── Upcoming Event Teaser ─────────────────────────────────────────────────────

function EventTeaser({ event }: { event: any }) {
  const router = useRouter();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.02, duration: 1400, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1,    duration: 1400, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);
  if (!event) return null;
  const diff = new Date(event.startDate).getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  const label = days <= 0 ? '🔥 Tonight!' : days === 1 ? '🎉 Tomorrow' : `📅 In ${days} days`;
  return (
    <Animated.View style={{ transform: [{ scale: pulseAnim }], marginHorizontal: 16, marginBottom: 14 }}>
      <TouchableOpacity onPress={() => { Haptics.selectionAsync(); try { (router as any).push('/(tabs)/events'); } catch (_) {} }} activeOpacity={0.9}>
        <LinearGradient
          colors={['#1A0830', '#EC489915', '#A855F710']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ borderRadius: 18, borderColor: '#EC489940', borderWidth: 1, padding: 16, flexDirection: 'row', alignItems: 'center' }}
        >
          <LinearGradient colors={['#EC4899', '#A855F7']} style={{ width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 14 }}>
            <Ionicons name="calendar" size={24} color="#fff" />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#EC4899', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>Next Event</Text>
            <Text style={{ color: '#F1F0FF', fontSize: 15, fontWeight: '800', letterSpacing: -0.2 }} numberOfLines={1}>{event.title}</Text>
            <Text style={{ color: '#A855F7', fontSize: 12, fontWeight: '700', marginTop: 2 }}>{label}</Text>
          </View>
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#EC489920', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="chevron-forward" size={16} color="#EC4899" />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Post Skeleton ─────────────────────────────────────────────────────────────

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
        <View style={{ width: '80%', height: 12, borderRadius: 6, backgroundColor: colors.border }} />
        <View style={{ width: '60%', height: 12, borderRadius: 6, backgroundColor: colors.border }} />
      </View>
    </Animated.View>
  );
}

// ── Comments Sheet ────────────────────────────────────────────────────────────

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
    onSuccess: () => { setCommentText(''); refetchComments(); },
    onError: (err: any) => Alert.alert('Error', err.message),
  });

  const deletePost = trpc.wall.deletePost.useMutation({
    onSuccess: () => { onClose(); onRefreshFeed(); },
    onError: (err: any) => Alert.alert('Error', err.message),
  });

  const comments = (commentsData as any[]) ?? [];
  const isOwn = me?.id === postAuthorId;

  function submitComment() {
    if (!commentText.trim() || !postId) return;
    addComment.mutate({ postId, content: commentText.trim() });
  }

  function handleDeletePost() {
    if (!postId) return;
    Alert.alert('Delete Post', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deletePost.mutate({ postId }) },
    ]);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
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

            <ScrollView style={{ maxHeight: 320 }} contentContainerStyle={{ padding: 16, gap: 12 }}>
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
                        {(c.resolvedAuthorName ?? c.authorName ?? c.author?.name ?? '?').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>
                          {c.resolvedAuthorName ?? c.authorName ?? c.author?.name ?? 'Member'}
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

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ title }: { title: string }) {
  return (
    <Text style={{ color: '#5A5575', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2, paddingHorizontal: 20, marginBottom: 10 }}>
      {title}
    </Text>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [refreshing, setRefreshing]         = useState(false);
  const [showComposer, setShowComposer]     = useState(false);
  const [composerText, setComposerText]     = useState('');
  const [composerMedia, setComposerMedia]   = useState<{ uri: string; type: 'image' | 'video' } | null>(null);
  const [composerLink, setComposerLink]     = useState('');
  const [showLinkInput, setShowLinkInput]   = useState(false);
  const [dismissedIds, setDismissedIds]     = useState<number[]>([]);
  const [isUploading, setIsUploading]       = useState(false);
  const [commentsPost, setCommentsPost]     = useState<{ id: number; authorId?: number } | null>(null);

  // ── Data ────────────────────────────────────────────────────────────────────
  const { hasToken } = useAuth();

  const { data: meData } = trpc.auth.me.useQuery(undefined, { staleTime: 0, enabled: hasToken });
  const me = meData as any;
  const currentUserId = me?.id as number | undefined;

  const { data: profileData } = trpc.profile.me.useQuery(undefined, { staleTime: 0, enabled: hasToken });
  const profile = profileData as any;

  const {
    data: postsData,
    isLoading,
    refetch: refetchPosts,
  } = trpc.wall.posts.useQuery(
    { limit: 50 }, // server auto-scopes to user's community
    { staleTime: 30_000, refetchOnWindowFocus: false, refetchInterval: 60_000, enabled: hasToken },
  );

  const { data: announcementsRaw } = trpc.announcements.active.useQuery(undefined, { staleTime: 60_000, enabled: hasToken });
  const dismissAnnouncement = trpc.announcements.dismiss.useMutation();

  const { data: eventsRaw } = trpc.events.list.useQuery({}, { staleTime: 120_000, enabled: hasToken }); // server auto-scopes to user's community

  const myLikes = trpc.wall.myLikes.useQuery(undefined, { staleTime: 30_000, refetchOnWindowFocus: false, enabled: hasToken });

  const utils = trpc.useUtils();

  const likeMutation = trpc.wall.like.useMutation({
    onSuccess: () => { refetchPosts(); myLikes.refetch(); },
    onError: (err: any) => Alert.alert('Could not like post', err.message),
  });

  const createPostMutation = trpc.wall.create.useMutation({
    onSuccess: () => {
      utils.wall.posts.invalidate();
      setComposerText('');
      setComposerMedia(null);
      setComposerLink('');
      setShowLinkInput(false);
      setShowComposer(false);
      toast.success('Post shared!');
    },
    onError: (err: any) => Alert.alert('Error', err.message),
  });

  const deletePostMutation = trpc.wall.deletePost.useMutation({
    onSuccess: () => {
      utils.wall.posts.invalidate();
      toast.success('Post deleted');
    },
    onError: (err: any) => Alert.alert('Error', err.message),
  });

  // ── Derived data ────────────────────────────────────────────────────────────
  const likedPostIds = useMemo(
    () => new Set<number>((myLikes.data as number[] | undefined) ?? []),
    [myLikes.data],
  );

  const allEvents = useMemo(() => {
    const raw = (eventsRaw as any)?.events ?? eventsRaw ?? [];
    return (raw as any[]) ?? [];
  }, [eventsRaw]);

  const nextEvent = useMemo(
    () => allEvents.find((e: any) => e.status === 'published' && new Date(e.startDate) >= new Date()) ?? null,
    [allEvents],
  );

  const announcements = useMemo(() => {
    const all = (announcementsRaw as any[]) ?? [];
    return all.filter((a: any) => !dismissedIds.includes(a.id));
  }, [announcementsRaw, dismissedIds]);

  const posts = useMemo(() => {
    const rawPosts = (postsData as any[]) ?? [];
    return rawPosts.map((p: any) => ({
      ...p,
      authorName:           p.resolvedAuthorName ?? p.authorName ?? p.profile?.displayName ?? 'Soapies Member',
      resolvedAuthorName:   p.resolvedAuthorName ?? p.authorName ?? p.profile?.displayName ?? 'Soapies Member',
      resolvedAvatarUrl:    p.avatarUrl          ?? p.profile?.avatarUrl   ?? null,
      likesCount:           p.likesCount         ?? p._count?.likes        ?? 0,
      commentsCount:        p.commentsCount      ?? p._count?.comments     ?? 0,
      isLiked:              likedPostIds.has(p.id),
    }));
  }, [postsData, likedPostIds]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchPosts();
    setRefreshing(false);
  }, [refetchPosts]);

  const handleLike    = useCallback((postId: number) => likeMutation.mutate({ postId }), [likeMutation]);
  const handleComment = useCallback((post: any) => setCommentsPost({ id: post.id, authorId: post.authorId }), []);

  function handleDismiss(id: number) {
    setDismissedIds((prev) => [...prev, id]);
    dismissAnnouncement.mutate({ announcementId: id });
  }

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
      aspect: [4, 3],
    });
    if (!result.canceled) {
      setComposerMedia({ uri: result.assets[0].uri, type: 'image' });
    }
  }

  async function openCamera() {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
      aspect: [4, 3],
    });
    if (!result.canceled) {
      setComposerMedia({ uri: result.assets[0].uri, type: 'image' });
    }
  }

  async function pickFile() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*', 'video/*'],
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets[0]) {
      await uploadAndAttach(result.assets[0].uri, result.assets[0].mimeType ?? 'application/octet-stream');
    }
  }

  async function uploadAndAttach(uri: string, mimeType: string) {
    setIsUploading(true);
    try {
      const url = await uploadPhoto(uri);
      setComposerMedia({ uri: url, type: 'image' });
    } catch (_e: any) {
      toast.error('Upload failed');
    } finally {
      setIsUploading(false);
    }
  }

  async function uploadMediaAndPost() {
    if (!composerText.trim() && !composerMedia && !composerLink) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    let mediaUrl: string | undefined;
    let mediaType: string | undefined;

    if (composerMedia) {
      setIsUploading(true);
      try {
        mediaUrl  = await uploadPhoto(composerMedia.uri);
        mediaType = 'image';
      } catch (_e: any) {
        setIsUploading(false);
        toast.error('Upload failed');
        return;
      } finally {
        setIsUploading(false);
      }
    }

    createPostMutation.mutate({
      content:    composerText.trim() || ' ',
      communityId: 'soapies',
      visibility: 'members',
      mediaUrl,
      mediaType,
      linkUrl:    composerLink || undefined,
    } as any);
  }

  async function handleShare(post: any) {
    try {
      await Share.share({
        message: `${post.content ?? ''}\n\n— Shared from Soapies Community`,
        title: 'Soapies Community Post',
      });
    } catch (_) {}
  }

  // ── List header (rendered above posts) ──────────────────────────────────────
  const ListHeader = useMemo(() => (
    <View>
      {/* ── Animated gradient header ── */}
      <AnimatedHeader me={me} profile={profile} />

      {/* ── Quick Actions ── */}
      <View style={{ paddingTop: 20, paddingBottom: 6, backgroundColor: '#080810' }}>
        <SectionLabel title="Quick Actions" />
        <QuickActionGrid />
      </View>

      {/* ── Upcoming Event ── */}
      {nextEvent && (
        <View style={{ marginBottom: 4 }}>
          <SectionLabel title="Upcoming" />
          <EventTeaser event={nextEvent} />
        </View>
      )}

      {/* ── Announcements ── */}
      {announcements.length > 0 && (
        <View style={{ marginBottom: 4 }}>
          <SectionLabel title="Announcements" />
          <AnnouncementSection announcements={announcements} onDismiss={handleDismiss} />
        </View>
      )}

    </View>
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [me, profile, nextEvent, announcements]);

  const FeedBar = (
    <View style={{ backgroundColor: '#080810', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 }}>
      <SectionLabel title="Community Feed" />
      <TouchableOpacity
        onPress={() => { Haptics.selectionAsync(); setShowComposer(true); }}
        style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#10101C', borderRadius: 16, padding: 14, borderColor: '#EC489928', borderWidth: 1, marginBottom: 10, shadowColor: '#EC4899', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }}
      >
        <Avatar name={profile?.displayName ?? 'Me'} url={profile?.avatarUrl} size={34} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ color: '#5A5575', fontSize: 14, fontWeight: '500' }}>What's on your mind?</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Ionicons name="image-outline" size={20} color="#EC489980" />
          <Ionicons name="camera-outline" size={20} color="#A855F780" />
        </View>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#080810' }} edges={['bottom']}>
      {isLoading ? (
        <ScrollView>
          {ListHeader}
          {FeedBar}
          <PostSkeleton />
          <PostSkeleton />
          <PostSkeleton />
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          {/* perf: removeClippedSubviews, windowSize, initialNumToRender, maxToRenderPerBatch, updateCellsBatchingPeriod for heavy post cards */}
          <FlatList
            data={posts}
            keyExtractor={(item: any) => String(item.id)}
            renderItem={({ item }) => (
              <PostCard
                post={item}
                onLike={(id) => handleLike(id)}
                onComment={(p) => handleComment(p)}
                onShare={handleShare}
                onDelete={(id) => deletePostMutation.mutate({ postId: id })}
                onPress={() => handleComment(item)}
                onRefresh={onRefresh}
                currentUserId={currentUserId}
                isLiked={likedPostIds.has(item.id as number)}
              />
            )}
            ListHeaderComponent={<>{ListHeader}{FeedBar}</>}
            ItemSeparatorComponent={() => <View style={{ height: 4 }} />}
            scrollEventThrottle={16}
          removeClippedSubviews
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={8}
          updateCellsBatchingPeriod={50}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.pink} />
          }
          contentContainerStyle={{ paddingBottom: 120 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 40, paddingHorizontal: 32 }}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>💫</Text>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: 8 }}>
                It's quiet in here…
              </Text>
              <Text style={{ color: colors.muted, fontSize: 15, textAlign: 'center', marginBottom: 24 }}>
                Be the first to share something with the community
              </Text>
              <Pressable
                onPress={() => { Haptics.selectionAsync(); setShowComposer(true); }}
                style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.96 : 1 }] })}
              >
                <BrandGradient
                  style={{ borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 8 }}
                >
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Create Post</Text>
                </BrandGradient>
              </Pressable>
            </View>
          }
        />
        </View>
      )}

      {/* ── Post Composer Modal ── */}
      <Modal visible={showComposer} animationType="slide" transparent onRequestClose={() => setShowComposer(false)}>
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
                <Avatar name={profile?.displayName ?? 'Me'} url={profile?.avatarUrl} size={36} />
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', flex: 1, marginLeft: 10 }}>New Post</Text>
                <TouchableOpacity
                  onPress={() => { setShowComposer(false); setComposerText(''); setComposerMedia(null); setComposerLink(''); setShowLinkInput(false); }}
                >
                  <Ionicons name="close" size={24} color={colors.muted} />
                </TouchableOpacity>
              </View>

              <TextInput
                value={composerText}
                onChangeText={setComposerText}
                placeholder="What's on your mind?"
                placeholderTextColor={colors.muted}
                multiline
                maxLength={1000}
                autoFocus
                style={{
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  color: colors.text,
                  fontSize: 15,
                  minHeight: 100,
                  textAlignVertical: 'top',
                  marginBottom: 12,
                }}
              />

              {composerMedia && (
                <View style={{ position: 'relative', marginBottom: 10 }}>
                  <Image
                    source={{ uri: composerMedia.uri }}
                    style={{ width: '100%', height: 160, borderRadius: 12 }}
                    contentFit="cover"
                  />
                  <TouchableOpacity
                    onPress={() => setComposerMedia(null)}
                    style={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Ionicons name="close" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}

              {showLinkInput && (
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 10, borderColor: '#10B981', borderWidth: 1, paddingHorizontal: 12, marginBottom: 10, gap: 8 }}>
                  <Ionicons name="link-outline" size={16} color="#10B981" />
                  <TextInput
                    value={composerLink}
                    onChangeText={setComposerLink}
                    placeholder="Paste a link..."
                    placeholderTextColor={colors.muted}
                    style={{ flex: 1, color: colors.text, paddingVertical: 10, fontSize: 14 }}
                    keyboardType="url"
                    autoCapitalize="none"
                  />
                  {composerLink ? (
                    <TouchableOpacity onPress={() => setComposerLink('')}>
                      <Ionicons name="close-circle" size={18} color={colors.muted} />
                    </TouchableOpacity>
                  ) : null}
                </View>
              )}

              <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 10, borderTopColor: colors.border, borderTopWidth: 1, marginBottom: 12 }}>
                <TouchableOpacity onPress={pickImage} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                  <Ionicons name="image-outline" size={22} color={colors.pink} />
                  <Text style={{ color: colors.muted, fontSize: 11 }}>Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={openCamera} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                  <Ionicons name="camera-outline" size={22} color={colors.purple} />
                  <Text style={{ color: colors.muted, fontSize: 11 }}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowLinkInput(!showLinkInput)} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                  <Ionicons name="link-outline" size={22} color="#10B981" />
                  <Text style={{ color: colors.muted, fontSize: 11 }}>Link</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={pickFile} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                  <Ionicons name="document-attach-outline" size={22} color="#F59E0B" />
                  <Text style={{ color: colors.muted, fontSize: 11 }}>File</Text>
                </TouchableOpacity>
              </View>

              <Pressable
                onPress={uploadMediaAndPost}
                disabled={(!composerText.trim() && !composerMedia && !composerLink) || createPostMutation.isPending || isUploading}
                style={({ pressed }) => ({
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                  opacity: ((!composerText.trim() && !composerMedia && !composerLink) || createPostMutation.isPending || isUploading) ? 0.5 : 1,
                })}
              >
                <BrandGradient
                  style={{ borderRadius: 14, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                >
                  {isUploading ? (
                    <>
                      <ActivityIndicator color="#fff" size="small" />
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Uploading...</Text>
                    </>
                  ) : createPostMutation.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Post</Text>
                  )}
                </BrandGradient>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Comments Sheet ── */}
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
