import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { trpc } from "@/lib/trpc";
import { FloatingBubbles, MorphBlob, GlowOrb } from "@/components/FloatingElements";
import { Lock, ArrowLeft, KeyRound, Loader2, Check, Mail } from "lucide-react";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663460303717/FfTbhpP94ZvscRd7twWNT6/soapies-logo_cf3c72b2.png";

interface ConfettiPieceProps {
  delay: number;
}

const ConfettiPiece = ({ delay }: ConfettiPieceProps) => {
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
        <span
          className={`text-xs font-semibold ${
            strength === "weak" ? "text-red-400" : strength === "medium" ? "text-yellow-400" : "text-green-400"
          }`}
        >
          {strengthLabel[strength]}
        </span>
      </div>
      <motion.div className="h-1.5 bg-gray-700 rounded-full overflow-hidden" layoutId="strength-bar">
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

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const requestPasswordResetMutation = trpc.auth.requestPasswordReset.useMutation({
    onSuccess: () => {
      toast.success("Reset code sent to your email");
      setStep("reset");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send reset code");
    },
  });

  const resetPasswordMutation = trpc.auth.resetPassword.useMutation({
    onSuccess: () => {
      setShowSuccess(true);
      setTimeout(() => {
        toast.success("Password reset successfully!");
        setLocation("/login");
      }, 1500);
    },
    onError: (error) => {
      toast.error(error.message || "Password reset failed");
    },
  });

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email");
      return;
    }
    requestPasswordResetMutation.mutate({ email });
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resetCode || resetCode.length < 6) {
      toast.error("Please enter a valid code");
      return;
    }

    if (!newPassword || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    resetPasswordMutation.mutate({
      email,
      code: resetCode,
      newPassword,
    });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" as const },
    },
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
    }),
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="fixed inset-0">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5 }}
          className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"
        />
        <FloatingBubbles />
        <MorphBlob className="absolute top-20 right-10 opacity-40" />
        <MorphBlob color="from-purple-400 to-pink-300" className="absolute bottom-20 left-10 opacity-30" />
        <GlowOrb className="absolute top-1/3 right-1/4 opacity-20" />
        <GlowOrb color="oklch(0.55 0.25 310 / 0.15)" className="absolute bottom-1/3 left-1/3 opacity-15" />
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="text-center mb-8"
          >
            <motion.div
              variants={itemVariants}
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <img src={LOGO_URL} alt="Soapies" className="h-16 mx-auto mb-6" />
            </motion.div>

            <motion.h1 variants={itemVariants} className="text-4xl font-display font-bold mb-2">
              <span className="text-gradient">Reset Password</span>
            </motion.h1>

            <motion.p variants={itemVariants} className="text-gray-300 text-sm font-sans">
              {step === "email"
                ? "Enter your email to receive a reset code"
                : "Enter your reset code and new password"}
            </motion.p>
          </motion.div>

          <AnimatePresence mode="wait" custom={step === "reset" ? 1 : -1}>
            {step === "email" ? (
              <motion.div
                key="email-step"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: "spring", stiffness: 300, damping: 30 },
                  opacity: { duration: 0.2 },
                }}
                custom={-1}
              >
                <Card className="glass glass-strong backdrop-blur-xl border border-pink-500/20 shadow-2xl">
                  <CardContent className="pt-8 pb-6 px-6">
                    <form onSubmit={handleRequestReset} className="space-y-6">
                      <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="space-y-3"
                      >
                        <motion.div variants={itemVariants}>
                          <Label className="text-sm font-medium text-gray-200 flex items-center gap-2">
                            <Mail className="w-4 h-4 text-pink-400" />
                            Email Address
                          </Label>
                        </motion.div>

                        <motion.div variants={itemVariants} className="relative">
                          <Input
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={requestPasswordResetMutation.isPending}
                            className="bg-gray-800/50 border border-gray-700/50 text-white placeholder-gray-500 transition-all duration-300 focus:outline-none focus:ring-0 focus:border-pink-500/80 focus:shadow-lg focus:shadow-pink-500/20"
                          />
                        </motion.div>
                      </motion.div>

                      <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="pt-2"
                      >
                        <motion.div variants={itemVariants}>
                          <motion.button
                            type="submit"
                            disabled={requestPasswordResetMutation.isPending}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="btn-premium w-full relative overflow-hidden group"
                          >
                            <span className="relative z-10 flex items-center justify-center gap-2 font-medium">
                              {requestPasswordResetMutation.isPending ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Sending...
                                </>
                              ) : (
                                <>
                                  Send Reset Code
                                  <ArrowLeft className="w-4 h-4 rotate-180" />
                                </>
                              )}
                            </span>
                          </motion.button>
                        </motion.div>
                      </motion.div>
                    </form>

                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6, duration: 0.5 }}
                      className="mt-4 text-center"
                    >
                      <Link href="/login">
                        <button className="text-sm text-gray-400 hover:text-gray-200 transition-colors inline-flex items-center gap-2 group">
                          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                          Back to Login
                        </button>
                      </Link>
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="reset-step"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: "spring", stiffness: 300, damping: 30 },
                  opacity: { duration: 0.2 },
                }}
                custom={1}
              >
                <Card className="glass glass-strong backdrop-blur-xl border border-pink-500/20 shadow-2xl">
                  <CardContent className="pt-8 pb-6 px-6">
                    <form onSubmit={handleResetPassword} className="space-y-6">
                      <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="space-y-3"
                      >
                        <motion.div variants={itemVariants}>
                          <Label className="text-sm font-medium text-gray-200 flex items-center gap-2">
                            <KeyRound className="w-4 h-4 text-pink-400" />
                            Reset Code
                          </Label>
                        </motion.div>

                        <motion.div variants={itemVariants} className="flex justify-center py-6">
                          <motion.div
                            animate={{
                              boxShadow:
                                resetCode.length > 0
                                  ? [
                                      "0 0 0 0px rgba(236, 72, 153, 0.2)",
                                      "0 0 20px 8px rgba(236, 72, 153, 0.1)",
                                      "0 0 0 0px rgba(236, 72, 153, 0.2)",
                                    ]
                                  : "0 0 0 0px rgba(236, 72, 153, 0)",
                            }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="rounded-lg"
                          >
                            <InputOTP
                              maxLength={6}
                              value={resetCode}
                              onChange={setResetCode}
                              disabled={resetPasswordMutation.isPending}
                            >
                              <InputOTPGroup>
                                {[0, 1, 2, 3, 4, 5].map((i) => (
                                  <InputOTPSlot key={i} index={i} />
                                ))}
                              </InputOTPGroup>
                            </InputOTP>
                          </motion.div>
                        </motion.div>
                      </motion.div>

                      <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="space-y-3"
                      >
                        <motion.div variants={itemVariants}>
                          <Label className="text-sm font-medium text-gray-200 flex items-center gap-2">
                            <Lock className="w-4 h-4 text-pink-400" />
                            New Password
                          </Label>
                        </motion.div>

                        <motion.div variants={itemVariants} className="relative">
                          <Input
                            id="newPassword"
                            type="password"
                            placeholder="••••••••"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            disabled={resetPasswordMutation.isPending}
                            className="bg-gray-800/50 border border-gray-700/50 text-white placeholder-gray-500 transition-all duration-300 focus:outline-none focus:ring-0 focus:border-pink-500/80 focus:shadow-lg focus:shadow-pink-500/20"
                          />
                        </motion.div>

                        <AnimatePresence>
                          {newPassword && <PasswordStrengthIndicator password={newPassword} />}
                        </AnimatePresence>

                        <p className="text-xs text-gray-400">At least 8 characters</p>
                      </motion.div>

                      <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="space-y-3"
                      >
                        <motion.div variants={itemVariants}>
                          <Label className="text-sm font-medium text-gray-200 flex items-center gap-2">
                            <Lock className="w-4 h-4 text-pink-400" />
                            Confirm Password
                          </Label>
                        </motion.div>

                        <motion.div variants={itemVariants} className="relative">
                          <Input
                            id="confirmPassword"
                            type="password"
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            disabled={resetPasswordMutation.isPending}
                            className="bg-gray-800/50 border border-gray-700/50 text-white placeholder-gray-500 transition-all duration-300 focus:outline-none focus:ring-0 focus:border-pink-500/80 focus:shadow-lg focus:shadow-pink-500/20"
                          />
                        </motion.div>
                      </motion.div>

                      <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="pt-2"
                      >
                        <motion.div variants={itemVariants}>
                          <motion.button
                            type="submit"
                            disabled={resetPasswordMutation.isPending}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="btn-premium w-full relative overflow-hidden group"
                          >
                            <span className="relative z-10 flex items-center justify-center gap-2 font-medium">
                              {resetPasswordMutation.isPending ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Resetting...
                                </>
                              ) : (
                                <>
                                  Reset Password
                                  <Check className="w-4 h-4" />
                                </>
                              )}
                            </span>
                          </motion.button>
                        </motion.div>
                      </motion.div>
                    </form>

                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6, duration: 0.5 }}
                      className="mt-4 text-center"
                    >
                      <motion.button
                        type="button"
                        onClick={() => {
                          setStep("email");
                          setResetCode("");
                          setNewPassword("");
                          setConfirmPassword("");
                        }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="text-sm text-gray-400 hover:text-gray-200 transition-colors inline-flex items-center gap-2 group"
                      >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Back to Email
                      </motion.button>
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <AnimatePresence>
        {showSuccess && <SuccessOverlay />}
      </AnimatePresence>
    </div>
  );
}
