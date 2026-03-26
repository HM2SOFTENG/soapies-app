import PageWrapper from "@/components/PageWrapper";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Loader2, Camera, Sparkles, Mail, MapPin, Phone, Copy, Shield,
  Edit3, AlertCircle, FileText, Image as ImageIcon, LogOut, Trash2,
  Check, ChevronRight, Heart, Compass, Smile, Lock, Eye, Key, Plus, X,
  Download, Bell
} from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const EDITABLE_FIELDS = [
  { key: "bio", label: "About Me", icon: Edit3, placeholder: "Share your vibe...", type: "textarea" },
  { key: "location", label: "Location", icon: MapPin, placeholder: "City, State", type: "text" },
  { key: "phone", label: "Phone", icon: Phone, placeholder: "+1 (555) 000-0000", type: "text" },
];

const RESTRICTED_FIELDS = [
  { key: "name", label: "Full Name", icon: User, placeholder: "Your full name", type: "text" },
  { key: "dateOfBirth", label: "Date of Birth", icon: Heart, placeholder: "YYYY-MM-DD", type: "date" },
  { key: "gender", label: "Gender", icon: Smile, placeholder: "Your gender", type: "text" },
  { key: "orientation", label: "Orientation", icon: Compass, placeholder: "Your orientation", type: "text" },
];

type TabId = "info" | "account" | "photos" | "danger";

