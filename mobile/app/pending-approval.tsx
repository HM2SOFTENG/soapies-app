import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { trpc } from '../lib/trpc';
import { colors } from '../lib/colors';
import { useAuth } from '../lib/auth';

// ─── Status Config ────────────────────────────────────────────────────────────

type StatusConfig = {
  emoji: string;
  title: string;
  color: string;
  bgColor: string;
  message: string;
  subMessage?: string;
  showScheduleCall?: boolean;
};

function getStatusConfig(status: string, phase?: string | null): StatusConfig {
  const effective = phase || status;
  switch (effective) {
    case 'interview_scheduled':
      return {
        emoji: '📞',
        title: 'Interview Scheduled!',
        color: '#3B82F6',
        bgColor: 'rgba(59,130,246,0.1)',
        message: 'Interview scheduled! Check your email for details.',
        subMessage:
          'Your application passed initial review. The next step is a short intro call with our team.',
        showScheduleCall: true,
      };
    case 'interview_complete':
      return {
        emoji: '✨',
        title: 'Interview Complete!',
        color: colors.purple,
        bgColor: 'rgba(168,85,247,0.1)',
        message: "Interview complete! You'll receive an email with our decision within 24 hours.",
        subMessage: 'Final decisions are made within 24-48 hours.',
      };
    case 'waitlisted':
      return {
        emoji: '📋',
        title: 'On the Waitlist',
        color: '#F59E0B',
        bgColor: 'rgba(245,158,11,0.1)',
        message: "You're on the waitlist. We'll notify you when a spot opens.",
        subMessage: "Thank you for your interest — we can't wait to welcome you!",
      };
    case 'rejected':
      return {
        emoji: '💌',
        title: 'Application Update',
        color: colors.muted,
        bgColor: 'rgba(156,163,175,0.1)',
        message:
          "Thank you for your interest in Soapies. Unfortunately, we're unable to approve your application at this time.",
        subMessage: 'Feel free to reach out if you have questions.',
      };
    case 'approved':
    case 'final_approved':
      return {
        emoji: '🎉',
        title: 'Welcome to Soapies!',
        color: '#10B981',
        bgColor: 'rgba(16,185,129,0.1)',
        message:
          'Your application has been approved! You now have full access to all Soapies events, community features, and messaging.',
        subMessage: "We can't wait to see you at our next event!",
      };
    case 'submitted':
      return {
        emoji: '⏳',
        title: 'Application Received!',
        color: colors.purple,
        bgColor: 'rgba(168,85,247,0.1)',
        message: 'Application received! Our team reviews within 24-48 hours.',
        subMessage: "You'll receive an email and push notification as soon as there's an update.",
      };
    case 'under_review':
    default:
      return {
        emoji: '🔍',
        title: 'Application Under Review',
        color: colors.purple,
        bgColor: 'rgba(168,85,247,0.1)',
        message: 'Your application is being reviewed by our team.',
        subMessage: 'This usually takes 24-48 hours.',
      };
  }
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

const TIMELINE_STEPS = [
  {
    label: 'Submitted',
    key: [
      'submitted',
      'under_review',
      'interview_scheduled',
      'interview_complete',
      'approved',
      'waitlisted',
      'rejected',
    ],
  },
  {
    label: 'Under Review',
    key: ['under_review', 'interview_scheduled', 'interview_complete', 'approved'],
  },
  { label: 'Interview', key: ['interview_scheduled', 'interview_complete', 'approved'] },
  { label: 'Approved', key: ['approved', 'final_approved'] },
];

function Timeline({ status, phase }: { status: string; phase?: string | null }) {
  const effective = phase || status;
  return (
    <View style={styles.timeline}>
      {TIMELINE_STEPS.map((step, i) => {
        const done = step.key.includes(effective);
        const isLast = i === TIMELINE_STEPS.length - 1;
        return (
          <React.Fragment key={step.label}>
            <View style={styles.timelineStep}>
              <View style={[styles.timelineDot, done && styles.timelineDotDone]}>
                {done && <Ionicons name="checkmark" size={10} color="#fff" />}
              </View>
              <Text style={[styles.timelineLabel, done && styles.timelineLabelDone]}>
                {step.label}
              </Text>
            </View>
            {!isLast && <View style={[styles.timelineLine, done && styles.timelineLineDone]} />}
          </React.Fragment>
        );
      })}
    </View>
  );
}

// ─── Accordion ────────────────────────────────────────────────────────────────

function Accordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.accordion}>
      <TouchableOpacity
        onPress={() => setOpen(!open)}
        style={styles.accordionHeader}
        activeOpacity={0.7}
      >
        <Text style={styles.accordionTitle}>{title}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
      </TouchableOpacity>
      {open && <View style={styles.accordionBody}>{children}</View>}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function PendingApprovalScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const [slotModalOpen, setSlotModalOpen] = useState(false);

  const profileQuery = trpc.profile.me.useQuery(undefined, {
    refetchInterval: 30_000, // poll every 30 seconds
    staleTime: 0,
  });

  const profile = profileQuery.data as any;
  const status = profile?.applicationStatus ?? 'submitted';
  const phase = profile?.applicationPhase ?? null;
  const config = getStatusConfig(status, phase);
  const hasBookedSlot = !!profile?.introCallSlotId;

  // Only fetch when modal is actually open — avoids unnecessary load for everyone
  const slotsQuery = trpc.introCalls.available.useQuery(undefined, {
    enabled: slotModalOpen,
    staleTime: 30_000,
  });

  const utils = trpc.useUtils?.() ?? (trpc as any).useContext?.();
  const bookSlotMutation = trpc.introCalls.book.useMutation({
    onSuccess: () => {
      setSlotModalOpen(false);
      profileQuery.refetch();
      utils?.introCalls?.available.invalidate?.();
      Alert.alert('Booked!', "You're scheduled. We'll send a confirmation email shortly.");
    },
    onError: (err: any) => {
      Alert.alert('Could not book slot', err?.message ?? 'Please try another time.');
    },
  });

  // Auto-redirect when approved
  useEffect(() => {
    if (status === 'approved' && !phase) {
      router.replace('/(tabs)');
    }
    if (phase === 'final_approved') {
      router.replace('/(tabs)');
    }
  }, [phase, router, status]);

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  if (profileQuery.isLoading) {
    return (
      <SafeAreaView style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.pink} />
      </SafeAreaView>
    );
  }

  if (profileQuery.isError) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
        ]}
      >
        <Ionicons name="cloud-offline-outline" size={42} color={colors.muted} />
        <Text style={[styles.title, { color: colors.text, marginTop: 14, textAlign: 'center' }]}>
          Could not load your application status
        </Text>
        <Text style={[styles.statusSubMessage, { textAlign: 'center', marginTop: 8 }]}>
          {(profileQuery.error as any)?.message ?? 'Please try again in a moment.'}
        </Text>
        <TouchableOpacity
          onPress={() => profileQuery.refetch()}
          style={[styles.scheduleBtn, { marginTop: 18, borderColor: colors.pink }]}
        >
          <Ionicons name="refresh-outline" size={16} color={colors.pink} />
          <Text style={[styles.scheduleBtnText, { color: colors.pink }]}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status emoji */}
        <View style={[styles.emojiContainer, { backgroundColor: config.bgColor }]}>
          <Text style={styles.emoji}>{config.emoji}</Text>
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: config.color }]}>{config.title}</Text>

        {/* Status card */}
        <View style={[styles.statusCard, { borderColor: config.color, borderWidth: 1.5 }]}>
          <Text style={styles.statusMessage}>{config.message}</Text>
          {config.subMessage && <Text style={styles.statusSubMessage}>{config.subMessage}</Text>}

          {config.showScheduleCall && (
            <TouchableOpacity
              style={[
                styles.scheduleBtn,
                { backgroundColor: config.bgColor, borderColor: config.color },
              ]}
              activeOpacity={0.8}
              onPress={() => setSlotModalOpen(true)}
            >
              <Ionicons
                name={hasBookedSlot ? 'calendar' : 'calendar-outline'}
                size={16}
                color={config.color}
              />
              <Text style={[styles.scheduleBtnText, { color: config.color }]}>
                {hasBookedSlot ? 'Reschedule Call' : 'Schedule Your Call'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>APPLICATION PROGRESS</Text>
          <Timeline status={status} phase={phase} />
        </View>

        {/* FAQ accordion */}
        <Accordion title="What happens next?">
          <Text style={styles.accordionText}>
            Our team reviews each application carefully. We look at your profile, photos, and how
            you present yourself in the community.
            {'\n\n'}
            Most reviews are completed within 24-48 hours. You&apos;ll receive an email and push
            notification as soon as there&apos;s an update.
            {'\n\n'}
            Approved members get full access to events, messaging, and community features.
          </Text>
        </Accordion>

        <Accordion title="Can I update my application?">
          <Text style={styles.accordionText}>
            While your application is under review, you can still add or update your photos to
            strengthen your application. Reach out to our team if you have questions.
          </Text>
        </Accordion>

        {/* Polling indicator */}
        <View style={styles.pollingRow}>
          <View style={styles.pollingDot} />
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            Auto-refreshing every 30 seconds
          </Text>
        </View>

        {/* Logout */}
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={18} color={colors.muted} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Intro-call slot picker modal */}
      <Modal
        visible={slotModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSlotModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pick an interview slot</Text>
              <TouchableOpacity
                onPress={() => setSlotModalOpen(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={22} color={colors.muted} />
              </TouchableOpacity>
            </View>

            {slotsQuery.isLoading ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator color={colors.pink} />
              </View>
            ) : slotsQuery.isError ? (
              <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                <Ionicons name="cloud-offline-outline" size={28} color={colors.muted} />
                <Text style={[styles.modalEmpty, { marginTop: 12, marginBottom: 14 }]}>
                  {(slotsQuery.error as any)?.message ??
                    'Could not load interview slots right now.'}
                </Text>
                <TouchableOpacity
                  onPress={() => slotsQuery.refetch()}
                  style={[styles.scheduleBtn, { borderColor: colors.pink }]}
                >
                  <Ionicons name="refresh-outline" size={16} color={colors.pink} />
                  <Text style={[styles.scheduleBtnText, { color: colors.pink }]}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (slotsQuery.data ?? []).length === 0 ? (
              <Text style={styles.modalEmpty}>
                No slots available right now. Please check back soon — we release new times
                regularly.
              </Text>
            ) : (
              <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
                {(slotsQuery.data ?? []).map((slot: any) => {
                  const d = new Date(slot.scheduledAt);
                  const pretty = d.toLocaleString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  });
                  const busy = bookSlotMutation.isPending;
                  return (
                    <TouchableOpacity
                      key={slot.id}
                      style={styles.slotRow}
                      activeOpacity={0.8}
                      disabled={busy}
                      onPress={() => bookSlotMutation.mutate({ slotId: slot.id })}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.slotTime}>{pretty}</Text>
                        <Text style={styles.slotDuration}>
                          {slot.duration ?? 20} min · video call
                        </Text>
                      </View>
                      {busy ? (
                        <ActivityIndicator size="small" color={colors.pink} />
                      ) : (
                        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 60,
    alignItems: 'center',
  },
  emojiContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emoji: {
    fontSize: 48,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  statusCard: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  statusMessage: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  statusSubMessage: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 10,
  },
  scheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 16,
    borderWidth: 1.5,
    gap: 8,
  },
  scheduleBtnText: {
    fontWeight: '700',
    fontSize: 14,
  },

  // Timeline
  section: {
    width: '100%',
    marginBottom: 20,
  },
  sectionLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 16,
  },
  timeline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timelineStep: {
    alignItems: 'center',
    flex: 0,
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  timelineDotDone: {
    backgroundColor: colors.purple,
    borderColor: colors.purple,
  },
  timelineLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: 52,
  },
  timelineLabelDone: {
    color: colors.text,
    fontWeight: '700',
  },
  timelineLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border,
    marginBottom: 20,
  },
  timelineLineDone: {
    backgroundColor: colors.purple,
  },

  // Accordion
  accordion: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  accordionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  accordionBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  accordionText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 22,
  },

  // Polling
  pollingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    marginBottom: 8,
  },
  pollingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },

  // Logout
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoutText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
  },

  // Slot picker modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  modalEmpty: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    paddingVertical: 24,
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: colors.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  slotTime: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  slotDuration: {
    color: colors.muted,
    fontSize: 12,
  },
});
