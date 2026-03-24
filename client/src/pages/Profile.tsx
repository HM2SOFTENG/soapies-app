import PageWrapper from "@/components/PageWrapper";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Save, Loader2, Camera, Sparkles, Shield, Heart,
  MapPin, Phone, Smile, Compass, Check, ArrowLeft, Edit3, Star,
  Bell, BellRing, Mail, MessageSquare, Smartphone, Image,
  Clock, CheckCircle2, XCircle, AlertCircle, FileText, ChevronRight,
  Trash2, Plus, Eye
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import { FloatingBubbles, GlowOrb } from "@/components/FloatingElements";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663460303717/FfTbhpP94ZvscRd7twWNT6/soapies-logo_cf3c72b2.png";

const FIELD_CONFIG = [
  { key: "displayName", label: "Display Name", icon: User, placeholder: "Your display name", type: "text" },
  { key: "bio", label: "About Me", icon: Edit3, placeholder: "Share your vibe, interests, what you're looking for...", type: "textarea" },
  { key: "location", label: "Location", icon: MapPin, placeholder: "City, State", type: "text" },
  { key: "phone", label: "Phone", icon: Phone, placeholder: "+1 (555) 000-0000", type: "text" },
  { key: "gender", label: "Gender", icon: Smile, placeholder: "Your gender", type: "text" },
  { key: "orientation", label: "Orientation", icon: Compass, placeholder: "Your orientation", type: "text" },
];

const NOTIFICATION_CATEGORIES = [
  { id: "application", label: "Application Updates", desc: "Status changes on your membership application", icon: FileText },
  { id: "events", label: "Events & Parties", desc: "New events, reminders, and ticket confirmations", icon: Star },
  { id: "messages", label: "Direct Messages", desc: "New messages from other members", icon: MessageSquare },
  { id: "community", label: "Community Activity", desc: "Wall posts, comments, and reactions", icon: Heart },
  { id: "announcements", label: "Announcements", desc: "Important community announcements", icon: BellRing },
];

type TabId = "info" | "status" | "notifications" | "photos";

