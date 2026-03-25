import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";

export default function ProfileSetup() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const profileQuery = trpc.profile.me.useQuery(undefined, { enabled: isAuthenticated });
  const upsertProfile = trpc.profile.upsert.useMutation();
  const completeSetup = trpc.profile.completeProfileSetup.useMutation();

  const [form, setForm] = useState({
    displayName: "",
    bio: "",
    dateOfBirth: "",
    location: "",
    orientation: "",
    avatarUrl: "",
  });

  const profile = profileQuery.data;

  useEffect(() => {
    if (profileQuery.isLoading) return;
    if (!isAuthenticated) { setLocation("/login"); return; }
    if (profile?.applicationStatus !== "approved") { setLocation("/pending"); return; }
    if (!profile?.waiverSignedAt) { setLocation("/waiver"); return; }
    if (profile?.profileSetupComplete) { setLocation("/dashboard"); return; }
    // Pre-fill existing values
    if (profile) {
      setForm(f => ({
        ...f,
        displayName: profile.displayName ?? "",
        bio: profile.bio ?? "",
        location: profile.location ?? "",
        orientation: profile.orientation ?? "",
        avatarUrl: profile.avatarUrl ?? "",
      }));
    }
  }, [profileQuery.isLoading, isAuthenticated, profile, setLocation]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.displayName.trim()) { toast.error("Display name is required"); return; }

    try {
      await upsertProfile.mutateAsync({
        displayName: form.displayName,
        bio: form.bio || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        location: form.location || undefined,
        orientation: form.orientation || undefined,
        avatarUrl: form.avatarUrl || undefined,
      });
      await completeSetup.mutateAsync();
      await utils.profile.me.invalidate();
      toast.success("Profile complete! Welcome to Soapies! 🎉");
      setLocation("/dashboard");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save profile");
    }
  };

  const isSubmitting = upsertProfile.isPending || completeSetup.isPending;

  if (profileQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-white to-purple-50">
        <Loader2 className="h-8 w-8 text-pink-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg mx-auto"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-400 to-purple-500 items-center justify-center mb-4 shadow-lg shadow-pink-200/40"
          >
            <Sparkles className="h-8 w-8 text-white" />
          </motion.div>
          <h1 className="font-display text-3xl font-black text-gray-800 mb-2">Welcome to Soapies!</h1>
          <p className="text-gray-500 text-sm">Let's finish setting up your profile</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-pink-100/50 shadow-sm p-6 space-y-5">
          {/* Display Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Display Name <span className="text-pink-500">*</span>
            </label>
            <Input
              name="displayName"
              value={form.displayName}
              onChange={handleChange}
              placeholder="How should we call you?"
              className="rounded-xl border-pink-200 focus:border-pink-400"
              required
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Bio</label>
            <textarea
              name="bio"
              value={form.bio}
              onChange={handleChange}
              placeholder="Tell the community a bit about yourself..."
              rows={3}
              className="w-full rounded-xl border border-pink-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-100 px-3 py-2 text-sm resize-none outline-none transition-colors"
            />
          </div>

          {/* Date of Birth */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Date of Birth</label>
            <Input
              name="dateOfBirth"
              type="date"
              value={form.dateOfBirth}
              onChange={handleChange}
              className="rounded-xl border-pink-200 focus:border-pink-400"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Location</label>
            <Input
              name="location"
              value={form.location}
              onChange={handleChange}
              placeholder="City, State"
              className="rounded-xl border-pink-200 focus:border-pink-400"
            />
          </div>

          {/* Orientation */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Orientation</label>
            <select
              name="orientation"
              value={form.orientation}
              onChange={handleChange}
              className="w-full rounded-xl border border-pink-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-100 px-3 py-2 text-sm outline-none transition-colors bg-white"
            >
              <option value="">Select orientation</option>
              <option value="straight">Straight</option>
              <option value="gay">Gay</option>
              <option value="bisexual">Bisexual</option>
              <option value="pansexual">Pansexual</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Avatar URL */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Avatar URL</label>
            <Input
              name="avatarUrl"
              value={form.avatarUrl}
              onChange={handleChange}
              placeholder="https://..."
              className="rounded-xl border-pink-200 focus:border-pink-400"
            />
          </div>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl py-3 font-semibold shadow-lg shadow-pink-200/40 disabled:opacity-50"
            >
              {isSubmitting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                "Complete Profile & Enter Community 🎉"
              )}
            </Button>
          </motion.div>
        </form>
      </motion.div>
    </div>
  );
}