export default function Profile() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("info");
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [requestChangeField, setRequestChangeField] = useState<string | null>(null);
  const [requestChangeValue, setRequestChangeValue] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();

  // Queries
  const { data: profile, isLoading: profileLoading } = trpc.profile.me.useQuery(undefined, {
    retry: false, staleTime: 15_000, refetchOnWindowFocus: false,
  });

  const { data: photos } = trpc.profile.photos.useQuery(undefined, {
    retry: false, staleTime: 15_000, refetchOnWindowFocus: false,
  });

  const { data: pendingRequests } = trpc.changeRequests.pendingProfile.useQuery(undefined, {
    retry: false, staleTime: 15_000, refetchOnWindowFocus: false,
  });

  // Mutations
  const upsertProfile = trpc.profile.upsert.useMutation({
    onSuccess: () => {
      toast.success("Profile updated!", { icon: "✓" });
      utils.profile.me.invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const uploadPhoto = trpc.profile.uploadPhoto.useMutation({
    onSuccess: () => {
      toast.success("Photo uploaded!", { icon: "📸" });
      setUploadingPhoto(false);
      utils.profile.photos.invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deletePhoto = trpc.profile.deletePhoto.useMutation({
    onSuccess: () => {
      toast.success("Photo deleted", { icon: "✓" });
      utils.profile.photos.invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const submitChangeRequest = trpc.changeRequests.submitProfile.useMutation({
    onSuccess: () => {
      toast.success("Change request submitted for review", { icon: "📤" });
      setRequestChangeField(null);
      setRequestChangeValue("");
      utils.changeRequests.pendingProfile.invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => {
      window.location.href = getLoginUrl();
    },
  });

  if (loading || profileLoading) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center min-h-screen">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }}>
            <Loader2 className="h-8 w-8 text-pink-400" />
          </motion.div>
        </div>
      </PageWrapper>
    );
  }

  if (!profile) {
    return (
      <PageWrapper>
        <div className="text-center py-20">
          <p className="text-gray-400">Profile not found</p>
        </div>
      </PageWrapper>
    );
  }

  const memberRoleBadgeColor = {
    pending: "bg-amber-50 text-amber-600 border-amber-100",
    member: "bg-pink-50 text-pink-600 border-pink-100",
    angel: "bg-purple-50 text-purple-600 border-purple-100",
    admin: "bg-indigo-50 text-indigo-600 border-indigo-100",
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      uploadPhoto.mutate({ photoUrl: base64 });
    };
    reader.readAsDataURL(file);
  };

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-sm rounded-2xl border border-pink-100/50 p-8 shadow-lg"
        >
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Avatar */}
            <div className="relative">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-gradient-to-br from-pink-300 to-purple-400 flex items-center justify-center shadow-lg cursor-pointer overflow-hidden"
                onClick={() => fileInputRef.current?.click()}
              >
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl md:text-5xl font-black text-white">
                    {profile.displayName?.charAt(0)?.toUpperCase() || user?.name?.charAt(0)?.toUpperCase() || "?"}
                  </span>
                )}
              </motion.div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-gradient-to-r from-pink-500 to-purple-600 p-3 rounded-full text-white shadow-lg hover:shadow-xl transition-shadow"
              >
                <Camera className="h-5 w-5" />
              </motion.button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
                disabled={uploadingPhoto}
              />
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-black text-gray-800 mb-2">
                {profile.displayName || user?.name || "Anonymous"}
              </h1>
              <div className="flex flex-col md:flex-row gap-3 items-center md:items-start">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border ${memberRoleBadgeColor[(profile.memberRole ?? "pending") as keyof typeof memberRoleBadgeColor] || memberRoleBadgeColor.pending}`}>
                  {profile.memberRole === "angel" && <Heart className="h-3.5 w-3.5" />}
                  {profile.memberRole === "admin" && <Shield className="h-3.5 w-3.5" />}
                  {(profile.memberRole ?? "pending").charAt(0).toUpperCase() + (profile.memberRole ?? "pending").slice(1)}
                </span>
                <span className="text-sm text-gray-500">
                  Member since {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "—"}
                </span>
              </div>
              {profile.bio && (
                <p className="text-gray-600 mt-3 text-sm leading-relaxed">{profile.bio}</p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)} className="w-full">
          <TabsList className="bg-white/70 border border-pink-100/50 backdrop-blur-sm rounded-xl grid w-full grid-cols-4">
            <TabsTrigger value="info" className="gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Info</span>
            </TabsTrigger>
            <TabsTrigger value="photos" className="gap-2">
              <ImageIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Photos</span>
            </TabsTrigger>
            <TabsTrigger value="account" className="gap-2">
              <Lock className="h-4 w-4" />
              <span className="hidden sm:inline">Account</span>
            </TabsTrigger>
            <TabsTrigger value="danger" className="gap-2">
              <AlertCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Danger</span>
            </TabsTrigger>
          </TabsList>

          {/* INFO TAB */}
          <TabsContent value="info" className="space-y-6 mt-6">
            {/* Editable Fields */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-800">Edit Profile</h3>
              {EDITABLE_FIELDS.map((field) => {
                const Icon = field.icon;
                const value = profile[field.key as keyof typeof profile] as string || "";
                return (
                  <motion.div
                    key={field.key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/80 backdrop-blur-sm rounded-xl border border-pink-100/50 p-4 space-y-3"
                  >
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                      <Icon className="h-4 w-4 text-pink-500" />
                      {field.label}
                    </label>
                    {field.type === "textarea" ? (
                      <textarea
                        value={editValues[field.key] ?? value}
                        onChange={(e) => setEditValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        rows={4}
                        className="w-full px-4 py-3 rounded-lg border border-pink-100 bg-white text-sm outline-none focus:border-pink-300 focus:ring-1 focus:ring-pink-200/50 resize-none"
                      />
                    ) : (
                      <input
                        type={field.type}
                        value={editValues[field.key] ?? value}
                        onChange={(e) => setEditValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        className="w-full px-4 py-3 rounded-lg border border-pink-100 bg-white text-sm outline-none focus:border-pink-300 focus:ring-1 focus:ring-pink-200/50"
                      />
                    )}
                    {(editValues[field.key] ?? value) !== value && (
                      <Button
                        size="sm"
                        className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg"
                        onClick={() => {
                          upsertProfile.mutate({ [field.key]: editValues[field.key] || value });
                          setEditValues(prev => {
                            const copy = { ...prev };
                            delete copy[field.key];
                            return copy;
                          });
                        }}
                        disabled={upsertProfile.isPending}
                      >
                        <Check className="h-4 w-4 mr-2" /> Save
                      </Button>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Restricted Fields - Request Change */}
            <div className="space-y-4 pt-6 border-t border-pink-100/50">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                Restricted Fields (Requires Approval)
              </h3>
              {RESTRICTED_FIELDS.map((field) => {
                const Icon = field.icon;
                const rawValue = profile[field.key as keyof typeof profile];
                const value = rawValue instanceof Date
                  ? rawValue.toLocaleDateString()
                  : (rawValue as string) || "—";
                const hasPending = pendingRequests?.some((r: any) => r.fieldName === field.label);
                return (
                  <motion.div
                    key={field.key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/80 backdrop-blur-sm rounded-xl border border-amber-100/50 p-4 space-y-3"
                  >
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                      <Icon className="h-4 w-4 text-amber-500" />
                      {field.label}
                      {hasPending && (
                        <span className="ml-auto text-xs px-2 py-1 rounded-lg bg-amber-50 text-amber-600 font-bold">
                          Pending Review
                        </span>
                      )}
                    </label>
                    <div className="text-sm text-gray-600 px-4 py-3 rounded-lg bg-gray-50 border border-gray-200">
                      Current: <span className="font-mono font-bold text-gray-800">{value}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-amber-200 text-amber-600 hover:bg-amber-50 rounded-lg"
                      onClick={() => setRequestChangeField(field.key)}
                      disabled={hasPending}
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      Request Change
                    </Button>
                  </motion.div>
                );
              })}
            </div>
          </TabsContent>

          {/* PHOTOS TAB */}
          <TabsContent value="photos" className="space-y-6 mt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-800">My Photos</h3>
              <Button
                className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl h-12 gap-2"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
              >
                <Plus className="h-5 w-5" />
                {uploadingPhoto ? "Uploading..." : "Add Photo"}
              </Button>

              {!photos || photos.length === 0 ? (
                <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-xl border border-pink-100/50">
                  <ImageIcon className="h-12 w-12 text-pink-200 mx-auto mb-4" />
                  <p className="text-gray-400">No photos yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {photos.map((photo: any) => (
                    <motion.div
                      key={photo.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative group"
                    >
                      <div className="aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-pink-100 to-purple-100 shadow-md">
                        <img
                          src={photo.photoUrl}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 rounded-xl transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => deletePhoto.mutate({ photoId: photo.id })}
                          className="p-3 bg-red-600 text-white rounded-full hover:bg-red-700"
                        >
                          <Trash2 className="h-5 w-5" />
                        </motion.button>
                      </div>
                      {photo.status !== "approved" && (
                        <div className="absolute top-2 right-2 px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-500 text-white">
                          {photo.status === "pending" ? "Pending" : "Rejected"}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ACCOUNT TAB */}
          <TabsContent value="account" className="space-y-6 mt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-800">Account Settings</h3>

              {/* Email */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/80 backdrop-blur-sm rounded-xl border border-pink-100/50 p-4 space-y-3"
              >
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                  <Mail className="h-4 w-4 text-pink-500" />
                  Email Address
                </label>
                <div className="text-sm text-gray-600 px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 font-mono">
                  {user?.email || "—"}
                </div>
                <p className="text-xs text-gray-400">Email cannot be changed</p>
              </motion.div>

              {/* Community */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/80 backdrop-blur-sm rounded-xl border border-pink-100/50 p-4 space-y-3"
              >
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                  <Sparkles className="h-4 w-4 text-pink-500" />
                  Community
                </label>
                <div className="text-sm text-gray-600 px-4 py-3 rounded-lg bg-gray-50 border border-gray-200">
                  {profile.communityId || "Default"}
                </div>
              </motion.div>

              {/* Push Notifications */}
              <PushNotificationToggle />

              {/* Password Change */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/80 backdrop-blur-sm rounded-xl border border-pink-100/50 p-4 space-y-3"
              >
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                  <Key className="h-4 w-4 text-pink-500" />
                  Password
                </label>
                <Button
                  variant="outline"
                  className="w-full border-pink-200 text-pink-600 hover:bg-pink-50 rounded-lg"
                  disabled
                >
                  Change Password (Coming Soon)
                </Button>
              </motion.div>
            </div>
          </TabsContent>

          {/* DANGER TAB */}
          <TabsContent value="danger" className="space-y-6 mt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-red-600 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Danger Zone
              </h3>

              {/* Deactivate Account */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50/80 backdrop-blur-sm rounded-xl border border-red-200/50 p-6 space-y-4"
              >
                <div>
                  <h4 className="font-bold text-red-700 mb-1">Deactivate Account</h4>
                  <p className="text-sm text-red-600">
                    Deactivating your account will suspend it temporarily. You can reactivate it later.
                  </p>
                </div>
                <Button
                  className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl h-11"
                  disabled
                >
                  Deactivate Account (Coming Soon)
                </Button>
              </motion.div>

              {/* Logout */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/80 backdrop-blur-sm rounded-xl border border-pink-100/50 p-6 space-y-4"
              >
                <div>
                  <h4 className="font-bold text-gray-800 mb-1">Sign Out</h4>
                  <p className="text-sm text-gray-600">Sign out of your account on this device</p>
                </div>
                <Button
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl h-11 gap-2"
                  onClick={() => logout.mutate()}
                  disabled={logout.isPending}
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </motion.div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Change Request Modal */}
      <AnimatePresence>
        {requestChangeField && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setRequestChangeField(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-pink-100/50"
            >
              <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-6 border-b border-pink-100/50">
                <h3 className="text-lg font-bold text-gray-800">
                  Request Change: {RESTRICTED_FIELDS.find(f => f.key === requestChangeField)?.label}
                </h3>
                <p className="text-sm text-gray-500 mt-1">Your request will be reviewed by admins</p>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">New Value</label>
                  <input
                    type={RESTRICTED_FIELDS.find(f => f.key === requestChangeField)?.type || "text"}
                    value={requestChangeValue}
                    onChange={(e) => setRequestChangeValue(e.target.value)}
                    placeholder="Enter new value"
                    className="w-full px-4 py-3 rounded-lg border border-pink-100 bg-white text-sm outline-none focus:border-pink-300 focus:ring-1 focus:ring-pink-200/50"
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 rounded-lg"
                    onClick={() => setRequestChangeField(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg"
                    onClick={() => {
                      if (!requestChangeValue.trim()) {
                        toast.error("Please enter a value");
                        return;
                      }
                      submitChangeRequest.mutate({
                        fieldName: RESTRICTED_FIELDS.find(f => f.key === requestChangeField)?.label || requestChangeField,
                        currentValue: profile[requestChangeField as keyof typeof profile] as string,
                        requestedValue: requestChangeValue,
                      });
                    }}
                    disabled={submitChangeRequest.isPending || !requestChangeValue.trim()}
                  >
                    Submit Request
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageWrapper>
  );
}

function PushNotificationToggle() {
  const { supported, permission, subscribe, isPending } = usePushNotifications();

  if (!supported) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/80 backdrop-blur-sm rounded-xl border border-pink-100/50 p-4 space-y-3"
    >
      <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
        <Bell className="h-4 w-4 text-pink-500" />
        Push Notifications
      </label>
      {permission === 'granted' ? (
        <p className="text-sm text-green-600 flex items-center gap-2">
          <Check className="h-4 w-4" /> Push notifications are enabled
        </p>
      ) : (
        <>
          <p className="text-xs text-gray-500">
            Enable push notifications to get instant alerts for event updates, reservation confirmations, and more.
          </p>
          <Button
            onClick={() => subscribe().then(() => toast.success('Push notifications enabled!')).catch((e: any) => toast.error(e.message || 'Failed to enable push'))}
            disabled={isPending || permission === 'denied'}
            size="sm"
            className="bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Bell className="h-4 w-4 mr-1" />}
            {permission === 'denied' ? 'Notifications Blocked' : 'Enable Push Notifications'}
          </Button>
          {permission === 'denied' && (
            <p className="text-xs text-red-500">Push notifications are blocked. Please enable them in your browser settings.</p>
          )}
        </>
      )}
    </motion.div>
  );
}