const TABS: { id: TabId; label: string; icon: typeof User; mobileLabel: string }[] = [
  { id: "info", label: "Personal Info", icon: User, mobileLabel: "Info" },
  { id: "status", label: "Application Status", icon: FileText, mobileLabel: "Status" },
  { id: "notifications", label: "Notifications", icon: Bell, mobileLabel: "Alerts" },
  { id: "photos", label: "Photos", icon: Image, mobileLabel: "Photos" },
];

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; icon: typeof Check; label: string }> = {
    approved: { bg: "bg-emerald-500/15 border-emerald-400/30", text: "text-emerald-600", icon: CheckCircle2, label: "Approved" },
    submitted: { bg: "bg-amber-500/15 border-amber-400/30", text: "text-amber-600", icon: Clock, label: "Under Review" },
    rejected: { bg: "bg-red-500/15 border-red-400/30", text: "text-red-500", icon: XCircle, label: "Not Approved" },
    waitlisted: { bg: "bg-blue-500/15 border-blue-400/30", text: "text-blue-600", icon: AlertCircle, label: "Waitlisted" },
    draft: { bg: "bg-gray-500/15 border-gray-400/30", text: "text-gray-500", icon: Edit3, label: "Draft" },
  };
  const c = config[status] || config.draft;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border ${c.bg} ${c.text}`}>
      <Icon className="h-3.5 w-3.5" /> {c.label}
    </span>
  );
}

function ApplicationTimeline({ logs }: { logs: any[] }) {
  if (!logs || logs.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12"
      >
        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-100 to-purple-100 items-center justify-center mb-4"
        >
          <Clock className="h-8 w-8 text-pink-400" />
        </motion.div>
        <p className="text-gray-500 font-medium">No activity yet</p>
        <p className="text-gray-400 text-sm mt-1">Your application timeline will appear here once you submit.</p>
      </motion.div>
    );
  }

  return (
    <div className="relative pl-8">
      {/* Timeline line */}
      <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gradient-to-b from-pink-300 via-purple-300 to-pink-200 rounded-full" />

      {logs.map((log: any, i: number) => {
        const isApproval = log.action?.includes("approved");
        const isRejection = log.action?.includes("rejected");
        const isSubmission = log.action?.includes("submit");
        const dotColor = isApproval ? "bg-emerald-400" : isRejection ? "bg-red-400" : "bg-pink-400";

        return (
          <motion.div
            key={log.id || i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="relative mb-6 last:mb-0"
          >
            {/* Dot */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.1 + 0.1, type: "spring" }}
              className={`absolute -left-5 top-1 w-4 h-4 rounded-full ${dotColor} border-2 border-white shadow-md`}
            />
            {i === 0 && (
              <motion.div
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className={`absolute -left-5 top-1 w-4 h-4 rounded-full ${dotColor}`}
              />
            )}

            <div className="glass-strong rounded-xl p-4 border border-pink-100/50 ml-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-gray-700 text-sm capitalize">
                    {log.action?.replace(/_/g, " ") || "Status Update"}
                  </p>
                  {log.notes && (
                    <p className="text-gray-500 text-xs mt-1">{log.notes}</p>
                  )}
                  {log.previousStatus && log.newStatus && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-500 capitalize">{log.previousStatus}</span>
                      <ChevronRight className="h-3 w-3 text-gray-400" />
                      <span className="text-xs px-2 py-0.5 rounded bg-pink-100 text-pink-600 font-semibold capitalize">{log.newStatus}</span>
                    </div>
                  )}
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {log.createdAt ? new Date(log.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}
                </span>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function NotificationPreferencesTab() {
  const { data: prefs, isLoading } = trpc.notifications.preferences.useQuery(undefined, {
    staleTime: 30_000, refetchOnWindowFocus: false,
  });
  const { data: channels } = trpc.notifications.channels.useQuery(undefined, {
    staleTime: 60_000, refetchOnWindowFocus: false,
  });
  const utils = trpc.useUtils();
  const upsertPref = trpc.notifications.upsertPreference.useMutation({
    onSuccess: () => {
      utils.notifications.preferences.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const getPreference = (category: string, channel: "inApp" | "email" | "sms" | "push") => {
    const pref = prefs?.find((p: any) => p.category === category);
    if (!pref) {
      // Defaults
      if (channel === "inApp" || channel === "push") return true;
      if (channel === "email") return true;
      return false;
    }
    return pref[channel] ?? false;
  };

  const togglePref = (category: string, channel: "inApp" | "email" | "sms" | "push", value: boolean) => {
    upsertPref.mutate({ category, [channel]: value });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-pink-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Channel Status Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong rounded-xl p-4 border border-pink-100/50"
      >
        <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-3">Active Channels</p>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200/50">
            <Bell className="h-3 w-3" /> In-App
          </span>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border ${
            channels?.emailEnabled
              ? "bg-emerald-50 text-emerald-600 border-emerald-200/50"
              : "bg-gray-50 text-gray-400 border-gray-200/50"
          }`}>
            <Mail className="h-3 w-3" /> Email {!channels?.emailEnabled && "(Not configured)"}
          </span>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border ${
            channels?.smsEnabled
              ? "bg-emerald-50 text-emerald-600 border-emerald-200/50"
              : "bg-gray-50 text-gray-400 border-gray-200/50"
          }`}>
            <Smartphone className="h-3 w-3" /> SMS {!channels?.smsEnabled && "(Not configured)"}
          </span>
        </div>
      </motion.div>

      {/* Category Preferences */}
      {NOTIFICATION_CATEGORIES.map((cat, i) => {
        const CatIcon = cat.icon;
        return (
          <motion.div
            key={cat.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="glass-strong rounded-xl p-4 sm:p-5 border border-pink-100/50"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 rounded-lg bg-gradient-to-br from-pink-100 to-purple-100 flex-shrink-0">
                <CatIcon className="h-4 w-4 text-pink-500" />
              </div>
              <div>
                <p className="font-bold text-gray-700 text-sm">{cat.label}</p>
                <p className="text-gray-400 text-xs mt-0.5">{cat.desc}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(["inApp", "email", "sms", "push"] as const).map(channel => {
                const channelIcons = { inApp: Bell, email: Mail, sms: Smartphone, push: BellRing };
                const channelLabels = { inApp: "In-App", email: "Email", sms: "SMS", push: "Push" };
                const ChannelIcon = channelIcons[channel];
                const isEnabled = getPreference(cat.id, channel);
                const isChannelAvailable = channel === "inApp" || channel === "push" ||
                  (channel === "email" && channels?.emailEnabled) ||
                  (channel === "sms" && channels?.smsEnabled);

                return (
                  <div key={channel} className={`flex items-center justify-between gap-2 p-2 rounded-lg ${
                    !isChannelAvailable ? "opacity-40" : ""
                  }`}>
                    <div className="flex items-center gap-1.5">
                      <ChannelIcon className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-xs font-medium text-gray-600">{channelLabels[channel]}</span>
                    </div>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={(v) => togglePref(cat.id, channel, v)}
                      disabled={!isChannelAvailable || upsertPref.isPending}
                      className="data-[state=checked]:bg-pink-500 scale-75"
                    />
                  </div>
                );
              })}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function PhotosGallery({ profileId }: { profileId?: number }) {
  const { data: photos, isLoading } = trpc.profile.photos.useQuery(undefined, {
    enabled: !!profileId, staleTime: 30_000, refetchOnWindowFocus: false,
  });
  const utils = trpc.useUtils();
  const deletePhoto = trpc.profile.deletePhoto.useMutation({
    onSuccess: () => {
      toast.success("Photo removed");
      utils.profile.photos.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large", { description: "Max 5MB per photo." });
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload-photo", { method: "POST", body: formData, credentials: "include" });
      const data = await res.json();
      if (data.url) {
        toast.success("Photo uploaded!");
        utils.profile.photos.invalidate();
      } else {
        toast.error("Upload failed");
      }
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-pink-400" />
      </div>
    );
  }

  const photoList = photos || [];

  return (
    <div>
      {/* Upload area */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => fileRef.current?.click()}
          disabled={uploading || photoList.length >= 6}
          className="w-full p-6 rounded-xl border-2 border-dashed border-pink-200 hover:border-pink-400 bg-pink-50/30 hover:bg-pink-50/60 transition-all flex flex-col items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-pink-400" />
          ) : (
            <div className="p-3 rounded-xl bg-gradient-to-br from-pink-100 to-purple-100">
              <Plus className="h-6 w-6 text-pink-500" />
            </div>
          )}
          <p className="text-sm font-bold text-gray-600">
            {uploading ? "Uploading..." : photoList.length >= 6 ? "Maximum 6 photos" : "Add Photo"}
          </p>
          <p className="text-xs text-gray-400">{photoList.length}/6 photos uploaded · Max 5MB each</p>
        </motion.button>
      </motion.div>

      {/* Photo Grid */}
      {photoList.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-8"
        >
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-100 to-purple-100 items-center justify-center mb-4"
          >
            <Camera className="h-8 w-8 text-pink-400" />
          </motion.div>
          <p className="text-gray-500 font-medium">No photos yet</p>
          <p className="text-gray-400 text-sm mt-1">Upload photos to complete your profile.</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photoList.map((photo: any, i: number) => (
            <motion.div
              key={photo.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08 }}
              className="relative group aspect-square rounded-xl overflow-hidden border border-pink-100/50 shadow-md"
            >
              <img
                src={photo.photoUrl}
                alt={`Photo ${i + 1}`}
                className="w-full h-full object-cover"
              />
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end justify-between p-3">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setPreview(photo.photoUrl)}
                  className="p-2 rounded-lg bg-white/20 backdrop-blur-sm text-white"
                >
                  <Eye className="h-4 w-4" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    if (confirm("Remove this photo?")) {
                      deletePhoto.mutate({ photoId: photo.id });
                    }
                  }}
                  className="p-2 rounded-lg bg-red-500/20 backdrop-blur-sm text-white"
                >
                  <Trash2 className="h-4 w-4" />
                </motion.button>
              </div>
              {/* Status badge */}
              {photo.status && photo.status !== "approved" && (
                <div className="absolute top-2 right-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    photo.status === "pending" ? "bg-amber-100 text-amber-600" : "bg-red-100 text-red-500"
                  }`}>
                    {photo.status}
                  </span>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Lightbox Preview */}
      <AnimatePresence>
        {preview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreview(null)}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          >
            <motion.img
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              src={preview}
              alt="Preview"
              className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Profile() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { data: profile, isLoading } = trpc.profile.me.useQuery(undefined, {
    enabled: isAuthenticated, retry: false, staleTime: 30_000, refetchOnWindowFocus: false,
  });
  const { data: timelineLogs } = trpc.applicationTimeline.logs.useQuery(undefined, {
    enabled: isAuthenticated, staleTime: 60_000, refetchOnWindowFocus: false,
  });
  const utils = trpc.useUtils();
  const upsert = trpc.profile.upsert.useMutation({
    onSuccess: () => {
      toast.success("Profile updated!", { description: "Your changes have been saved." });
      utils.profile.me.invalidate();
      setIsDirty(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const [form, setForm] = useState({ displayName: "", bio: "", location: "", phone: "", gender: "", orientation: "" });
  const [isDirty, setIsDirty] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("info");

  useEffect(() => {
    if (profile) {
      setForm({
        displayName: profile.displayName || "",
        bio: profile.bio || "",
        location: profile.location || "",
        phone: profile.phone || "",
        gender: profile.gender || "",
        orientation: profile.orientation || "",
      });
    }
  }, [profile]);

  const updateField = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  if (authLoading || isLoading) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
            <Loader2 className="h-10 w-10 text-pink-400" />
          </motion.div>
          <p className="text-sm text-gray-400">Loading your profile...</p>
        </div>
      </PageWrapper>
    );
  }

  if (!isAuthenticated) {
    return (
      <PageWrapper>
        <div className="container px-4 py-20 text-center max-w-md mx-auto">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}
            className="inline-flex w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-100 to-purple-100 items-center justify-center mb-6">
            <Shield className="h-10 w-10 text-pink-400" />
          </motion.div>
          <h2 className="font-display text-2xl font-bold text-gray-700 mb-3">Sign in to view your profile</h2>
          <p className="text-gray-400 text-sm mb-6">Create your Soapies identity and connect with the community.</p>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button onClick={() => window.location.href = getLoginUrl()}
              className="bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl px-8 py-3 shadow-xl gap-2">
              <Sparkles className="h-4 w-4" /> Sign In
            </Button>
          </motion.div>
        </div>
      </PageWrapper>
    );
  }

  const handleSave = () => upsert.mutate(form);
  const initials = user?.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?";

  return (
    <PageWrapper>
      <div className="container px-4 py-6 sm:py-8 max-w-3xl mx-auto">
        {/* Back link */}
        <Link href="/dashboard">
          <motion.div whileHover={{ x: -4 }} className="inline-flex items-center gap-2 text-gray-400 hover:text-pink-500 mb-6 cursor-pointer text-sm font-medium">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </motion.div>
        </Link>

        {/* Profile Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-pink-500 via-fuchsia-500 to-purple-600 p-6 sm:p-8 mb-6"
        >
          <FloatingBubbles count={5} />
          <GlowOrb className="top-0 right-0 opacity-20" size={180} />

          <div className="relative z-10 flex flex-col sm:flex-row items-center gap-5">
            {/* Avatar */}
            <motion.div whileHover={{ scale: 1.05 }} className="relative flex-shrink-0">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center shadow-2xl">
                <span className="font-display text-3xl sm:text-4xl font-black text-white">{initials}</span>
              </div>
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -inset-1 rounded-2xl border-2 border-white/30 pointer-events-none"
              />
            </motion.div>

            <div className="text-center sm:text-left flex-1">
              <h1 className="font-display text-2xl sm:text-3xl font-black text-white">{user?.name || "Member"}</h1>
              <p className="text-white/70 text-sm mt-1">{user?.email}</p>
              <div className="flex flex-wrap items-center gap-2 mt-3 justify-center sm:justify-start">
                {profile?.applicationStatus && <StatusBadge status={profile.applicationStatus} />}
                {profile?.communityId && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-white/15 text-white/80 border border-white/20">
                    <Sparkles className="h-3 w-3" /> {profile.communityId}
                  </span>
                )}
              </div>
            </div>

            <img src={LOGO_URL} alt="Soapies" className="hidden sm:block w-14 h-14 opacity-30" />
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1 scrollbar-hide">
          {TABS.map((tab, i) => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap flex-shrink-0 ${
                  isActive
                    ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-200/30"
                    : "glass-strong border border-pink-100/50 text-gray-500 hover:text-pink-500"
                }`}
              >
                <TabIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="sm:hidden">{tab.mobileLabel}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.id === "status" && profile?.applicationStatus === "submitted" && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === "info" && (
            <motion.div
              key="info"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="glass-strong rounded-2xl p-6 sm:p-8 border border-pink-100/50 shadow-xl shadow-pink-50/30">
                <div className="space-y-5">
                  {FIELD_CONFIG.map((field, i) => {
                    const Icon = field.icon;
                    return (
                      <motion.div
                        key={field.key}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06 }}
                      >
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-600 mb-2">
                          <Icon className="h-4 w-4 text-pink-400" />
                          {field.label}
                        </label>
                        {field.type === "textarea" ? (
                          <textarea
                            value={(form as any)[field.key]}
                            onChange={e => updateField(field.key, e.target.value)}
                            placeholder={field.placeholder}
                            rows={4}
                            className="w-full px-4 py-3 rounded-xl border border-pink-100 bg-white/50 focus:border-pink-300 focus:ring-2 focus:ring-pink-200/50 outline-none transition-all text-sm resize-none placeholder:text-gray-300"
                          />
                        ) : (
                          <Input
                            value={(form as any)[field.key]}
                            onChange={e => updateField(field.key, e.target.value)}
                            placeholder={field.placeholder}
                            className="rounded-xl border-pink-100 bg-white/50 focus:border-pink-300 focus-visible:ring-pink-200/50 placeholder:text-gray-300"
                          />
                        )}
                      </motion.div>
                    );
                  })}
                </div>

                {/* Save Button */}
                <motion.div className="mt-8">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      onClick={handleSave}
                      disabled={upsert.isPending || !isDirty}
                      className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-xl py-6 text-base font-bold shadow-xl shadow-pink-200/50 gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      size="lg"
                    >
                      {upsert.isPending ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : isDirty ? (
                        <Save className="h-5 w-5" />
                      ) : (
                        <Check className="h-5 w-5" />
                      )}
                      {upsert.isPending ? "Saving..." : isDirty ? "Save Changes" : "All Saved"}
                    </Button>
                  </motion.div>
                  {isDirty && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center text-xs text-pink-400 mt-2 font-medium"
                    >
                      You have unsaved changes
                    </motion.p>
                  )}
                </motion.div>
              </div>
            </motion.div>
          )}

          {activeTab === "status" && (
            <motion.div
              key="status"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Status Overview Card */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-strong rounded-2xl p-6 sm:p-8 border border-pink-100/50 shadow-xl shadow-pink-50/30 mb-6"
              >
                <h3 className="font-display text-lg font-bold text-gray-700 mb-4">Application Status</h3>

                {/* Status Steps */}
                <div className="flex items-center justify-between mb-8">
                  {[
                    { id: "draft", label: "Draft", icon: Edit3 },
                    { id: "submitted", label: "Submitted", icon: FileText },
                    { id: "review", label: "Under Review", icon: Eye },
                    { id: "approved", label: "Approved", icon: CheckCircle2 },
                  ].map((step, i) => {
                    const StepIcon = step.icon;
                    const status = profile?.applicationStatus || "draft";
                    const stepOrder = ["draft", "submitted", "review", "approved"];
                    const currentIdx = stepOrder.indexOf(status === "waitlisted" || status === "rejected" ? "review" : status);
                    const isComplete = i <= currentIdx;
                    const isCurrent = i === currentIdx;

                    return (
                      <div key={step.id} className="flex flex-col items-center flex-1">
                        <div className="flex items-center w-full">
                          {i > 0 && (
                            <div className={`flex-1 h-0.5 ${isComplete ? "bg-gradient-to-r from-pink-400 to-purple-400" : "bg-gray-200"} transition-colors`} />
                          )}
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: i * 0.15, type: "spring" }}
                            className={`relative flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-all ${
                              isComplete
                                ? "bg-gradient-to-br from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-200/40"
                                : "bg-gray-100 text-gray-400 border border-gray-200"
                            }`}
                          >
                            <StepIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                            {isCurrent && (
                              <motion.div
                                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="absolute inset-0 rounded-xl border-2 border-pink-400"
                              />
                            )}
                          </motion.div>
                          {i < 3 && (
                            <div className={`flex-1 h-0.5 ${i < currentIdx ? "bg-gradient-to-r from-purple-400 to-pink-400" : "bg-gray-200"} transition-colors`} />
                          )}
                        </div>
                        <p className={`text-[10px] sm:text-xs font-semibold mt-2 text-center ${isComplete ? "text-pink-600" : "text-gray-400"}`}>
                          {step.label}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Current Status Message */}
                <div className={`rounded-xl p-4 ${
                  profile?.applicationStatus === "approved" ? "bg-emerald-50 border border-emerald-200/50" :
                  profile?.applicationStatus === "rejected" ? "bg-red-50 border border-red-200/50" :
                  profile?.applicationStatus === "waitlisted" ? "bg-blue-50 border border-blue-200/50" :
                  profile?.applicationStatus === "submitted" ? "bg-amber-50 border border-amber-200/50" :
                  "bg-gray-50 border border-gray-200/50"
                }`}>
                  {profile?.applicationStatus === "approved" && (
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-emerald-700 text-sm">Welcome to Soapies!</p>
                        <p className="text-emerald-600 text-xs mt-1">Your application has been approved. You now have full access to all community features, events, and messaging.</p>
                      </div>
                    </div>
                  )}
                  {profile?.applicationStatus === "submitted" && (
                    <div className="flex items-start gap-3">
                      <Clock className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-amber-700 text-sm">Application Under Review</p>
                        <p className="text-amber-600 text-xs mt-1">Our team is reviewing your application. This typically takes 24-48 hours. You'll be notified once a decision is made.</p>
                      </div>
                    </div>
                  )}
                  {profile?.applicationStatus === "rejected" && (
                    <div className="flex items-start gap-3">
                      <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-red-700 text-sm">Application Not Approved</p>
                        <p className="text-red-600 text-xs mt-1">Unfortunately, your application was not approved at this time. You may reapply after 30 days.</p>
                      </div>
                    </div>
                  )}
                  {profile?.applicationStatus === "waitlisted" && (
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-blue-700 text-sm">You're on the Waitlist</p>
                        <p className="text-blue-600 text-xs mt-1">You've been placed on our waitlist. We'll notify you as soon as a spot opens up. Hang tight!</p>
                      </div>
                    </div>
                  )}
                  {(!profile?.applicationStatus || profile?.applicationStatus === "draft") && (
                    <div className="flex items-start gap-3">
                      <Edit3 className="h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-gray-700 text-sm">Application Not Started</p>
                        <p className="text-gray-500 text-xs mt-1">Complete your profile and submit your application to join the Soapies community.</p>
                        <Link href="/apply">
                          <motion.span whileHover={{ x: 4 }} className="inline-flex items-center gap-1 text-xs font-bold text-pink-500 mt-2 cursor-pointer">
                            Start Application <ChevronRight className="h-3 w-3" />
                          </motion.span>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Timeline */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass-strong rounded-2xl p-6 sm:p-8 border border-pink-100/50 shadow-xl shadow-pink-50/30"
              >
                <h3 className="font-display text-lg font-bold text-gray-700 mb-6 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-pink-400" /> Activity Timeline
                </h3>
                <ApplicationTimeline logs={timelineLogs || []} />
              </motion.div>
            </motion.div>
          )}

          {activeTab === "notifications" && (
            <motion.div
              key="notifications"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="glass-strong rounded-2xl p-6 sm:p-8 border border-pink-100/50 shadow-xl shadow-pink-50/30">
                <h3 className="font-display text-lg font-bold text-gray-700 mb-1">Notification Preferences</h3>
                <p className="text-gray-400 text-sm mb-6">Choose how you want to be notified for each category.</p>
                <NotificationPreferencesTab />
              </div>
            </motion.div>
          )}

          {activeTab === "photos" && (
            <motion.div
              key="photos"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="glass-strong rounded-2xl p-6 sm:p-8 border border-pink-100/50 shadow-xl shadow-pink-50/30">
                <h3 className="font-display text-lg font-bold text-gray-700 mb-1">Your Photos</h3>
                <p className="text-gray-400 text-sm mb-6">Manage your profile photos. Upload up to 6 photos.</p>
                <PhotosGallery profileId={profile?.id} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageWrapper>
  );
}
