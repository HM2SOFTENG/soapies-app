import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { trpc } from "@/lib/trpc";
import { FloatingBubbles, MorphBlob, GlowOrb } from "@/components/FloatingElements";
import { Mail, ArrowLeft, Loader2, Sparkles, Check } from "lucide-react";

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

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [canResend, setCanResend] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const emailParam = params.get("email");
      if (emailParam) {
        setEmail(decodeURIComponent(emailParam));
      }
    }
  }, []);

  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (resendCountdown === 0 && !canResend && email) {
      setCanResend(true);
    }
  }, [resendCountdown, canResend, email]);

  const verifyEmailMutation = trpc.auth.verifyEmail.useMutation({
    onSuccess: () => {
      setShowSuccess(true);
      setTimeout(() => {
        toast.success("Email verified successfully!");
        setLocation("/apply");
      }, 1500);
    },
    onError: (error) => {
      toast.error(error.message || "Verification failed");
    },
  });

  const resendEmailMutation = trpc.auth.resendEmailVerification.useMutation({
    onSuccess: () => {
      toast.success("Verification code sent!");
      setCanResend(false);
      setResendCountdown(60);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to resend code");
    },
  });

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 6) {
      toast.error("Please enter a valid 6-digit code");
      return;
    }
    if (!email) {
      toast.error("Email is required");
      return;
    }
    verifyEmailMutation.mutate({ email, code: otpCode });
  };

  const handleResendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Email is required");
      return;
    }
    resendEmailMutation.mutate({ email });
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
      transition: { duration: 0.5, ease: "easeOut" },
    },
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
              <img
                src={LOGO_URL}
                alt="Soapies"
                className="h-16 mx-auto mb-6"
              />
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="relative inline-block mb-4"
            >
              <motion.div
                className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center mx-auto"
                animate={{
                  boxShadow: ["0 0 20px rgba(236, 72, 153, 0.3)", "0 0 30px rgba(236, 72, 153, 0.6)", "0 0 20px rgba(236, 72, 153, 0.3)"],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Mail className="h-8 w-8 text-white" />
                </motion.div>
              </motion.div>
            </motion.div>

            <motion.h1 variants={itemVariants} className="text-4xl font-display font-bold mb-2">
              <span className="text-gradient">Check your email</span>
            </motion.h1>

            <motion.p variants={itemVariants} className="text-gray-300 text-sm font-sans">
              {email && (
                <>
                  We sent a verification code to <span className="font-semibold text-pink-400">{email}</span>
                </>
              )}
            </motion.p>
          </motion.div>

          <motion.div
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.15 }}
          >
            <Card className="glass glass-strong backdrop-blur-xl border border-pink-500/20 shadow-2xl">
              <CardContent className="pt-8 pb-6 px-6">
                <form onSubmit={handleVerifyEmail} className="space-y-6">
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-3"
                  >
                    <motion.div variants={itemVariants}>
                      <Label className="text-sm font-medium text-gray-200 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-pink-400" />
                        Verification Code
                      </Label>
                    </motion.div>

                    <motion.div variants={itemVariants} className="flex justify-center py-6">
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
                        disabled={verifyEmailMutation.isPending}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="btn-premium w-full relative overflow-hidden group"
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
                    </motion.div>
                  </motion.div>
                </form>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
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

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8, duration: 0.5 }}
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
        </motion.div>
      </div>

      <AnimatePresence>
        {showSuccess && <SuccessOverlay />}
      </AnimatePresence>
    </div>
  );
}
