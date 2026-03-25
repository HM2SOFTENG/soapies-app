import { useState, useCallback, useRef, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  MapPin,
  Phone,
  Star,
  Trash2,
} from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663460303717/FfTbhpP94ZvscRd7twWNT6/soapies-logo_cf3c72b2.png";

const INTERESTS = [
  "House Parties",
  "Raves",
  "Beach Events",
  "Pool Parties",
  "Dance",
  "Music",
  "Socializing",
  "Networking",
  "Fitness",
  "Travel",
  "Art",
  "Photography",
  "Cooking",
  "Gaming",
  "Yoga",
  "Meditation",
];

const LOOKING_FOR = [
  "New Friends",
  "Social Events",
  "Couples Community",
  "Dating",
  "Networking",
  "Adventure",
  "Fun Nights Out",
  "Like-minded People",
];

const GENDER_OPTIONS = [
  { label: "Male", icon: "♂️" },
  { label: "Female", icon: "♀️" },
  { label: "Non-binary", icon: "⚧" },
  { label: "Trans Male", icon: "🏳️‍⚧️" },
  { label: "Trans Female", icon: "🏳️‍⚧️" },
  { label: "Other", icon: "◆" },
  { label: "Prefer not to say", icon: "?" },
];

const ORIENTATION_OPTIONS = [
  { label: "Straight", icon: "↔️" },
  { label: "Gay", icon: "🏳️‍🌈" },
  { label: "Lesbian", icon: "🏳️‍🌈" },
  { label: "Bisexual", icon: "🏳️‍🌈" },
  { label: "Pansexual", icon: "🏳️‍🌈" },
  { label: "Queer", icon: "🏳️‍🌈" },
  { label: "Asexual", icon: "🏳️‍🌈" },
  { label: "Other", icon: "◆" },
  { label: "Prefer not to say", icon: "?" },
];

const RELATIONSHIP_STATUS_OPTIONS = [
  { label: "Single", icon: "💫" },
  { label: "In a Relationship", icon: "💕" },
  { label: "Married", icon: "💍" },
  { label: "Open Relationship", icon: "🔗" },
  { label: "It's Complicated", icon: "❓" },
  { label: "Prefer not to say", icon: "?" },
];

const COMMUNITY_OPTIONS = [
  {
    id: "soapies",
    name: "Soapies",
    subtitle: "Main Community",
    description: "The original lifestyle community",
  },
  {
    id: "groupies",
    name: "Groupies",
    subtitle: "For couples and groups",
    description: "For couples and groups",
  },
  {
    id: "gaypeez",
    name: "Gaypeez",
    subtitle: "LGBTQ+ friendly community",
    description: "LGBTQ+ friendly community",
  },
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

const getPasswordStrength = (
  password: string
): { strength: "weak" | "medium" | "strong"; percentage: number } => {
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
        <span
          className={`text-xs font-semibold ${
            strength === "weak"
              ? "text-red-400"
              : strength === "medium"
                ? "text-yellow-400"
                : "text-green-400"
          }`}
        >
          {strengthLabel[strength]}
        </span>
      </div>
      <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${strengthColor[strength]}`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>
    </motion.div>
  );
};

interface PhotoUploadState {
  id: string;
  file: File;
  preview: string;
  uploading: boolean;
  error?: string;
  photoId?: number;
}

type ChipType = "gender" | "orientation" | "relationshipStatus" | "interests" | "lookingFor";

const AnimatedChip = ({
  label,
  selected,
  onClick,
  icon,
  chipType,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  icon?: string;
  chipType?: ChipType;
}) => {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`relative px-4 py-2 rounded-full font-medium text-sm transition-all ${
        selected
          ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg shadow-pink-500/50"
          : "bg-white/10 border border-white/20 text-gray-700 hover:bg-white/20 hover:border-white/40"
      }`}
    >
      <div className="flex items-center gap-2">
        {icon && <span>{icon}</span>}
        <span>{label}</span>
        {selected && (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring" as const, stiffness: 400, damping: 15 }}
          >
            <Check size={16} />
          </motion.div>
        )}
      </div>
    </motion.button>
  );
};

const CommunityCard = ({
  option,
  selected,
  onClick,
}: {
  option: (typeof COMMUNITY_OPTIONS)[0];
  selected: boolean;
  onClick: () => void;
}) => {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.02, translateY: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative p-6 rounded-xl border-2 transition-all text-left ${
        selected
          ? "bg-gradient-to-br from-pink-100 to-purple-100 border-pink-400 shadow-xl"
          : "bg-white border-gray-200 hover:border-pink-300 hover:shadow-lg"
      }`}
    >
      <div className="absolute top-4 right-4">
        <motion.div
          animate={selected ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
          transition={{ type: "spring" as const, stiffness: 400, damping: 15 }}
        >
          <div className="w-6 h-6 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center">
            <Check size={16} className="text-white" />
          </div>
        </motion.div>
      </div>
      <h3 className="font-bold text-lg text-gray-900">{option.name}</h3>
      <p className="text-xs font-medium text-pink-600 mt-1">{option.subtitle}</p>
      <p className="text-sm text-gray-600 mt-2">{option.description}</p>
    </motion.button>
  );
};

