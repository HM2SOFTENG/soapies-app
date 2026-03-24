import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Check, Upload, X, Camera, Sparkles,
  User, Heart, MapPin, Image as ImageIcon, Shield, PartyPopper,
  Loader2, CheckCircle2
} from "lucide-react";
import { useState, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663460303717/FfTbhpP94ZvscRd7twWNT6/soapies-logo_cf3c72b2.png";

const STEPS = [
  { id: 1, title: "Welcome", subtitle: "Let's get to know you", icon: User },
  { id: 2, title: "About You", subtitle: "Tell us more", icon: Heart },
  { id: 3, title: "Photos", subtitle: "Show your best self", icon: Camera },
  { id: 4, title: "Preferences", subtitle: "What are you into?", icon: Sparkles },
  { id: 5, title: "Submit", subtitle: "Almost there!", icon: Shield },
];

const INTERESTS = [
  "House Parties", "Raves", "Beach Events", "Pool Parties",
  "Dance", "Music", "Socializing", "Networking",
  "Fitness", "Travel", "Art", "Photography",
  "Cooking", "Gaming", "Yoga", "Meditation",
];

const LOOKING_FOR = [
  "New Friends", "Social Events", "Couples Community",
  "Dating", "Networking", "Adventure", "Fun Nights Out",
  "Like-minded People",
];

export default function Apply() {
  const { user, isAuthenticated, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [form, setForm] = useState({
    displayName: "",
    gender: "",
    dateOfBirth: "",
    bio: "",
    orientation: "",
    relationshipStatus: "",
    location: "",
    phone: "",
    communityId: "",
    interests: [] as string[],
    lookingFor: [] as string[],
    agreeGuidelines: false,
    agreeWaiver: false,
  });

  // Photos state
  const [photos, setPhotos] = useState<{ id?: number; url: string; uploading?: boolean }[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // tRPC mutations
  const upsertProfile = trpc.profile.upsert.useMutation();
  const uploadPhotoMutation = trpc.profile.uploadPhoto.useMutation();
  const deletePhotoMutation = trpc.profile.deletePhoto.useMutation();
  const submitApplication = trpc.profile.submitApplication.useMutation();
  const existingProfile = trpc.profile.me.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const existingPhotos = trpc.profile.photos.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  // Pre-fill form from existing profile
  const profileLoaded = useRef(false);
  if (existingProfile.data && !profileLoaded.current) {
    profileLoaded.current = true;
    const p = existingProfile.data;
    if (p.applicationStatus === "submitted" || p.applicationStatus === "approved") {
      // Already submitted
    }
    setForm(prev => ({
      ...prev,
      displayName: p.displayName || user?.name || "",
      gender: p.gender || "",
      dateOfBirth: p.dateOfBirth ? new Date(p.dateOfBirth).toISOString().split("T")[0] : "",
      bio: p.bio || "",
      orientation: p.orientation || "",
      location: p.location || "",
      phone: p.phone || "",
      communityId: p.communityId || "",
      interests: (p.preferences as any)?.interests || [],
      lookingFor: (p.preferences as any)?.lookingFor || [],
    }));
  }

  if (existingPhotos.data && existingPhotos.data.length > 0 && photos.length === 0) {
    setPhotos(existingPhotos.data.map((p: any) => ({ id: p.id, url: p.photoUrl })));
  }

  const updateField = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (field: "interests" | "lookingFor", item: string) => {
    setForm(prev => ({
      ...prev,
      [field]: prev[field].includes(item)
        ? prev[field].filter(i => i !== item)
        : [...prev[field], item],
    }));
  };

  // Photo upload
  const handlePhotoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      if (photos.length >= 6) {
        toast.error("Maximum 6 photos allowed");
        break;
      }

      const tempUrl = URL.createObjectURL(file);
      const tempIdx = photos.length;
      setPhotos(prev => [...prev, { url: tempUrl, uploading: true }]);
      setUploadingPhoto(true);

      try {
        // Upload to S3
        const res = await fetch("/api/upload-photo", {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
          credentials: "include",
        });
        const { url } = await res.json();

        // Save to DB
        const result = await uploadPhotoMutation.mutateAsync({
          photoUrl: url,
          sortOrder: tempIdx,
        });

        setPhotos(prev =>
          prev.map((p, i) =>
            p.url === tempUrl ? { id: result.photoId ?? undefined, url, uploading: false } : p
          )
        );
        toast.success("Photo uploaded!");
      } catch (err) {
        setPhotos(prev => prev.filter(p => p.url !== tempUrl));
        toast.error("Failed to upload photo");
      } finally {
        setUploadingPhoto(false);
      }
    }
    e.target.value = "";
  }, [photos, uploadPhotoMutation]);

  const removePhoto = async (index: number) => {
    const photo = photos[index];
    if (photo.id) {
      try {
        await deletePhotoMutation.mutateAsync({ photoId: photo.id });
      } catch (err) {
        toast.error("Failed to remove photo");
        return;
      }
    }
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // Save progress on step change
  const saveProgress = async () => {
    if (!isAuthenticated) return;
    try {
      await upsertProfile.mutateAsync({
        displayName: form.displayName || undefined,
        gender: form.gender || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        bio: form.bio || undefined,
        orientation: form.orientation || undefined,
        location: form.location || undefined,
        phone: form.phone || undefined,
        communityId: form.communityId || undefined,
      });
    } catch (err) {
      // Silent save
    }
  };

  const nextStep = async () => {
    // Validate current step
    if (step === 1) {
      if (!form.displayName.trim()) { toast.error("Please enter your display name"); return; }
      if (!form.gender) { toast.error("Please select your gender"); return; }
      if (!form.dateOfBirth) { toast.error("Please enter your date of birth"); return; }
    }
    if (step === 2) {
      if (!form.bio.trim() || form.bio.length < 20) { toast.error("Please write at least 20 characters about yourself"); return; }
      if (!form.location.trim()) { toast.error("Please enter your location"); return; }
    }
    if (step === 3) {
      if (photos.length < 1) { toast.error("Please upload at least 1 photo"); return; }
    }
    if (step === 4) {
      if (form.interests.length < 2) { toast.error("Please select at least 2 interests"); return; }
    }

    await saveProgress();
    setStep(prev => Math.min(prev + 1, 5));
  };

  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  // Final submission
  const handleSubmit = async () => {
    if (!form.agreeGuidelines || !form.agreeWaiver) {
      toast.error("Please agree to the community guidelines and waiver");
      return;
    }

    setSubmitting(true);
    try {
      // Save final profile with preferences
      await upsertProfile.mutateAsync({
        displayName: form.displayName,
        gender: form.gender,
        dateOfBirth: form.dateOfBirth,
        bio: form.bio,
        orientation: form.orientation,
        location: form.location,
        phone: form.phone,
        communityId: form.communityId,
      });

      await submitApplication.mutateAsync();
      setSubmitted(true);
      toast.success("Application submitted successfully!");
    } catch (err) {
      toast.error("Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  };

  // Check if already submitted
  if (existingProfile.data?.applicationStatus === "submitted" || existingProfile.data?.applicationStatus === "under_review") {
    return <ApplicationStatus status="pending" />;
  }
  if (existingProfile.data?.applicationStatus === "approved") {
    return <ApplicationStatus status="approved" />;
  }
  if (existingProfile.data?.applicationStatus === "rejected") {
    return <ApplicationStatus status="rejected" />;
  }
  if (existingProfile.data?.applicationStatus === "waitlisted") {
    return <ApplicationStatus status="waitlisted" />;
  }

  if (submitted) {
    return <ApplicationStatus status="pending" />;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-white to-purple-50">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
          <Loader2 className="h-8 w-8 text-pink-500" />
        </motion.div>
      </div>
    );
  }

  const progress = (step / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 20, repeat: Infinity }}
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-pink-200/30 blur-3xl"
        />
        <motion.div
          animate={{ x: [0, -20, 0], y: [0, 30, 0] }}
          transition={{ duration: 25, repeat: Infinity }}
          className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-purple-200/30 blur-3xl"
        />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-6 sm:py-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <motion.img
            src={LOGO_URL}
            alt="Soapies"
            className="h-14 w-14 mx-auto mb-3 rounded-2xl"
            whileHover={{ rotate: [0, -5, 5, 0] }}
          />
          <h1 className="font-display text-2xl sm:text-3xl font-black text-gradient">
            Join Soapies
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Complete your application to become a member
          </p>
        </motion.div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            {STEPS.map((s, i) => {
              const StepIcon = s.icon;
              const isActive = step === s.id;
              const isComplete = step > s.id;
              return (
                <motion.button
                  key={s.id}
                  onClick={() => s.id < step && setStep(s.id)}
                  disabled={s.id > step}
                  whileHover={s.id <= step ? { scale: 1.1 } : {}}
                  whileTap={s.id <= step ? { scale: 0.95 } : {}}
                  className="flex flex-col items-center gap-1 relative"
                >
                  <motion.div
                    animate={{
                      scale: isActive ? 1.15 : 1,
                      boxShadow: isActive ? "0 0 20px rgba(236,72,153,0.3)" : "none",
                    }}
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                      isComplete
                        ? "bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-lg"
                        : isActive
                        ? "bg-gradient-to-br from-pink-500 to-purple-600 text-white shadow-lg"
                        : "bg-white/80 border border-gray-200 text-gray-400"
                    }`}
                  >
                    {isComplete ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <StepIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                    )}
                  </motion.div>
                  <span className={`text-[10px] sm:text-xs font-semibold hidden sm:block ${
                    isActive ? "text-pink-600" : isComplete ? "text-green-600" : "text-gray-400"
                  }`}>
                    {s.title}
                  </span>
                </motion.button>
              );
            })}
          </div>
          {/* Progress line */}
          <div className="relative h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 rounded-full"
            />
            <motion.div
              animate={{ left: `${progress - 2}%`, opacity: progress > 5 ? 1 : 0 }}
              transition={{ duration: 0.5 }}
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-pink-500 shadow-md"
            />
          </div>
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 40, filter: "blur(4px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: -40, filter: "blur(4px)" }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/50 shadow-xl p-6 sm:p-8">
              {/* Step header */}
              <div className="mb-6">
                <h2 className="font-display text-xl sm:text-2xl font-bold text-gray-800">
                  {STEPS[step - 1].title}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {STEPS[step - 1].subtitle}
                </p>
              </div>

              {/* ─── STEP 1: WELCOME & BASIC INFO ─── */}
              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Display Name *</label>
                    <Input
                      value={form.displayName}
                      onChange={e => updateField("displayName", e.target.value)}
                      placeholder="What should we call you?"
                      className="h-12 rounded-xl border-gray-200 bg-white/80 focus:border-pink-400 focus:ring-pink-400/20 text-base"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Gender *</label>
                    <Select value={form.gender} onValueChange={v => updateField("gender", v)}>
                      <SelectTrigger className="h-12 rounded-xl border-gray-200 bg-white/80">
                        <SelectValue placeholder="Select your gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="non-binary">Non-binary</SelectItem>
                        <SelectItem value="trans-male">Trans Male</SelectItem>
                        <SelectItem value="trans-female">Trans Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                        <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Date of Birth *</label>
                    <Input
                      type="date"
                      value={form.dateOfBirth}
                      onChange={e => updateField("dateOfBirth", e.target.value)}
                      className="h-12 rounded-xl border-gray-200 bg-white/80 focus:border-pink-400 focus:ring-pink-400/20"
                    />
                    <p className="text-xs text-muted-foreground mt-1">You must be 21+ to join Soapies</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                    <Input
                      value={form.phone}
                      onChange={e => updateField("phone", e.target.value)}
                      placeholder="(555) 123-4567"
                      className="h-12 rounded-xl border-gray-200 bg-white/80 focus:border-pink-400 focus:ring-pink-400/20"
                    />
                  </div>
                </div>
              )}

              {/* ─── STEP 2: ABOUT YOU ─── */}
              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">About You *</label>
                    <Textarea
                      value={form.bio}
                      onChange={e => updateField("bio", e.target.value)}
                      placeholder="Tell us about yourself, what makes you unique, and why you want to join Soapies..."
                      rows={5}
                      className="rounded-xl border-gray-200 bg-white/80 focus:border-pink-400 focus:ring-pink-400/20 text-base resize-none"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {form.bio.length}/500 characters (min 20)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Orientation</label>
                    <Select value={form.orientation} onValueChange={v => updateField("orientation", v)}>
                      <SelectTrigger className="h-12 rounded-xl border-gray-200 bg-white/80">
                        <SelectValue placeholder="Select your orientation" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="straight">Straight</SelectItem>
                        <SelectItem value="gay">Gay</SelectItem>
                        <SelectItem value="lesbian">Lesbian</SelectItem>
                        <SelectItem value="bisexual">Bisexual</SelectItem>
                        <SelectItem value="pansexual">Pansexual</SelectItem>
                        <SelectItem value="queer">Queer</SelectItem>
                        <SelectItem value="asexual">Asexual</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                        <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Relationship Status</label>
                    <Select value={form.relationshipStatus} onValueChange={v => updateField("relationshipStatus", v)}>
                      <SelectTrigger className="h-12 rounded-xl border-gray-200 bg-white/80">
                        <SelectValue placeholder="Select your status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Single</SelectItem>
                        <SelectItem value="in-a-relationship">In a Relationship</SelectItem>
                        <SelectItem value="married">Married</SelectItem>
                        <SelectItem value="open-relationship">Open Relationship</SelectItem>
                        <SelectItem value="its-complicated">It's Complicated</SelectItem>
                        <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Location *</label>
                    <Input
                      value={form.location}
                      onChange={e => updateField("location", e.target.value)}
                      placeholder="City, State"
                      className="h-12 rounded-xl border-gray-200 bg-white/80 focus:border-pink-400 focus:ring-pink-400/20"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Community</label>
                    <Select value={form.communityId} onValueChange={v => updateField("communityId", v)}>
                      <SelectTrigger className="h-12 rounded-xl border-gray-200 bg-white/80">
                        <SelectValue placeholder="Which community are you interested in?" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="soapies">Soapies (Main Community)</SelectItem>
                        <SelectItem value="groupies">Groupies</SelectItem>
                        <SelectItem value="gaypeez">Gaypeez</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* ─── STEP 3: PHOTOS ─── */}
              {step === 3 && (
                <div className="space-y-5">
                  <p className="text-sm text-muted-foreground">
                    Upload 1-6 photos of yourself. Clear face photos help your application get approved faster.
                  </p>

                  <div className="grid grid-cols-3 gap-3">
                    {photos.map((photo, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative aspect-square rounded-2xl overflow-hidden group"
                      >
                        {photo.uploading ? (
                          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                            <Loader2 className="h-6 w-6 text-pink-500 animate-spin" />
                          </div>
                        ) : (
                          <>
                            <img src={photo.url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all" />
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => removePhoto(i)}
                              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                            >
                              <X className="h-3.5 w-3.5" />
                            </motion.button>
                            {i === 0 && (
                              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 text-white text-[10px] font-bold">
                                PRIMARY
                              </div>
                            )}
                          </>
                        )}
                      </motion.div>
                    ))}

                    {photos.length < 6 && (
                      <motion.button
                        whileHover={{ scale: 1.03, borderColor: "rgb(236,72,153)" }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingPhoto}
                        className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 bg-white/50 flex flex-col items-center justify-center gap-2 hover:bg-pink-50/50 transition-all cursor-pointer"
                      >
                        {uploadingPhoto ? (
                          <Loader2 className="h-6 w-6 text-pink-500 animate-spin" />
                        ) : (
                          <>
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center">
                              <Upload className="h-5 w-5 text-pink-500" />
                            </div>
                            <span className="text-xs font-semibold text-gray-500">Add Photo</span>
                          </>
                        )}
                      </motion.button>
                    )}
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />

                  <div className="p-4 rounded-2xl bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-100/50">
                    <div className="flex items-start gap-3">
                      <ImageIcon className="h-5 w-5 text-pink-500 mt-0.5 shrink-0" />
                      <div className="text-xs text-gray-600 space-y-1">
                        <p className="font-semibold text-gray-700">Photo Tips:</p>
                        <p>Use clear, well-lit photos showing your face</p>
                        <p>Include at least one full-body photo</p>
                        <p>Avoid group photos as your primary image</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── STEP 4: PREFERENCES ─── */}
              {step === 4 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Interests * <span className="text-muted-foreground font-normal">(select at least 2)</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {INTERESTS.map(interest => {
                        const selected = form.interests.includes(interest);
                        return (
                          <motion.button
                            key={interest}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => toggleArrayItem("interests", interest)}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                              selected
                                ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md"
                                : "bg-white/80 border border-gray-200 text-gray-600 hover:border-pink-300 hover:bg-pink-50"
                            }`}
                          >
                            {interest}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      What are you looking for?
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {LOOKING_FOR.map(item => {
                        const selected = form.lookingFor.includes(item);
                        return (
                          <motion.button
                            key={item}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => toggleArrayItem("lookingFor", item)}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                              selected
                                ? "bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md"
                                : "bg-white/80 border border-gray-200 text-gray-600 hover:border-purple-300 hover:bg-purple-50"
                            }`}
                          >
                            {item}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ─── STEP 5: REVIEW & SUBMIT ─── */}
              {step === 5 && (
                <div className="space-y-5">
                  {/* Review summary */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-pink-50 to-purple-50 border border-pink-100/50 space-y-3">
                    <h3 className="font-display font-bold text-gray-800">Application Summary</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Name:</span>
                        <p className="font-semibold text-gray-800">{form.displayName}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Gender:</span>
                        <p className="font-semibold text-gray-800 capitalize">{form.gender.replace("-", " ")}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Location:</span>
                        <p className="font-semibold text-gray-800">{form.location}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Photos:</span>
                        <p className="font-semibold text-gray-800">{photos.length} uploaded</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Interests:</span>
                        <p className="font-semibold text-gray-800">{form.interests.join(", ")}</p>
                      </div>
                    </div>
                  </div>

                  {/* Photo preview strip */}
                  {photos.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {photos.map((photo, i) => (
                        <img
                          key={i}
                          src={photo.url}
                          alt={`Photo ${i + 1}`}
                          className="w-16 h-16 rounded-xl object-cover shrink-0 border-2 border-white shadow-md"
                        />
                      ))}
                    </div>
                  )}

                  {/* Community Guidelines */}
                  <div className="p-4 rounded-2xl bg-white/80 border border-gray-200 space-y-3">
                    <h3 className="font-display font-bold text-gray-800 flex items-center gap-2">
                      <Shield className="h-5 w-5 text-purple-500" />
                      Community Guidelines
                    </h3>
                    <div className="text-xs text-gray-600 space-y-2 max-h-40 overflow-y-auto pr-2">
                      <p>By joining Soapies, you agree to:</p>
                      <p>1. Treat all members with respect and dignity</p>
                      <p>2. Maintain confidentiality about other members</p>
                      <p>3. Respect boundaries and consent at all times</p>
                      <p>4. Not share photos or information about events without permission</p>
                      <p>5. Follow all event-specific rules and guidelines</p>
                      <p>6. Report any inappropriate behavior to event organizers</p>
                      <p>7. Be honest in your profile and application</p>
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => updateField("agreeGuidelines", !form.agreeGuidelines)}
                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                          form.agreeGuidelines
                            ? "bg-gradient-to-br from-pink-500 to-purple-600 border-pink-500 text-white"
                            : "border-gray-300 bg-white"
                        }`}
                      >
                        {form.agreeGuidelines && <Check className="h-3.5 w-3.5" />}
                      </motion.button>
                      <span className="text-sm font-semibold text-gray-700">
                        I agree to the Community Guidelines *
                      </span>
                    </label>
                  </div>

                  {/* Waiver */}
                  <div className="p-4 rounded-2xl bg-white/80 border border-gray-200 space-y-3">
                    <h3 className="font-display font-bold text-gray-800 flex items-center gap-2">
                      <Shield className="h-5 w-5 text-indigo-500" />
                      Liability Waiver
                    </h3>
                    <div className="text-xs text-gray-600 space-y-2 max-h-32 overflow-y-auto pr-2">
                      <p>I understand that participation in Soapies events is voluntary and at my own risk. I release Soapies, its organizers, and venue owners from any liability for injuries, damages, or losses that may occur during events.</p>
                      <p>I confirm that I am at least 21 years of age and legally able to consent to participation in community activities.</p>
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => updateField("agreeWaiver", !form.agreeWaiver)}
                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                          form.agreeWaiver
                            ? "bg-gradient-to-br from-purple-500 to-indigo-600 border-purple-500 text-white"
                            : "border-gray-300 bg-white"
                        }`}
                      >
                        {form.agreeWaiver && <Check className="h-3.5 w-3.5" />}
                      </motion.button>
                      <span className="text-sm font-semibold text-gray-700">
                        I agree to the Liability Waiver *
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-between mt-6 gap-4"
        >
          {step > 1 ? (
            <motion.button
              whileHover={{ scale: 1.02, x: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={prevStep}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/80 border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-all"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setLocation("/")}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/80 border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-all"
            >
              <ArrowLeft className="h-4 w-4" /> Home
            </motion.button>
          )}

          {step < 5 ? (
            <motion.button
              whileHover={{ scale: 1.02, x: 2 }}
              whileTap={{ scale: 0.98 }}
              onClick={nextStep}
              disabled={upsertProfile.isPending}
              className="flex items-center gap-2 px-6 py-3 rounded-xl btn-premium text-sm font-bold shadow-lg disabled:opacity-50"
            >
              {upsertProfile.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Continue <ArrowRight className="h-4 w-4" />
                </>
              )}
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSubmit}
              disabled={submitting || !form.agreeGuidelines || !form.agreeWaiver}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-bold shadow-lg hover:shadow-xl disabled:opacity-50 transition-all"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <PartyPopper className="h-4 w-4" /> Submit Application
                </>
              )}
            </motion.button>
          )}
        </motion.div>

        {/* Step counter */}
        <p className="text-center text-xs text-muted-foreground mt-4">
          Step {step} of {STEPS.length}
        </p>
      </div>
    </div>
  );
}

// ─── APPLICATION STATUS PAGE ─────────────────────────────────────────────────

function ApplicationStatus({ status }: { status: "pending" | "approved" | "rejected" | "waitlisted" }) {
  const [, setLocation] = useLocation();

  const config = {
    pending: {
      icon: Loader2,
      iconClass: "text-amber-500 animate-spin",
      bgClass: "from-amber-50 to-orange-50",
      borderClass: "border-amber-200",
      title: "Application Under Review",
      description: "Your application has been submitted and is being reviewed by our team. We'll notify you once a decision has been made. This usually takes 24-48 hours.",
      action: null,
    },
    approved: {
      icon: CheckCircle2,
      iconClass: "text-green-500",
      bgClass: "from-green-50 to-emerald-50",
      borderClass: "border-green-200",
      title: "Welcome to Soapies!",
      description: "Congratulations! Your application has been approved. You're now a member of the Soapies community. Explore events, connect with other members, and have an amazing time!",
      action: () => setLocation("/dashboard"),
    },
    rejected: {
      icon: X,
      iconClass: "text-red-500",
      bgClass: "from-red-50 to-pink-50",
      borderClass: "border-red-200",
      title: "Application Not Approved",
      description: "Unfortunately, your application was not approved at this time. This could be due to incomplete information or not meeting our community requirements. You may reapply after 30 days.",
      action: null,
    },
    waitlisted: {
      icon: Sparkles,
      iconClass: "text-purple-500",
      bgClass: "from-purple-50 to-indigo-50",
      borderClass: "border-purple-200",
      title: "You're on the Waitlist",
      description: "Your application looks great! We've placed you on our waitlist and will reach out when a spot opens up. Stay tuned!",
      action: null,
    },
  };

  const c = config[status];
  const Icon = c.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <div className={`p-8 rounded-3xl bg-gradient-to-br ${c.bgClass} border ${c.borderClass} text-center`}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="w-20 h-20 rounded-2xl bg-white/80 flex items-center justify-center mx-auto mb-6 shadow-lg"
          >
            <Icon className={`h-10 w-10 ${c.iconClass}`} />
          </motion.div>

          <h1 className="font-display text-2xl font-black text-gray-800 mb-3">{c.title}</h1>
          <p className="text-sm text-gray-600 leading-relaxed mb-6">{c.description}</p>

          {c.action && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={c.action}
              className="btn-premium px-8 py-3 rounded-xl text-sm font-bold shadow-lg"
            >
              Go to Dashboard
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setLocation("/")}
            className="block mx-auto mt-4 text-sm font-semibold text-gray-500 hover:text-pink-500 transition-colors"
          >
            Back to Home
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
