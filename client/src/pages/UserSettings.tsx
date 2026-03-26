import PageWrapper from "@/components/PageWrapper";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  Settings, Bell, BellOff, BellRing, User, Loader2, Shield,
  Check, ChevronRight, Sparkles, Mail, MessageSquare, Smartphone
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const NOTIFICATION_CATEGORIES = [
  { key: "messages", label: "Messages", description: "New DMs and mentions", icon: MessageSquare },
  { key: "events", label: "Events", description: "Event reminders and updates", icon: Bell },
  { key: "system", label: "System", description: "Account and security alerts", icon: Shield },
];

export default function UserSettings() {
  const { user, isAuthenticated } = useAuth();
  const { supported: pushSupported, permission, subscribe, isPending: pushPending } = usePushNotifications();
  const utils = trpc.useUtils();

  const { data: preferences, isLoading: prefsLoading } = trpc.notifications.preferences.useQuery(undefined, {
    retry: false, staleTime: 15_000, refetchOnWindowFocus: false,
  });

  const { data: profile, isLoading: profileLoading } = trpc.profile.me.useQuery(undefined, {
    retry: false, staleTime: 15_000, refetchOnWindowFocus: false,
  });

  const upsertPref = trpc.notifications.upsertPreference.useMutation({
    onSuccess: () => {
      utils.notifications.preferences.invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const upsertProfile = trpc.profile.upsert.useMutation({
    onSuccess: () => {
      toast.success("Display name updated!", { icon: "✓" });
      utils.profile.me.invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const [displayName, setDisplayName] = useState("");
  const [editingName, setEditingName] = useState(false);

  if (!isAuthenticated) {
    return (
      <PageWrapper>
        <div className="container px-4 py-20 text-center max-w-md mx-auto">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring" }}
            className="inline-flex w-20 h-20 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 items-center justify-center mb-6"
          >
            <Shield className="h-10 w-10 text-pink-400" />
          </motion.div>
          <h2 className="font-display text-2xl font-bold text-gray-700 mb-3">Settings</h2>
          <p className="text-gray-400 text-sm mb-6">Sign in to manage your settings.</p>
          <Button
            onClick={() => window.location.href = getLoginUrl()}
            className="bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl px-8 py-3 shadow-xl gap-2"
          >
            <Sparkles className="h-4 w-4" /> Sign In
          </Button>
        </div>
      </PageWrapper>
    );
  }

  const getPref = (category: string, channel: "inApp" | "email" | "sms" | "push") => {
    if (!preferences) return true;
    const pref = (preferences as any[]).find((p: any) => p.category === category);
    if (!pref) return true;
    return pref[channel] !== false;
  };

  const togglePref = (category: string, channel: "inApp" | "email" | "sms" | "push") => {
    const current = getPref(category, channel);
    upsertPref.mutate({ category, [channel]: !current });
  };

  return (
    <PageWrapper>
      <div className="container px-4 py-6 sm:py-8 max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Page Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center shadow-lg">
              <Settings className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-black text-gray-800">Settings</h1>
              <p className="text-sm text-gray-400">Manage your preferences</p>
            </div>
          </div>

          {/* Profile Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="glass-strong rounded-2xl border border-pink-100/50 overflow-hidden shadow-md"
          >
            <div className="px-5 py-4 border-b border-pink-50">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-pink-400" />
                <h2 className="font-display font-bold text-gray-700">Profile</h2>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Display Name */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                  Display Name
                </label>
                {profileLoading ? (
                  <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
                ) : editingName ? (
                  <div className="flex gap-2">
                    <input
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      placeholder={profile?.displayName || user?.name || "Enter display name"}
                      className="flex-1 px-4 py-2.5 rounded-xl border border-pink-200 bg-pink-50/30 text-sm outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-200/50"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        if (displayName.trim()) {
                          upsertProfile.mutate({ displayName: displayName.trim() });
                        }
                        setEditingName(false);
                      }}
                      disabled={upsertProfile.isPending}
                      className="bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl px-4"
                    >
                      {upsertProfile.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingName(false)}
                      className="rounded-xl border-pink-200"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setDisplayName(profile?.displayName || "");
                      setEditingName(true);
                    }}
                    className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-pink-100 hover:border-pink-200 bg-white/50 hover:bg-pink-50/30 transition-colors text-left"
                  >
                    <span className="text-sm text-gray-700">
                      {profile?.displayName || user?.name || <span className="text-gray-400">Set display name</span>}
                    </span>
                    <ChevronRight className="h-4 w-4 text-gray-300" />
                  </button>
                )}
              </div>

              {/* Email (read-only) */}
              {user?.email && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                    Email
                  </label>
                  <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-pink-50 bg-gray-50/50">
                    <Mail className="h-4 w-4 text-gray-300" />
                    <span className="text-sm text-gray-500">{user.email}</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Push Notifications Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-strong rounded-2xl border border-pink-100/50 overflow-hidden shadow-md"
          >
            <div className="px-5 py-4 border-b border-pink-50">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-pink-400" />
                <h2 className="font-display font-bold text-gray-700">Push Notifications</h2>
              </div>
            </div>

            <div className="p-5">
              {!pushSupported ? (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <BellOff className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Not supported</p>
                    <p className="text-xs text-gray-400">Your browser doesn't support push notifications</p>
                  </div>
                </div>
              ) : permission === "granted" ? (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                  <BellRing className="h-5 w-5 text-emerald-500" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-700">Notifications enabled</p>
                    <p className="text-xs text-emerald-500">You'll receive push notifications</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-pink-50/50 border border-pink-100">
                    <Smartphone className="h-5 w-5 text-pink-400" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-700">Enable push notifications</p>
                      <p className="text-xs text-gray-400">Get notified about messages and events</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => subscribe().catch(() => toast.error("Failed to enable notifications"))}
                    disabled={pushPending}
                    className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl shadow-lg shadow-pink-200/30 gap-2"
                  >
                    {pushPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <BellRing className="h-4 w-4" />
                        Enable Push Notifications
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </motion.div>

          {/* Notification Preferences Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass-strong rounded-2xl border border-pink-100/50 overflow-hidden shadow-md"
          >
            <div className="px-5 py-4 border-b border-pink-50">
              <div className="flex items-center gap-2">
                <BellRing className="h-4 w-4 text-pink-400" />
                <h2 className="font-display font-bold text-gray-700">Notification Preferences</h2>
              </div>
            </div>

            <div className="divide-y divide-pink-50/80">
              {prefsLoading ? (
                <div className="p-5 flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-pink-300" />
                </div>
              ) : (
                NOTIFICATION_CATEGORIES.map(cat => {
                  const Icon = cat.icon;
                  return (
                    <div key={cat.key} className="px-5 py-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center flex-shrink-0">
                          <Icon className="h-4 w-4 text-pink-400" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-700">{cat.label}</p>
                          <p className="text-xs text-gray-400">{cat.description}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pl-11">
                        {(["inApp", "email", "push"] as const).map(channel => {
                          const enabled = getPref(cat.key, channel);
                          const labels: Record<string, string> = { inApp: "In-app", email: "Email", push: "Push" };
                          return (
                            <button
                              key={channel}
                              onClick={() => togglePref(cat.key, channel)}
                              disabled={upsertPref.isPending}
                              className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                                enabled
                                  ? "bg-pink-100 text-pink-700 border border-pink-200"
                                  : "bg-gray-50 text-gray-400 border border-gray-100"
                              }`}
                            >
                              {labels[channel]}
                              <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${
                                enabled ? "bg-pink-500" : "bg-gray-200"
                              }`}>
                                {enabled && <Check className="h-2 w-2 text-white" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </PageWrapper>
  );
}