const FieldContainer = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{
        type: "spring" as const,
        stiffness: 400,
        damping: 30,
        delay,
      }}
    >
      {children}
    </motion.div>
  );
};

const ApplicationStatus = () => {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const timer = setTimeout(() => {
      setLocation("/pending");
    }, 4000);
    return () => clearTimeout(timer);
  }, [setLocation]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 bg-gradient-to-br from-pink-500/20 to-purple-500/20 backdrop-blur-lg flex items-center justify-center"
    >
      <div className="bg-white rounded-2xl p-12 text-center max-w-md shadow-2xl">
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="mb-6 flex justify-center"
        >
          <CheckCircle2 size={64} className="text-green-500" />
        </motion.div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Application Submitted!</h2>
        <p className="text-gray-600 mb-8">We'll review your profile and get back to you soon.</p>
        <button
          onClick={() => setLocation("/pending")}
          className="w-full px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold rounded-lg hover:shadow-lg transition-shadow"
        >
          View Application Status
        </button>
      </div>
    </motion.div>
  );
};

export default function JoinFlow() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [showApplicationStatus, setShowApplicationStatus] = useState(false);

  // Step 2: Account Creation
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Step 3: Email Verification
  const [verificationCode, setVerificationCode] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  // Step 4: About You
  const [displayName, setDisplayName] = useState("");
  const [gender, setGender] = useState("");
  const [orientation, setOrientation] = useState("");
  const [relationshipStatus, setRelationshipStatus] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [communityId, setCommunityId] = useState("");
  const [phone, setPhone] = useState("");

  // Step 5: Photos
  const [photos, setPhotos] = useState<PhotoUploadState[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 6: Preferences
  const [interests, setInterests] = useState<string[]>([]);
  const [lookingFor, setLookingFor] = useState<string[]>([]);

  // Mutations
  const registerMutation = trpc.auth.register.useMutation();
  const verifyEmailMutation = trpc.auth.verifyEmail.useMutation();
  const resendVerificationMutation = trpc.auth.resendEmailVerification.useMutation();
  const upsertProfileMutation = trpc.profile.upsert.useMutation();
  const uploadPhotoMutation = trpc.profile.uploadPhoto.useMutation();
  const deletePhotoMutation = trpc.profile.deletePhoto.useMutation();
  const submitApplicationMutation = trpc.profile.submitApplication.useMutation();

  // Resend timer effect
  useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => setResendTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [resendTimer]);

  // Step 1: Welcome
  const handleBeginJourney = () => {
    setCurrentStep(2);
  };

  // Step 2: Register
  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (!agreedToTerms) {
      toast.error("Please agree to the terms and conditions");
      return;
    }

    try {
      await registerMutation.mutateAsync({
        email,
        password,
        name: email.split("@")[0],
      });
      setCurrentStep(3);
      setResendTimer(60);
    } catch (error: any) {
      toast.error(error.message || "Registration failed");
    }
  };

  // Step 3: Verify Email
  const handleVerifyEmail = async () => {
    if (verificationCode.length !== 6) {
      toast.error("Please enter the complete verification code");
      return;
    }

    try {
      await verifyEmailMutation.mutateAsync({
        email,
        code: verificationCode,
      });
      setCurrentStep(4);
    } catch (error: any) {
      toast.error(error.message || "Verification failed");
    }
  };

  const handleResendCode = async () => {
    try {
      await resendVerificationMutation.mutateAsync({ email });
      setResendTimer(60);
      toast.success("Verification code sent");
    } catch (error: any) {
      toast.error(error.message || "Failed to resend code");
    }
  };

  // Step 4: About You
  const handleAboutYouNext = async () => {
    if (!displayName || !gender || !dateOfBirth || !bio || !location || !communityId) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await upsertProfileMutation.mutateAsync({
        displayName,
        gender,
        orientation: orientation || undefined,
        relationshipStatus: relationshipStatus || undefined,
        dateOfBirth,
        bio,
        location,
        communityId,
        phone: phone || undefined,
      });
      setCurrentStep(5);
    } catch (error: any) {
      toast.error(error.message || "Failed to save profile");
    }
  };

  // Step 5: Photos
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select valid image files");
        continue;
      }

      const id = Math.random().toString(36).substr(2, 9);
      const preview = URL.createObjectURL(file);

      const newPhoto: PhotoUploadState = {
        id,
        file,
        preview,
        uploading: true,
      };

      setPhotos((prev) => [...prev, newPhoto]);

      // Upload the photo
      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload-photo", {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
          credentials: "include",
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({ error: "Upload failed" }));
          throw new Error(errData.error || "Upload failed");
        }

        const { url } = await response.json();

        // Save photo metadata
        const result = await uploadPhotoMutation.mutateAsync({
          photoUrl: url,
          sortOrder: photos.length,
        });

        setPhotos((prev) =>
          prev.map((p) =>
            p.id === id
              ? { ...p, uploading: false, photoId: result.photoId ?? undefined }
              : p
          )
        );

        toast.success("Photo uploaded successfully");
      } catch (error: any) {
        const errorMsg =
          error instanceof Error ? error.message : "Photo upload failed";
        setPhotos((prev) =>
          prev.map((p) =>
            p.id === id ? { ...p, uploading: false, error: errorMsg } : p
          )
        );
        toast.error(errorMsg);
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDeletePhoto = async (id: string) => {
    const photo = photos.find((p) => p.id === id);
    if (!photo?.photoId) return;

    try {
      await deletePhotoMutation.mutateAsync({ photoId: photo.photoId });
      setPhotos((prev) => prev.filter((p) => p.id !== id));
      toast.success("Photo deleted");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete photo");
    }
  };

  const handlePhotosNext = () => {
    const uploadedPhotos = photos.filter((p) => p.photoId);
    if (uploadedPhotos.length < 3) {
      toast.error("Please upload at least 3 photos");
      return;
    }
    setCurrentStep(6);
  };

  // Step 6: Preferences
  const handlePreferencesNext = () => {
    if (interests.length === 0 || lookingFor.length === 0) {
      toast.error("Please select at least one interest and one thing you're looking for");
      return;
    }
    setCurrentStep(7);
  };

  // Step 7: Review & Submit
  const handleSubmitApplication = async () => {
    try {
      await submitApplicationMutation.mutateAsync();
      setShowApplicationStatus(true);
    } catch (error: any) {
      toast.error(error.message || "Failed to submit application");
    }
  };

  if (showApplicationStatus) {
    return <ApplicationStatus />;
  }

  const isDarkTheme = currentStep <= 3;
  const cardClasses = isDarkTheme
    ? "bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.08]"
    : "bg-gradient-to-br from-white/80 via-white/60 to-pink-50/40 border border-white/60";

  // Step 1: Welcome
  if (currentStep === 1) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-gradient-to-br from-gray-900 via-purple-900 to-black overflow-hidden"
      >
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <FloatingBubbles count={5} className="absolute opacity-30" />
          <MorphBlob
            className="absolute top-20 left-10 opacity-20"
            color="from-pink-600 to-purple-600"
            size="w-96 h-96"
          />
          <MorphBlob
            className="absolute bottom-20 right-10 opacity-20"
            color="from-purple-600 to-pink-600"
            size="w-96 h-96"
          />
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring" as const, stiffness: 400, damping: 40 }}
            className="mb-8"
          >
            <img
              src={LOGO_URL}
              alt="Soapies"
              className="h-32 w-auto drop-shadow-lg"
            />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-5xl md:text-6xl font-bold text-white text-center mb-4"
          >
            Welcome to Soapies
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-xl md:text-2xl text-gray-300 text-center max-w-2xl mb-12"
          >
            Join the hottest lifestyle community
          </motion.p>

          <motion.button
            type="button"
            whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(236, 72, 153, 0.4)" }}
            whileTap={{ scale: 0.95 }}
            onClick={handleBeginJourney}
            className="px-12 py-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold text-lg rounded-full shadow-xl hover:shadow-2xl transition-shadow"
          >
            <motion.div
              animate={{ y: [0, 2, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="flex items-center gap-2"
            >
              <span>Begin Your Journey</span>
              <Sparkles size={20} />
            </motion.div>
          </motion.button>
        </div>
      </motion.div>
    );
  }

  // Step 2: Create Account
  if (currentStep === 2) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-gradient-to-br from-gray-900 via-purple-900 to-black overflow-hidden"
      >
        <div className="absolute inset-0 overflow-hidden">
          <FloatingBubbles count={3} className="absolute opacity-20" />
        </div>

        <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{
              type: "spring" as const,
              stiffness: 400,
              damping: 30,
            }}
            className={`w-full max-w-md ${cardClasses} backdrop-blur-2xl rounded-2xl p-8`}
          >
            {/* Step Header */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-8"
            >
              <h2 className="text-3xl font-bold text-white mb-2">Create Account</h2>
              <p className="text-gray-400">Step 2 of 7</p>
            </motion.div>

            <div className="space-y-6">
              {/* Email Field */}
              <FieldContainer delay={0.15}>
                <Label className="text-white/80 mb-2 block">Email Address</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-lg"
                />
              </FieldContainer>

              {/* Password Field */}
              <FieldContainer delay={0.2}>
                <Label className="text-white/80 mb-2 block">Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter a strong password"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-lg pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white/70"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {password && <PasswordStrengthIndicator password={password} />}
              </FieldContainer>

              {/* Confirm Password Field */}
              <FieldContainer delay={0.25}>
                <Label className="text-white/80 mb-2 block">Confirm Password</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-lg"
                />
              </FieldContainer>

              {/* Terms Checkbox */}
              <FieldContainer delay={0.3}>
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={agreedToTerms}
                    onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                    className="mt-1"
                  />
                  <label className="text-sm text-white/70">
                    I agree to the Terms & Conditions and Privacy Policy
                  </label>
                </div>
              </FieldContainer>

              {/* Navigation */}
              <div className="flex gap-4 mt-8 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowLeft size={20} />
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleRegister}
                  disabled={registerMutation.isPending}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-pink-500 to-purple-500 hover:shadow-lg text-white font-semibold rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {registerMutation.isPending ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <>
                      Next
                      <ArrowRight size={20} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  // Step 3: Verify Email
  if (currentStep === 3) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-gradient-to-br from-gray-900 via-purple-900 to-black overflow-hidden"
      >
        <div className="absolute inset-0 overflow-hidden">
          <FloatingBubbles count={3} className="absolute opacity-20" />
        </div>

        <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{
              type: "spring" as const,
              stiffness: 400,
              damping: 30,
            }}
            className={`w-full max-w-md ${cardClasses} backdrop-blur-2xl rounded-2xl p-8`}
          >
            {/* Step Header */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-8"
            >
              <h2 className="text-3xl font-bold text-white mb-2">Verify Your Email</h2>
              <p className="text-gray-400">Step 3 of 7</p>
            </motion.div>

            <div className="space-y-6">
              {/* Mail Icon Animation */}
              <FieldContainer delay={0.15}>
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="flex justify-center"
                >
                  <Mail size={48} className="text-pink-400" />
                </motion.div>
              </FieldContainer>

              {/* Instructions */}
              <FieldContainer delay={0.2}>
                <p className="text-center text-white/70 text-sm">
                  We've sent a 6-digit code to <span className="font-semibold">{email}</span>
                </p>
              </FieldContainer>

              {/* OTP Input */}
              <FieldContainer delay={0.25}>
                <Label className="text-white/80 mb-4 block text-center">
                  Enter Code
                </Label>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={verificationCode}
                    onChange={setVerificationCode}
                  >
                    <InputOTPGroup className="gap-2">
                      {[...Array(6)].map((_, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.05 }}
                        >
                          <InputOTPSlot
                            index={i}
                            className="w-12 h-12 text-2xl bg-white/10 border-white/20 text-white rounded-lg"
                          />
                        </motion.div>
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </FieldContainer>

              {/* Resend Code */}
              <FieldContainer delay={0.3}>
                <div className="text-center">
                  {resendTimer > 0 ? (
                    <p className="text-white/60 text-sm flex items-center justify-center gap-2">
                      <Clock size={16} />
                      Resend code in {resendTimer}s
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendCode}
                      disabled={resendVerificationMutation.isPending}
                      className="text-pink-400 hover:text-pink-300 font-semibold text-sm transition-colors disabled:opacity-50"
                    >
                      {resendVerificationMutation.isPending
                        ? "Sending..."
                        : "Resend Code"}
                    </button>
                  )}
                </div>
              </FieldContainer>

              {/* Navigation */}
              <div className="flex gap-4 mt-8 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowLeft size={20} />
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleVerifyEmail}
                  disabled={verifyEmailMutation.isPending || verificationCode.length !== 6}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-pink-500 to-purple-500 hover:shadow-lg text-white font-semibold rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {verifyEmailMutation.isPending ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <>
                      Verify
                      <ArrowRight size={20} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  // Step 4: About You
  if (currentStep === 4) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="min-h-screen bg-gradient-to-br from-gray-50 via-pink-50 to-purple-50 overflow-y-auto py-12 px-4"
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <FloatingBubbles count={2} className="absolute opacity-10" />
        </div>

        <div className="relative z-10 max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{
              type: "spring" as const,
              stiffness: 400,
              damping: 30,
            }}
            className={`${cardClasses} backdrop-blur-2xl rounded-2xl p-8`}
          >
            {/* Step Header */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-8"
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Tell Us About Yourself</h2>
              <p className="text-gray-600">Step 4 of 7</p>
            </motion.div>

            <div className="space-y-8">
              {/* Display Name */}
              <FieldContainer delay={0.15}>
                <Label className="text-gray-700 mb-2 block font-semibold">Display Name</Label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="How should we call you?"
                  className="bg-white/60 border-gray-200 text-gray-900 placeholder:text-gray-500 rounded-lg"
                />
              </FieldContainer>

              {/* Gender */}
              <FieldContainer delay={0.2}>
                <Label className="text-gray-700 mb-4 block font-semibold">Gender</Label>
                <div className="flex flex-wrap gap-2">
                  {GENDER_OPTIONS.map((option) => (
                    <AnimatedChip
                      key={option.label}
                      label={option.label}
                      icon={option.icon}
                      selected={gender === option.label}
                      onClick={() => setGender(option.label)}
                      chipType="gender"
                    />
                  ))}
                </div>
              </FieldContainer>

              {/* Date of Birth */}
              <FieldContainer delay={0.25}>
                <Label className="text-gray-700 mb-2 block font-semibold">Date of Birth</Label>
                <Input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="bg-white/60 border-gray-200 text-gray-900 rounded-lg"
                />
              </FieldContainer>

              {/* Bio */}
              <FieldContainer delay={0.3}>
                <Label className="text-gray-700 mb-2 block font-semibold">
                  Bio ({bio.length}/500)
                </Label>
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, 500))}
                  placeholder="Tell us about yourself, your interests, and what you're looking for..."
                  className="bg-white/60 border-gray-200 text-gray-900 placeholder:text-gray-500 rounded-lg min-h-24"
                />
              </FieldContainer>

              {/* Orientation */}
              <FieldContainer delay={0.35}>
                <Label className="text-gray-700 mb-4 block font-semibold">Orientation</Label>
                <div className="flex flex-wrap gap-2">
                  {ORIENTATION_OPTIONS.map((option) => (
                    <AnimatedChip
                      key={option.label}
                      label={option.label}
                      icon={option.icon}
                      selected={orientation === option.label}
                      onClick={() => setOrientation(option.label)}
                      chipType="orientation"
                    />
                  ))}
                </div>
              </FieldContainer>

              {/* Relationship Status */}
              <FieldContainer delay={0.4}>
                <Label className="text-gray-700 mb-4 block font-semibold">
                  Relationship Status
                </Label>
                <div className="flex flex-wrap gap-2">
                  {RELATIONSHIP_STATUS_OPTIONS.map((option) => (
                    <AnimatedChip
                      key={option.label}
                      label={option.label}
                      icon={option.icon}
                      selected={relationshipStatus === option.label}
                      onClick={() => setRelationshipStatus(option.label)}
                      chipType="relationshipStatus"
                    />
                  ))}
                </div>
              </FieldContainer>

              {/* Location */}
              <FieldContainer delay={0.45}>
                <Label className="text-gray-700 mb-2 block font-semibold">Location</Label>
                <div className="relative">
                  <MapPin
                    size={20}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                  />
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="City, State or Country"
                    className="bg-white/60 border-gray-200 text-gray-900 placeholder:text-gray-500 rounded-lg pl-10"
                  />
                </div>
              </FieldContainer>

              {/* Community */}
              <FieldContainer delay={0.5}>
                <Label className="text-gray-700 mb-4 block font-semibold">Community</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {COMMUNITY_OPTIONS.map((option) => (
                    <CommunityCard
                      key={option.id}
                      option={option}
                      selected={communityId === option.id}
                      onClick={() => setCommunityId(option.id)}
                    />
                  ))}
                </div>
              </FieldContainer>

              {/* Phone */}
              <FieldContainer delay={0.55}>
                <Label className="text-gray-700 mb-2 block font-semibold">Phone (Optional)</Label>
                <div className="relative">
                  <Phone
                    size={20}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                  />
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="bg-white/60 border-gray-200 text-gray-900 placeholder:text-gray-500 rounded-lg pl-10"
                  />
                </div>
              </FieldContainer>

              {/* Navigation */}
              <div className="flex gap-4 mt-8 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowLeft size={20} />
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleAboutYouNext}
                  disabled={upsertProfileMutation.isPending}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-pink-500 to-purple-500 hover:shadow-lg text-white font-semibold rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {upsertProfileMutation.isPending ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <>
                      Next
                      <ArrowRight size={20} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  // Step 5: Photos
  if (currentStep === 5) {
    const uploadedPhotos = photos.filter((p) => p.photoId);

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="min-h-screen bg-gradient-to-br from-gray-50 via-pink-50 to-purple-50 overflow-y-auto py-12 px-4"
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <FloatingBubbles count={2} className="absolute opacity-10" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{
              type: "spring" as const,
              stiffness: 400,
              damping: 30,
            }}
            className={`${cardClasses} backdrop-blur-2xl rounded-2xl p-8`}
          >
            {/* Step Header */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-8"
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Upload Your Photos</h2>
              <p className="text-gray-600 mb-4">Step 5 of 7</p>
              <p className="text-sm text-gray-700 bg-blue-50 border border-blue-200 rounded-lg p-4">
                Photos are used for application review and will be managed after approval. Your
                first photo will be your profile picture.
              </p>
            </motion.div>

            {/* Photo Grid */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-8"
            >
              <div className="grid grid-cols-3 gap-4 mb-8">
                {/* Upload Slot (First slot is featured on mobile) */}
                <div className="col-span-3 md:col-span-1 md:row-span-2">
                  <motion.label
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full h-48 md:h-full min-h-96 border-2 border-dashed border-gray-300 hover:border-pink-400 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors bg-white/40 hover:bg-white/60"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                    <Upload size={32} className="text-gray-400 mb-2" />
                    <span className="text-gray-700 font-semibold text-center px-2">
                      Click or drag photos
                    </span>
                    <span className="text-xs text-gray-500 mt-1">JPG, PNG (Max 10MB)</span>
                  </motion.label>
                </div>

                {/* Uploaded Photos */}
                {photos.map((photo, idx) => (
                  <motion.div
                    key={photo.id}
                    initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.8, rotate: 5 }}
                    transition={{
                      type: "spring" as const,
                      stiffness: 400,
                      damping: 25,
                    }}
                    className="relative group"
                  >
                    <div className="relative w-full h-48 bg-gray-200 rounded-lg overflow-hidden">
                      <img
                        src={photo.preview}
                        alt={`Photo ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />

                      {/* Profile Photo Badge */}
                      {idx === 0 && uploadedPhotos.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute top-2 left-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1"
                        >
                          <Star size={12} />
                          PROFILE PHOTO
                        </motion.div>
                      )}

                      {/* Loading/Error State */}
                      {(photo.uploading || photo.error) && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          {photo.uploading ? (
                            <Loader2 size={32} className="text-white animate-spin" />
                          ) : (
                            <div className="text-center">
                              <X size={32} className="text-red-400 mx-auto mb-2" />
                              <p className="text-white text-xs">{photo.error}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Delete Button */}
                      {photo.photoId && (
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleDeletePhoto(photo.id)}
                          className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={16} />
                        </motion.button>
                      )}

                      {/* Success Checkmark */}
                      {photo.photoId && !photo.uploading && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute bottom-2 right-2 bg-green-500 text-white p-1 rounded-full"
                        >
                          <Check size={16} />
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Photo Count Info */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-sm text-gray-600 mb-4"
              >
                <p>
                  Uploaded: <span className="font-semibold">{uploadedPhotos.length}</span> of 3-6
                  photos
                  {uploadedPhotos.length < 3 && (
                    <span className="text-red-600 ml-2">
                      (Minimum 3 photos required)
                    </span>
                  )}
                </p>
              </motion.div>
            </motion.div>

            {/* Navigation */}
            <div className="flex gap-4 mt-8 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft size={20} />
                Back
              </button>
              <button
                type="button"
                onClick={handlePhotosNext}
                disabled={uploadedPhotos.length < 3}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-pink-500 to-purple-500 hover:shadow-lg text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                Next
                <ArrowRight size={20} />
              </button>
            </div>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  // Step 6: Preferences
  if (currentStep === 6) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="min-h-screen bg-gradient-to-br from-gray-50 via-pink-50 to-purple-50 overflow-y-auto py-12 px-4"
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <FloatingBubbles count={2} className="absolute opacity-10" />
        </div>

        <div className="relative z-10 max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{
              type: "spring" as const,
              stiffness: 400,
              damping: 30,
            }}
            className={`${cardClasses} backdrop-blur-2xl rounded-2xl p-8`}
          >
            {/* Step Header */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-8"
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Your Preferences</h2>
              <p className="text-gray-600">Step 6 of 7</p>
            </motion.div>

            <div className="space-y-8">
              {/* Interests */}
              <FieldContainer delay={0.15}>
                <Label className="text-gray-700 mb-4 block font-semibold">
                  What are you interested in?
                </Label>
                <div className="flex flex-wrap gap-2">
                  {INTERESTS.map((interest) => (
                    <AnimatedChip
                      key={interest}
                      label={interest}
                      selected={interests.includes(interest)}
                      onClick={() => {
                        if (interests.includes(interest)) {
                          setInterests(interests.filter((i) => i !== interest));
                        } else {
                          setInterests([...interests, interest]);
                        }
                      }}
                      chipType="interests"
                    />
                  ))}
                </div>
              </FieldContainer>

              {/* Looking For */}
              <FieldContainer delay={0.2}>
                <Label className="text-gray-700 mb-4 block font-semibold">
                  What are you looking for?
                </Label>
                <div className="flex flex-wrap gap-2">
                  {LOOKING_FOR.map((item) => (
                    <AnimatedChip
                      key={item}
                      label={item}
                      selected={lookingFor.includes(item)}
                      onClick={() => {
                        if (lookingFor.includes(item)) {
                          setLookingFor(lookingFor.filter((i) => i !== item));
                        } else {
                          setLookingFor([...lookingFor, item]);
                        }
                      }}
                      chipType="lookingFor"
                    />
                  ))}
                </div>
              </FieldContainer>

              {/* Navigation */}
              <div className="flex gap-4 mt-8 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setCurrentStep(5)}
                  className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowLeft size={20} />
                  Back
                </button>
                <button
                  type="button"
                  onClick={handlePreferencesNext}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-pink-500 to-purple-500 hover:shadow-lg text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  Next
                  <ArrowRight size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  // Step 7: Review & Submit
  if (currentStep === 7) {
    const uploadedPhotos = photos.filter((p) => p.photoId);

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="min-h-screen bg-gradient-to-br from-gray-50 via-pink-50 to-purple-50 overflow-y-auto py-12 px-4"
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <FloatingBubbles count={2} className="absolute opacity-10" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{
              type: "spring" as const,
              stiffness: 400,
              damping: 30,
            }}
            className={`${cardClasses} backdrop-blur-2xl rounded-2xl p-8`}
          >
            {/* Step Header */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-8"
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Review Your Application</h2>
              <p className="text-gray-600">Step 7 of 7</p>
            </motion.div>

            <div className="space-y-8">
              {/* Account Info */}
              <FieldContainer delay={0.15}>
                <div className="bg-white/50 rounded-lg p-6 border border-gray-200">
                  <h3 className="font-bold text-gray-900 mb-4">Account Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Email</p>
                      <p className="font-semibold text-gray-900">{email}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Display Name</p>
                      <p className="font-semibold text-gray-900">{displayName}</p>
                    </div>
                  </div>
                </div>
              </FieldContainer>

              {/* Profile Info */}
              <FieldContainer delay={0.2}>
                <div className="bg-white/50 rounded-lg p-6 border border-gray-200">
                  <h3 className="font-bold text-gray-900 mb-4">Profile Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Gender</p>
                      <p className="font-semibold text-gray-900">{gender}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Orientation</p>
                      <p className="font-semibold text-gray-900">{orientation || "Not specified"}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Relationship Status</p>
                      <p className="font-semibold text-gray-900">
                        {relationshipStatus || "Not specified"}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Location</p>
                      <p className="font-semibold text-gray-900">{location}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Date of Birth</p>
                      <p className="font-semibold text-gray-900">{dateOfBirth}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Community</p>
                      <p className="font-semibold text-gray-900">
                        {COMMUNITY_OPTIONS.find((c) => c.id === communityId)?.name}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-gray-600 text-xs mb-2">Bio</p>
                    <p className="text-gray-900 whitespace-pre-wrap">{bio}</p>
                  </div>
                </div>
              </FieldContainer>

              {/* Photos */}
              <FieldContainer delay={0.25}>
                <div className="bg-white/50 rounded-lg p-6 border border-gray-200">
                  <h3 className="font-bold text-gray-900 mb-4">Your Photos</h3>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {uploadedPhotos.map((photo, idx) => (
                      <motion.div
                        key={photo.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.25 + idx * 0.05 }}
                        className="flex-shrink-0"
                      >
                        <img
                          src={photo.preview}
                          alt={`Photo ${idx + 1}`}
                          className="w-24 h-24 object-cover rounded-lg border-2 border-pink-300"
                        />
                        {idx === 0 && (
                          <p className="text-xs font-semibold text-pink-600 mt-1 text-center">
                            Profile
                          </p>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
              </FieldContainer>

              {/* Preferences */}
              <FieldContainer delay={0.3}>
                <div className="bg-white/50 rounded-lg p-6 border border-gray-200">
                  <h3 className="font-bold text-gray-900 mb-4">Preferences</h3>
                  <div className="mb-4">
                    <p className="text-gray-600 text-sm mb-2">Interests</p>
                    <div className="flex flex-wrap gap-2">
                      {interests.map((interest) => (
                        <span
                          key={interest}
                          className="bg-gradient-to-r from-pink-100 to-purple-100 text-gray-900 text-xs font-semibold px-3 py-1 rounded-full"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm mb-2">Looking For</p>
                    <div className="flex flex-wrap gap-2">
                      {lookingFor.map((item) => (
                        <span
                          key={item}
                          className="bg-gradient-to-r from-pink-100 to-purple-100 text-gray-900 text-xs font-semibold px-3 py-1 rounded-full"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </FieldContainer>

              {/* Guidelines & Waiver */}
              <FieldContainer delay={0.35}>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="guidelines"
                      defaultChecked
                      className="mt-1"
                    />
                    <label htmlFor="guidelines" className="text-sm text-gray-700">
                      I agree to follow the Community Guidelines and code of conduct
                    </label>
                  </div>
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="waiver"
                      defaultChecked
                      className="mt-1"
                    />
                    <label htmlFor="waiver" className="text-sm text-gray-700">
                      I understand and accept the Waiver and Terms of Service
                    </label>
                  </div>
                </div>
              </FieldContainer>

              {/* Navigation */}
              <div className="flex gap-4 mt-8 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setCurrentStep(6)}
                  className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowLeft size={20} />
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleSubmitApplication}
                  disabled={submitApplicationMutation.isPending}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-pink-500 to-purple-500 hover:shadow-lg text-white font-semibold rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitApplicationMutation.isPending ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <>
                      Submit Application
                      <CheckCircle2 size={20} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  return null;
}
