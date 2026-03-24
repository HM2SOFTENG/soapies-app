import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useLocation, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { FloatingBubbles, MorphBlob, GlowOrb } from "@/components/FloatingElements";
import {
  Sparkles,
  Mail,
  ShieldCheck,
  User,
  Camera,
  Heart,
  Shield,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Check,
  X,
  Eye,
  EyeOff,
  Upload,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663460303717/FfTbhpP94ZvscRd7twWNT6/soapies-logo_cf3c72b2.png";

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

const STEPS = [
  { id: 1, title: "Welcome", icon: Sparkles },
  { id: 2, title: "Create Account", icon: Mail },
  { id: 3, title: "Verify Email", icon: ShieldCheck },
  { id: 4, title: "About You", icon: User },
  { id: 5, title: "Photos", icon: Camera },
  { id: 6, title: "Preferences", icon: Heart },
  { id: 7, title: "Review & Submit", icon: Shield },
];

const getPasswordStrength = (password: string): { strength: "weak" | "medium" | "strong"; percentage: number } => {
  if (password.length < 8) return { strength: "weak", percentage: 20 };
  if (password.length < 12) return { strength: "medium", percentage: 60 };
  if (/[A-Z]/.test(password) && /[0-9!@#$%^&*]/.test(password)) {
    return { strength: "strong", percentage: 100 };
  }
  return { strength: "medium", percentage: 60 };
};

const PasswordStrengthIndicator = ({ password }: { password: string }) => {
  const { strength, percentage } = getPasswordStrength(password);

  const strengthColor = {
    weak: "bg-red-400",
    medium: "bg-yellow-400",
    strong: "bg-green-400",
  };

  const strengthLabel = {
    weak: "Weak",
    medium: "Medium",
    strong: "Strong",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="space-y-2"
    >
      <div className="flex justify-between items-center">
        <span className="text-xs font-medium text-gray-400">Password Strength</span>
        <span className={`text-xs font-semibold ${
          strength === "weak" ? "text-red-400" :
          strength === "medium" ? "text-yellow-400" :
          "text-green-400"
        }`}>
          {strengthLabel[strength]}
        </span>
      </div>
      <motion.div
        className="h-1.5 bg-gray-700 rounded-full overflow-hidden"
        layoutId="strength-bar"
      >
        <motion.div
          className={`h-full ${strengthColor[strength]}`}
          initial={{ width: "0%" }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </motion.div>
    </motion.div>
  );
};

const ConfettiPiece = ({ delay }: { delay: number }) => {
  return (
    <motion.div
      initial={{ opacity: 1, y: 0, x: 0, rotate: 0 }}
      animate={{ opacity: 0, y: 100, x: (Math.random() - 0.5) * 100, rotate: 360 }}
      transition={{ duration: 1, delay, ease: "easeIn" }}
      className="absolute w-2 h-2 pointer-events-none"
      style={{
        left: `${Math.random() * 100}%`,
        top: "50%",
        background: Math.random() > 0.5 ? "#ec4899" : "#a855f7",
        borderRadius: Math.random() > 0.5 ? "50%" : "0%",
      }}
    />
  );
};

const SuccessOverlay = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center"
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="relative"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 opacity-75 blur-xl"
        />
        <div className="relative bg-gray-950 rounded-full p-8 flex items-center justify-center border border-pink-500/50">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
          >
            <Check className="w-12 h-12 text-green-400" />
          </motion.div>
        </div>
      </motion.div>

      {Array.from({ length: 12 }).map((_, i) => (
        <ConfettiPiece key={i} delay={i * 0.1} />
      ))}
    </motion.div>
  );
};

interface PhotoUpload {
  id?: number;
  url: string;
  uploading?: boolean;
}

interface JoinFormState {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  termsAccepted: boolean;
  displayName: string;
  gender: string;
  dateOfBirth: string;
  bio: string;
  orientation: string;
  relationshipStatus: string;
  location: string;
  community: string;
  phone: string;
  interests: string[];
  lookingFor: string[];
  agreeGuidelines: boolean;
  agreeWaiver: boolean;
}

export default function JoinFlow() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [emailVerified, setEmailVerified] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [canResend, setCanResend] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<JoinFormState>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    termsAccepted: false,
    displayName: "",
    gender: "",
    dateOfBirth: "",
    bio: "",
    orientation: "",
    relationshipStatus: "",
    location: "",
    community: "",
    phone: "",
    interests: [],
    lookingFor: [],
    agreeGuidelines: false,
    agreeWaiver: false,
  });

  const [photos, setPhotos] = useState<PhotoUpload[]>([]);

  // tRPC mutations
  const registerMutation = trpc.auth.register.useMutation();
  const verifyEmailMutation = trpc.auth.verifyEmail.useMutation();
  const resendEmailMutation = trpc.auth.resendEmailVerification.useMutation();
  const upsertProfile = trpc.profile.upsert.useMutation();
  const uploadPhotoMutation = trpc.profile.uploadPhoto.useMutation();
  const deletePhotoMutation = trpc.profile.deletePhoto.useMutation();
  const submitApplication = trpc.profile.submitApplication.useMutation();

  // Resend countdown timer
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (resendCountdown === 0 && !canResend && userEmail) {
      setCanResend(true);
    }
  }, [resendCountdown, canResend, userEmail]);

  // Step navigation
  const handleNext = useCallback(() => {
    setDirection("forward");
    setStep(prev => Math.min(prev + 1, 7));
  }, []);

  const handleBack = useCallback(() => {
    setDirection("backward");
    setStep(prev => Math.max(prev - 1, 1));
  }, []);

  const handleFormChange = useCallback((field: keyof JoinFormState, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  // Step 1: Welcome
  const handleWelcome = () => {
    handleNext();
  };

  // Step 2: Create Account
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!form.email.trim()) {
      toast.error("Email is required");
      return;
    }
    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (!form.termsAccepted) {
      toast.error("You must agree to the terms");
      return;
    }

    try {
      await registerMutation.mutateAsync({
        name: form.name,
        email: form.email,
        password: form.password,
      });
      setUserEmail(form.email);
      handleNext();
    } catch (error: any) {
      toast.error(error.message || "Registration failed");
    }
  };

  // Step 3: Verify Email
  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 6) {
      toast.error("Please enter a valid 6-digit code");
      return;
    }

    try {
      await verifyEmailMutation.mutateAsync({ email: userEmail, code: otpCode });
      setEmailVerified(true);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        handleNext();
      }, 1500);
    } catch (error: any) {
      toast.error(error.message || "Verification failed");
    }
  };

  const handleResendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await resendEmailMutation.mutateAsync({ email: userEmail });
      toast.success("Verification code sent!");
      setCanResend(false);
      setResendCountdown(60);
    } catch (error: any) {
      toast.error(error.message || "Failed to resend code");
    }
  };

  // Step 4: About You
  const handleAboutYouNext = () => {
    if (!form.displayName.trim()) {
      toast.error("Display name is required");
      return;
    }
    if (!form.gender) {
      toast.error("Please select your gender");
      return;
    }
    if (!form.dateOfBirth) {
      toast.error("Date of birth is required");
      return;
    }
    if (!form.orientation) {
      toast.error("Please select your orientation");
      return;
    }
    if (!form.relationshipStatus) {
      toast.error("Please select your relationship status");
      return;
    }
    if (!form.location.trim()) {
      toast.error("Location is required");
      return;
    }
    if (!form.community) {
      toast.error("Please select a community");
      return;
    }
    handleNext();
  };

  // Step 5: Photos
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    if (photos.length >= 6) {
      toast.error("Maximum 6 photos allowed");
      return;
    }

    const file = e.target.files[0];
    if (!file) return;

    try {
      setPhotos(prev => [...prev, { url: "", uploading: true }]);

      const response = await fetch("/api/upload-photo", {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      const photoUrl = data.url;

      const photoRecord = await uploadPhotoMutation.mutateAsync({ photoUrl, sortOrder: photos.length - 1 });

      setPhotos(prev => [
        ...prev.slice(0, -1),
        { id: photoRecord.photoId ?? undefined, url: photoUrl, uploading: false }
      ]);

      toast.success("Photo uploaded!");
    } catch (error: any) {
      toast.error(error.message || "Photo upload failed");
      setPhotos(prev => prev.filter(p => p.uploading !== true));
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemovePhoto = async (index: number) => {
    const photo = photos[index];
    if (photo.id) {
      try {
        await deletePhotoMutation.mutateAsync({ photoId: photo.id });
      } catch (error: any) {
        toast.error(error.message || "Failed to remove photo");
        return;
      }
    }
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // Step 6: Preferences
  const toggleInterest = (interest: string) => {
    setForm(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const toggleLookingFor = (tag: string) => {
    setForm(prev => ({
      ...prev,
      lookingFor: prev.lookingFor.includes(tag)
        ? prev.lookingFor.filter(t => t !== tag)
        : [...prev.lookingFor, tag]
    }));
  };

  const handlePreferencesNext = () => {
    if (form.interests.length === 0) {
      toast.error("Please select at least one interest");
      return;
    }
    if (form.lookingFor.length === 0) {
      toast.error("Please select at least one thing you're looking for");
      return;
    }
    handleNext();
  };

  // Step 7: Review & Submit
  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.agreeGuidelines || !form.agreeWaiver) {
      toast.error("You must agree to the guidelines and waiver");
      return;
    }

    setSubmitting(true);

    try {
      await upsertProfile.mutateAsync({
        displayName: form.displayName,
        gender: form.gender,
        dateOfBirth: form.dateOfBirth,
        bio: form.bio,
        orientation: form.orientation,
        location: form.location,
        phone: form.phone,
        communityId: form.community,
      });

      await submitApplication.mutateAsync();

      setSubmitted(true);
      toast.success("Application submitted successfully!");
    } catch (error: any) {
      setSubmitting(false);
      toast.error(error.message || "Failed to submit application");
    }
  };

  // Determine theme
  const isDarkTheme = step <= 3;

  // Slide transition variants
  const slideVariants = {
    enter: (dir: "forward" | "backward") => ({
      x: dir === "forward" ? 1000 : -1000,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (dir: "forward" | "backward") => ({
      zIndex: 0,
      x: dir === "forward" ? -1000 : 1000,
      opacity: 0,
    }),
  };

  // Show application submitted state
  if (submitted) {
    return <ApplicationStatus />;
  }

  return (
    <div className={`relative min-h-screen overflow-hidden transition-colors duration-700 ${
      isDarkTheme
        ? "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"
        : "bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50"
    }`}>
      {/* Background elements */}
      <div className="fixed inset-0 pointer-events-none">
        {isDarkTheme ? (
          <>
            <FloatingBubbles />
            <MorphBlob className="absolute top-20 right-10 opacity-40" />
            <MorphBlob color="from-purple-400 to-pink-300" className="absolute bottom-20 left-10 opacity-30" />
            <GlowOrb className="absolute top-1/3 right-1/4 opacity-20" />
            <GlowOrb color="oklch(0.55 0.25 310 / 0.15)" className="absolute bottom-1/3 left-1/3 opacity-15" />
          </>
        ) : (
          <>
            <motion.div
              className="absolute top-0 left-0 w-96 h-96 rounded-full bg-gradient-to-br from-pink-300 to-purple-300 opacity-20 blur-3xl"
              animate={{
                y: [0, 50, 0],
                x: [0, 30, 0],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <motion.div
              className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-gradient-to-br from-purple-300 to-pink-300 opacity-20 blur-3xl"
              animate={{
                y: [0, -50, 0],
                x: [0, -30, 0],
              }}
              transition={{
                duration: 10,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </>
        )}
      </div>

      {/* Progress Bar */}
      <div className="relative z-20 w-full bg-white/5 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            {STEPS.map((s, idx) => {
              const Icon = s.icon;
              const isCompleted = idx < step - 1;
              const isCurrent = idx === step - 1;

              return (
                <motion.div
                  key={s.id}
                  className="flex flex-col items-center flex-1"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <motion.div
                    className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all duration-300 ${
                      isCurrent
                        ? isDarkTheme
                          ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg shadow-pink-500/50"
                          : "bg-gradient-to-r from-pink-400 to-purple-400 text-white shadow-lg shadow-pink-400/50"
                        : isCompleted
                          ? "bg-green-500 text-white"
                          : isDarkTheme
                            ? "bg-gray-700/50 text-gray-400"
                            : "bg-gray-300/50 text-gray-600"
                    }`}
                    animate={isCurrent ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </motion.div>
                  <span className={`text-xs font-medium hidden sm:block text-center ${
                    isCurrent
                      ? isDarkTheme ? "text-pink-400" : "text-pink-600"
                      : isDarkTheme ? "text-gray-400" : "text-gray-600"
                  }`}>
                    {s.title}
                  </span>
                </motion.div>
              );
            })}
          </div>

          {/* Progress line */}
          <div className={`h-1 bg-gray-700/30 rounded-full overflow-hidden ${isDarkTheme ? "" : "bg-gray-300/30"}`}>
            <motion.div
              className={`h-full bg-gradient-to-r from-pink-500 to-purple-500`}
              initial={{ width: "0%" }}
              animate={{ width: `${((step - 1) / 6) * 100}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 min-h-[calc(100vh-120px)] flex items-center justify-center p-4 py-12">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            className="w-full max-w-2xl"
          >
            {/* Step 1: Welcome */}
            {step === 1 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center"
              >
                <motion.div
                  animate={{ y: [0, -20, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="mb-8"
                >
                  <img src={LOGO_URL} alt="Soapies" className="h-24 mx-auto" />
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-5xl sm:text-6xl font-display font-bold text-center mb-4"
                  style={{
                    background: "linear-gradient(135deg, rgb(236, 72, 153), rgb(168, 85, 247))",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  Join Soapies
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-xl sm:text-2xl text-gray-300 text-center mb-12 max-w-md"
                >
                  The adult party and social community you've been looking for
                </motion.p>

                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  onClick={handleWelcome}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn-premium px-12 py-4 text-lg font-bold mb-8"
                >
                  Join Now
                </motion.button>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-sm text-gray-400 text-center"
                >
                  <p>Already have an account?{" "}
                    <Link href="/login">
                      <span className="text-pink-400 hover:text-pink-300 cursor-pointer font-semibold">
                        Log in
                      </span>
                    </Link>
                  </p>
                </motion.div>
              </motion.div>
            )}

            {/* Step 2: Create Account */}
            {step === 2 && (
              <div className="max-w-md mx-auto">
                <Card className="glass glass-strong backdrop-blur-xl border border-pink-500/20 shadow-2xl">
                  <CardContent className="pt-8 pb-6 px-6">
                    <motion.h2
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-3xl font-bold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400"
                    >
                      Create Account
                    </motion.h2>
                    <motion.p
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="text-sm text-gray-400 text-center mb-8"
                    >
                      Let's get you started
                    </motion.p>

                    <form onSubmit={handleRegister} className="space-y-4">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                      >
                        <Label className="text-gray-300 text-sm font-medium mb-2 block">Full Name</Label>
                        <Input
                          type="text"
                          placeholder="John Doe"
                          value={form.name}
                          onChange={(e) => handleFormChange("name", e.target.value)}
                          className="bg-gray-800/50 border border-gray-700/50 text-white placeholder-gray-500 focus:border-pink-500/80 h-11"
                        />
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        <Label className="text-gray-300 text-sm font-medium mb-2 block">Email</Label>
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          value={form.email}
                          onChange={(e) => handleFormChange("email", e.target.value)}
                          className="bg-gray-800/50 border border-gray-700/50 text-white placeholder-gray-500 focus:border-pink-500/80 h-11"
                        />
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                      >
                        <Label className="text-gray-300 text-sm font-medium mb-2 block">Password</Label>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={form.password}
                            onChange={(e) => handleFormChange("password", e.target.value)}
                            className="bg-gray-800/50 border border-gray-700/50 text-white placeholder-gray-500 focus:border-pink-500/80 h-11 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                          >
                            {showPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </motion.div>

                      {form.password && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                        >
                          <PasswordStrengthIndicator password={form.password} />
                        </motion.div>
                      )}

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                      >
                        <Label className="text-gray-300 text-sm font-medium mb-2 block">Confirm Password</Label>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={form.confirmPassword}
                            onChange={(e) => handleFormChange("confirmPassword", e.target.value)}
                            className="bg-gray-800/50 border border-gray-700/50 text-white placeholder-gray-500 focus:border-pink-500/80 h-11 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="flex items-start gap-3 pt-2"
                      >
                        <Checkbox
                          id="terms"
                          checked={form.termsAccepted}
                          onCheckedChange={(checked) => handleFormChange("termsAccepted", checked)}
                          className="mt-1"
                        />
                        <Label htmlFor="terms" className="text-xs text-gray-300 font-normal cursor-pointer">
                          I agree to the{" "}
                          <Link href="/terms">
                            <span className="text-pink-400 hover:text-pink-300">Terms of Service</span>
                          </Link>
                          {" "}and{" "}
                          <Link href="/privacy">
                            <span className="text-pink-400 hover:text-pink-300">Privacy Policy</span>
                          </Link>
                        </Label>
                      </motion.div>

                      <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.45 }}
                        type="submit"
                        disabled={registerMutation.isPending}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="btn-premium w-full mt-6 h-11 relative overflow-hidden group"
                      >
                        <span className="relative z-10 flex items-center justify-center gap-2 font-medium">
                          {registerMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Creating Account...
                            </>
                          ) : (
                            <>
                              Continue
                              <ArrowRight className="w-4 h-4" />
                            </>
                          )}
                        </span>
                      </motion.button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 3: Verify Email */}
            {step === 3 && (
              <div className="max-w-md mx-auto">
                <Card className="glass glass-strong backdrop-blur-xl border border-pink-500/20 shadow-2xl">
                  <CardContent className="pt-8 pb-6 px-6">
                    <motion.h2
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-3xl font-bold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400"
                    >
                      Verify Email
                    </motion.h2>
                    <motion.p
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="text-sm text-gray-400 text-center mb-8"
                    >
                      We sent a code to {userEmail}
                    </motion.p>

                    <form onSubmit={handleVerifyEmail} className="space-y-6">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="flex justify-center"
                      >
                        <motion.div
                          animate={{
                            boxShadow: otpCode.length > 0
                              ? ["0 0 0 0px rgba(236, 72, 153, 0.2)", "0 0 20px 8px rgba(236, 72, 153, 0.1)", "0 0 0 0px rgba(236, 72, 153, 0.2)"]
                              : "0 0 0 0px rgba(236, 72, 153, 0)"
                          }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="rounded-lg"
                        >
                          <InputOTP
                            maxLength={6}
                            value={otpCode}
                            onChange={setOtpCode}
                            disabled={verifyEmailMutation.isPending}
                          >
                            <InputOTPGroup>
                              {[0, 1, 2, 3, 4, 5].map((i) => (
                                <InputOTPSlot key={i} index={i} />
                              ))}
                            </InputOTPGroup>
                          </InputOTP>
                        </motion.div>
                      </motion.div>

                      <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        type="submit"
                        disabled={verifyEmailMutation.isPending}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="btn-premium w-full h-11 relative overflow-hidden group"
                      >
                        <span className="relative z-10 flex items-center justify-center gap-2 font-medium">
                          {verifyEmailMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Verifying...
                            </>
                          ) : (
                            <>
                              Verify Email
                              <Check className="w-4 h-4" />
                            </>
                          )}
                        </span>
                      </motion.button>
                    </form>

                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3, duration: 0.5 }}
                      className="mt-6 space-y-3 border-t border-gray-700/50 pt-6"
                    >
                      <p className="text-sm text-gray-400 text-center">Didn't receive a code?</p>
                      <motion.button
                        type="button"
                        onClick={handleResendCode}
                        disabled={!canResend || resendEmailMutation.isPending}
                        whileHover={{ scale: !canResend ? 1 : 1.02 }}
                        whileTap={{ scale: !canResend ? 1 : 0.98 }}
                        className="w-full px-4 py-2 rounded-lg border border-pink-500/30 text-pink-400 hover:text-pink-300 hover:border-pink-500/60 hover:bg-pink-500/5 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-sm"
                      >
                        {resendEmailMutation.isPending
                          ? "Sending..."
                          : canResend
                            ? "Resend Code"
                            : (
                                <motion.span
                                  animate={{ opacity: [1, 0.5, 1] }}
                                  transition={{ duration: 1, repeat: Infinity }}
                                >
                                  Resend in {resendCountdown}s
                                </motion.span>
                              )}
                      </motion.button>
                    </motion.div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 4: About You */}
            {step === 4 && (
              <div className="max-w-2xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6"
                >
                  <h2 className="text-4xl font-bold text-gray-900 mb-2">Tell us about yourself</h2>
                  <p className="text-gray-600">Help us get to know you better</p>
                </motion.div>

                <Card className="border-gray-200 bg-white/70 backdrop-blur-sm shadow-lg">
                  <CardContent className="pt-8 pb-6 px-8">
                    <form className="space-y-6">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                      >
                        <Label className="text-gray-700 text-sm font-semibold mb-2 block">Display Name</Label>
                        <Input
                          type="text"
                          placeholder="How should we call you?"
                          value={form.displayName}
                          onChange={(e) => handleFormChange("displayName", e.target.value)}
                          className="h-12 rounded-xl border-gray-200 bg-white/80 focus:border-pink-400 focus:ring-pink-400/20 text-base"
                        />
                      </motion.div>

                      <div className="grid grid-cols-2 gap-4">
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.15 }}
                        >
                          <Label className="text-gray-700 text-sm font-semibold mb-2 block">Gender</Label>
                          <Select value={form.gender} onValueChange={(value) => handleFormChange("gender", value)}>
                            <SelectTrigger className="h-12 rounded-xl border-gray-200 bg-white/80 focus:border-pink-400 focus:ring-pink-400/20 text-base">
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent>
                              {["male", "female", "non-binary", "trans-male", "trans-female", "other", "prefer-not-to-say"].map(opt => (
                                <SelectItem key={opt} value={opt}>
                                  {opt.replace("-", " ").replace(/\b\w/g, l => l.toUpperCase())}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </motion.div>

                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                        >
                          <Label className="text-gray-700 text-sm font-semibold mb-2 block">Date of Birth</Label>
                          <Input
                            type="date"
                            value={form.dateOfBirth}
                            onChange={(e) => handleFormChange("dateOfBirth", e.target.value)}
                            className="h-12 rounded-xl border-gray-200 bg-white/80 focus:border-pink-400 focus:ring-pink-400/20 text-base"
                          />
                        </motion.div>
                      </div>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                      >
                        <Label className="text-gray-700 text-sm font-semibold mb-2 block">Bio</Label>
                        <Textarea
                          placeholder="Tell us what makes you special..."
                          value={form.bio}
                          onChange={(e) => handleFormChange("bio", e.target.value)}
                          className="rounded-xl border-gray-200 bg-white/80 focus:border-pink-400 focus:ring-pink-400/20 text-base min-h-24"
                        />
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        <Label className="text-gray-700 text-sm font-semibold mb-2 block">Orientation</Label>
                        <Select value={form.orientation} onValueChange={(value) => handleFormChange("orientation", value)}>
                          <SelectTrigger className="h-12 rounded-xl border-gray-200 bg-white/80 focus:border-pink-400 focus:ring-pink-400/20 text-base">
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {["straight", "gay", "lesbian", "bisexual", "pansexual", "queer", "asexual", "other", "prefer-not-to-say"].map(opt => (
                              <SelectItem key={opt} value={opt}>
                                {opt.replace("-", " ").replace(/\b\w/g, l => l.toUpperCase())}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                      >
                        <Label className="text-gray-700 text-sm font-semibold mb-2 block">Relationship Status</Label>
                        <Select value={form.relationshipStatus} onValueChange={(value) => handleFormChange("relationshipStatus", value)}>
                          <SelectTrigger className="h-12 rounded-xl border-gray-200 bg-white/80 focus:border-pink-400 focus:ring-pink-400/20 text-base">
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {["single", "in-a-relationship", "married", "open-relationship", "its-complicated", "prefer-not-to-say"].map(opt => (
                              <SelectItem key={opt} value={opt}>
                                {opt.replace("-", " ").replace(/\b\w/g, l => l.toUpperCase())}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                      >
                        <Label className="text-gray-700 text-sm font-semibold mb-2 block">Location</Label>
                        <Input
                          type="text"
                          placeholder="City, State"
                          value={form.location}
                          onChange={(e) => handleFormChange("location", e.target.value)}
                          className="h-12 rounded-xl border-gray-200 bg-white/80 focus:border-pink-400 focus:ring-pink-400/20 text-base"
                        />
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.45 }}
                      >
                        <Label className="text-gray-700 text-sm font-semibold mb-2 block">Community</Label>
                        <Select value={form.community} onValueChange={(value) => handleFormChange("community", value)}>
                          <SelectTrigger className="h-12 rounded-xl border-gray-200 bg-white/80 focus:border-pink-400 focus:ring-pink-400/20 text-base">
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="soapies">Soapies Main Community</SelectItem>
                            <SelectItem value="groupies">Groupies</SelectItem>
                            <SelectItem value="gaypeez">Gaypeez</SelectItem>
                          </SelectContent>
                        </Select>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                      >
                        <Label className="text-gray-700 text-sm font-semibold mb-2 block">Phone (Optional)</Label>
                        <Input
                          type="tel"
                          placeholder="(555) 123-4567"
                          value={form.phone}
                          onChange={(e) => handleFormChange("phone", e.target.value)}
                          className="h-12 rounded-xl border-gray-200 bg-white/80 focus:border-pink-400 focus:ring-pink-400/20 text-base"
                        />
                      </motion.div>
                    </form>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 5: Photos */}
            {step === 5 && (
              <div className="max-w-2xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6"
                >
                  <h2 className="text-4xl font-bold text-gray-900 mb-2">Add some photos</h2>
                  <p className="text-gray-600">Upload 1-6 photos to showcase your best self</p>
                </motion.div>

                <Card className="border-gray-200 bg-white/70 backdrop-blur-sm shadow-lg">
                  <CardContent className="pt-8 pb-6 px-8">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />

                    <motion.button
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={photos.length >= 6 || uploadPhotoMutation.isPending}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`w-full py-8 rounded-xl border-2 border-dashed transition-all duration-200 ${
                        photos.length >= 6
                          ? "border-gray-300 bg-gray-100/50 cursor-not-allowed opacity-50"
                          : "border-pink-300 hover:border-pink-500 hover:bg-pink-50/50 cursor-pointer"
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Upload className={`w-8 h-8 ${photos.length >= 6 ? "text-gray-400" : "text-pink-500"}`} />
                        <span className={`font-semibold ${photos.length >= 6 ? "text-gray-600" : "text-gray-700"}`}>
                          {photos.length >= 6 ? "Maximum photos reached" : "Click to upload photos"}
                        </span>
                        <span className="text-sm text-gray-600">
                          {photos.length}/6 photos
                        </span>
                      </div>
                    </motion.button>

                    {photos.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6"
                      >
                        {photos.map((photo, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="relative group"
                          >
                            <div className="aspect-square rounded-lg overflow-hidden bg-gray-200">
                              <img
                                src={photo.url}
                                alt={`Photo ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                              {photo.uploading && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                                </div>
                              )}
                            </div>
                            <motion.button
                              type="button"
                              onClick={() => handleRemovePhoto(idx)}
                              disabled={photo.uploading}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                            >
                              <X className="w-4 h-4" />
                            </motion.button>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}

                    <motion.p
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-xs text-gray-500 mt-6 text-center"
                    >
                      Photos should be clear, recent, and appropriate
                    </motion.p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 6: Preferences */}
            {step === 6 && (
              <div className="max-w-2xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6"
                >
                  <h2 className="text-4xl font-bold text-gray-900 mb-2">Your preferences</h2>
                  <p className="text-gray-600">What are you interested in?</p>
                </motion.div>

                <Card className="border-gray-200 bg-white/70 backdrop-blur-sm shadow-lg">
                  <CardContent className="pt-8 pb-6 px-8 space-y-8">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Interests</h3>
                      <div className="flex flex-wrap gap-3">
                        {INTERESTS.map(interest => (
                          <motion.button
                            key={interest}
                            type="button"
                            onClick={() => toggleInterest(interest)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className={`px-4 py-2 rounded-full font-medium text-sm transition-all duration-200 ${
                              form.interests.includes(interest)
                                ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg"
                                : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                            }`}
                          >
                            {interest}
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Looking for</h3>
                      <div className="flex flex-wrap gap-3">
                        {LOOKING_FOR.map(tag => (
                          <motion.button
                            key={tag}
                            type="button"
                            onClick={() => toggleLookingFor(tag)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className={`px-4 py-2 rounded-full font-medium text-sm transition-all duration-200 ${
                              form.lookingFor.includes(tag)
                                ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg"
                                : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                            }`}
                          >
                            {tag}
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 7: Review & Submit */}
            {step === 7 && (
              <div className="max-w-2xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6"
                >
                  <h2 className="text-4xl font-bold text-gray-900 mb-2">Review & Submit</h2>
                  <p className="text-gray-600">Make sure everything looks good</p>
                </motion.div>

                <div className="space-y-4">
                  {/* Account Summary */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <Card className="border-gray-200 bg-white/70 backdrop-blur-sm shadow-lg">
                      <CardContent className="pt-6 pb-6 px-8">
                        <h3 className="font-bold text-lg text-gray-900 mb-4">Account</h3>
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Name:</span>
                            <span className="font-semibold text-gray-900">{form.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Email:</span>
                            <span className="font-semibold text-gray-900">{form.email}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Profile Summary */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                  >
                    <Card className="border-gray-200 bg-white/70 backdrop-blur-sm shadow-lg">
                      <CardContent className="pt-6 pb-6 px-8">
                        <h3 className="font-bold text-lg text-gray-900 mb-4">Profile</h3>
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Display Name:</span>
                            <span className="font-semibold text-gray-900">{form.displayName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Gender:</span>
                            <span className="font-semibold text-gray-900 capitalize">{form.gender.replace("-", " ")}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Orientation:</span>
                            <span className="font-semibold text-gray-900 capitalize">{form.orientation.replace("-", " ")}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Location:</span>
                            <span className="font-semibold text-gray-900">{form.location}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Community:</span>
                            <span className="font-semibold text-gray-900 capitalize">{form.community}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Photos Summary */}
                  {photos.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <Card className="border-gray-200 bg-white/70 backdrop-blur-sm shadow-lg">
                        <CardContent className="pt-6 pb-6 px-8">
                          <h3 className="font-bold text-lg text-gray-900 mb-4">Photos ({photos.length})</h3>
                          <div className="grid grid-cols-3 gap-2">
                            {photos.map((photo, idx) => (
                              <div key={idx} className="aspect-square rounded-lg overflow-hidden bg-gray-200">
                                <img src={photo.url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}

                  {/* Preferences Summary */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                  >
                    <Card className="border-gray-200 bg-white/70 backdrop-blur-sm shadow-lg">
                      <CardContent className="pt-6 pb-6 px-8">
                        <h3 className="font-bold text-lg text-gray-900 mb-4">Preferences</h3>
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-semibold text-gray-700 text-sm mb-2">Interests</h4>
                            <div className="flex flex-wrap gap-2">
                              {form.interests.map(interest => (
                                <span key={interest} className="px-3 py-1 rounded-full bg-pink-100 text-pink-700 text-xs font-medium">
                                  {interest}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-700 text-sm mb-2">Looking for</h4>
                            <div className="flex flex-wrap gap-2">
                              {form.lookingFor.map(tag => (
                                <span key={tag} className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Agreements */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <Card className="border-gray-200 bg-white/70 backdrop-blur-sm shadow-lg">
                      <CardContent className="pt-6 pb-6 px-8 space-y-4">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            id="guidelines"
                            checked={form.agreeGuidelines}
                            onCheckedChange={(checked) => handleFormChange("agreeGuidelines", checked)}
                            className="mt-1"
                          />
                          <Label htmlFor="guidelines" className="text-sm text-gray-700 font-normal cursor-pointer flex-1">
                            I agree to follow the{" "}
                            <Link href="/guidelines">
                              <span className="text-pink-600 hover:text-pink-700 font-semibold">Community Guidelines</span>
                            </Link>
                          </Label>
                        </div>

                        <div className="flex items-start gap-3">
                          <Checkbox
                            id="waiver"
                            checked={form.agreeWaiver}
                            onCheckedChange={(checked) => handleFormChange("agreeWaiver", checked)}
                            className="mt-1"
                          />
                          <Label htmlFor="waiver" className="text-sm text-gray-700 font-normal cursor-pointer flex-1">
                            I understand and agree to the{" "}
                            <Link href="/waiver">
                              <span className="text-pink-600 hover:text-pink-700 font-semibold">Liability Waiver</span>
                            </Link>
                          </Label>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Footer */}
      {!submitted && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`relative z-20 w-full border-t transition-colors duration-700 ${
            isDarkTheme
              ? "border-gray-700/50 bg-gray-900/80 backdrop-blur-sm"
              : "border-gray-200/50 bg-white/80 backdrop-blur-sm"
          }`}
        >
          <div className="max-w-4xl mx-auto px-4 py-6 flex items-center justify-between">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleBack}
              disabled={step === 1}
              className={`px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-all duration-200 ${
                step === 1
                  ? "opacity-50 cursor-not-allowed"
                  : isDarkTheme
                    ? "text-gray-300 hover:text-gray-100 hover:bg-gray-800/50 border border-gray-700/50"
                    : "text-gray-700 hover:text-gray-900 hover:bg-gray-100/50 border border-gray-200/50"
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </motion.button>

            <div className={`text-sm font-medium ${isDarkTheme ? "text-gray-400" : "text-gray-600"}`}>
              Step {step} of {STEPS.length}
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (step === 2) handleRegister(new Event("submit") as any);
                else if (step === 3) handleVerifyEmail(new Event("submit") as any);
                else if (step === 4) handleAboutYouNext();
                else if (step === 5) handleNext();
                else if (step === 6) handlePreferencesNext();
                else if (step === 7) handleSubmitApplication(new Event("submit") as any);
                else handleNext();
              }}
              disabled={submitting || (step === 2 && registerMutation.isPending) || (step === 3 && verifyEmailMutation.isPending)}
              className={`btn-premium px-8 py-2 font-medium flex items-center gap-2 relative overflow-hidden group ${
                step === 7 && !submitting ? "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600" : ""
              }`}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : step === 7 ? (
                  <>
                    Submit Application
                    <Check className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </span>
            </motion.button>
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {showSuccess && <SuccessOverlay />}
      </AnimatePresence>
    </div>
  );
}

// Application Status Component
function ApplicationStatus() {
  const [, navigate] = useLocation();

  useEffect(() => {
    // Redirect to the pending approval page after a delay
    const timer = setTimeout(() => {
      navigate("/pending");
    }, 4000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-pink-50 relative overflow-hidden flex items-center justify-center">
      {/* Animated background blobs */}
      <motion.div
        className="absolute top-0 left-0 w-96 h-96 rounded-full bg-gradient-to-br from-pink-300 to-purple-300 opacity-20 blur-3xl"
        animate={{ y: [0, 50, 0], x: [0, 30, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-gradient-to-br from-purple-300 to-pink-300 opacity-20 blur-3xl"
        animate={{ y: [0, -50, 0], x: [0, -30, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 max-w-md w-full mx-4"
      >
        <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl p-8 sm:p-12 border border-white/50 text-center">
          {/* Animated icon */}
          <motion.div
            className="w-24 h-24 mx-auto mb-8 bg-amber-100 rounded-full flex items-center justify-center"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            >
              <Clock className="w-12 h-12 text-amber-600" />
            </motion.div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-3xl sm:text-4xl font-bold text-amber-600 mb-4"
            style={{ fontFamily: "Fredoka, sans-serif" }}
          >
            Application Submitted!
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-lg text-gray-700 mb-4 leading-relaxed"
          >
            We're carefully reviewing your application. This usually takes 24-48 hours.
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="text-base text-gray-500 mb-8"
          >
            Thank you for your patience!
          </motion.p>

          {/* Confetti */}
          {Array.from({ length: 12 }).map((_, i) => (
            <ConfettiPiece key={i} delay={i * 0.1} />
          ))}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-4"
          >
            <motion.button
              onClick={() => navigate("/pending")}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold shadow-lg"
            >
              View Application Status
            </motion.button>
          </motion.div>

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            onClick={() => navigate("/")}
            className="block mx-auto mt-4 text-sm font-semibold text-gray-500 hover:text-pink-500 transition-colors"
          >
            Back to Home
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
