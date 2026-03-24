import { useState } from "react";
import { useLocation, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { trpc } from "@/lib/trpc";
import { Mail, Phone, ArrowLeft, Loader2, Sparkles, Check } from "lucide-react";
import { FloatingBubbles, MorphBlob, GlowOrb } from "@/components/FloatingElements";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663460303717/FfTbhpP94ZvscRd7twWNT6/soapies-logo_cf3c72b2.png";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
    },
  },
};

const logoVariants = {
  hidden: { opacity: 0, scale: 0.5 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 80,
      damping: 12,
      delay: 0.1,
    },
  },
};

const shakeVariants = {
  shake: {
    x: [0, -10, 10, -10, 10, 0],
    transition: {
      duration: 0.4,
      ease: "easeInOut",
    },
  },
};

const successVariants = {
  hidden: { opacity: 0, scale: 0 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 20,
    },
  },
  exit: {
    opacity: 0,
    scale: 1.2,
    transition: {
      duration: 0.3,
    },
  },
};

const tabContentVariants = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.2,
    },
  },
};

export default function Login() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("email");
  const [shakeError, setShakeError] = useState<string | null>(null);

  // Email login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Phone OTP state
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [phoneToVerify, setPhoneToVerify] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  // Mutations
  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      setShowSuccess(true);
      setTimeout(() => {
        window.location.href = "/";
      }, 1200);
    },
    onError: (error) => {
      setShakeError("email");
      toast.error(error.message || "Login failed");
      setTimeout(() => setShakeError(null), 400);
    },
  });

  const sendPhoneOtpMutation = trpc.auth.sendPhoneOtp.useMutation({
    onSuccess: (data) => {
      setIsNewUser(data.isNewUser);
      setPhoneToVerify(phone);
      setShowOtpInput(true);
      toast.success("Verification code sent to your phone");
    },
    onError: (error) => {
      setShakeError("phone");
      toast.error(error.message || "Failed to send verification code");
      setTimeout(() => setShakeError(null), 400);
    },
  });

  const verifyPhoneOtpMutation = trpc.auth.verifyPhoneOtp.useMutation({
    onSuccess: () => {
      setShowSuccess(true);
      setTimeout(() => {
        window.location.href = "/";
      }, 1200);
    },
    onError: (error) => {
      setShakeError("otp");
      toast.error(error.message || "Verification failed");
      setTimeout(() => setShakeError(null), 400);
    },
  });

  // Email login handler
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setShakeError("email");
      toast.error("Please fill in all fields");
      setTimeout(() => setShakeError(null), 400);
      return;
    }
    loginMutation.mutate({ email, password });
  };

  // Phone OTP handler - send code
  const handleSendPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) {
      setShakeError("phone");
      toast.error("Please enter a phone number");
      setTimeout(() => setShakeError(null), 400);
      return;
    }
    sendPhoneOtpMutation.mutate({ phone });
  };

  // Phone OTP handler - verify
  const handleVerifyPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 6) {
      setShakeError("otp");
      toast.error("Please enter a valid 6-digit code");
      setTimeout(() => setShakeError(null), 400);
      return;
    }
    if (isNewUser && !newUserName) {
      setShakeError("otp");
      toast.error("Please enter your name");
      setTimeout(() => setShakeError(null), 400);
      return;
    }
    verifyPhoneOtpMutation.mutate({
      phone: phoneToVerify,
      code: otpCode,
      name: isNewUser ? newUserName : undefined,
    });
  };

  const handleBackFromOtp = () => {
    setShowOtpInput(false);
    setOtpCode("");
    setNewUserName("");
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Animated gradient background */}
      <motion.div
        className="fixed inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-pink-100/40 via-background to-purple-100/40" />
        <div className="absolute inset-0 bg-gradient-to-tl from-purple-50/30 via-transparent to-pink-50/30" />
      </motion.div>

      {/* Floating Elements - Background Animation */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <FloatingBubbles count={4} />
        <MorphBlob className="absolute top-20 left-10 opacity-40" />
        <MorphBlob color="from-purple-400 to-pink-300" className="absolute bottom-20 right-10 opacity-30" />
        <GlowOrb className="absolute top-1/3 right-1/4" />
        <GlowOrb color="oklch(0.55 0.25 310 / 0.12)" className="absolute bottom-1/3 left-1/3" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Logo with entrance animation */}
          <motion.div
            className="text-center mb-8"
            variants={logoVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="relative inline-block">
              <motion.img
                src={LOGO_URL}
                alt="Soapies"
                className="h-20 mx-auto mb-6 drop-shadow-lg"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              />
              <motion.div
                className="absolute -top-2 -right-2"
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="w-5 h-5 text-pink-500" />
              </motion.div>
            </div>

            <motion.h1
              className="text-3xl font-display font-bold text-foreground"
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.2 }}
            >
              Welcome Back
            </motion.h1>
            <motion.p
              className="text-sm text-muted-foreground mt-2"
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.3 }}
            >
              Sign in to your Soapies account
            </motion.p>
          </motion.div>

          {/* Main Card Container */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="relative"
          >
            <div className="glass-strong card-premium card-glow rounded-2xl overflow-hidden p-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                {/* Tab List */}
                <motion.div variants={itemVariants}>
                  <TabsList className="grid w-full grid-cols-2 mb-6 bg-white/50 p-1 rounded-lg">
                    <TabsTrigger
                      value="email"
                      className="flex items-center gap-2 font-medium transition-all data-[state=active]:bg-white data-[state=active]:shadow-md"
                    >
                      <Mail className="h-4 w-4" />
                      Email
                    </TabsTrigger>
                    <TabsTrigger
                      value="phone"
                      className="flex items-center gap-2 font-medium transition-all data-[state=active]:bg-white data-[state=active]:shadow-md"
                    >
                      <Phone className="h-4 w-4" />
                      Phone
                    </TabsTrigger>
                  </TabsList>
                </motion.div>

                {/* Email Tab */}
                <AnimatePresence mode="wait">
                  {activeTab === "email" && (
                    <motion.div
                      key="email-tab"
                      variants={tabContentVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                    >
                      <TabsContent value="email" className="mt-0">
                        <motion.form
                          onSubmit={handleEmailLogin}
                          className="space-y-4"
                          variants={containerVariants}
                          initial="hidden"
                          animate="visible"
                        >
                          {/* Email Input */}
                          <motion.div
                            className="space-y-2"
                            variants={itemVariants}
                            animate={shakeError === "email" ? "shake" : "initial"}
                          >
                            <Label
                              htmlFor="email"
                              className="text-sm font-medium text-foreground"
                            >
                              Email Address
                            </Label>
                            <motion.div
                              whileFocus={{ scale: 1.02 }}
                              transition={{ type: "spring", stiffness: 300 }}
                            >
                              <Input
                                id="email"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={loginMutation.isPending}
                                className="h-11 bg-white/60 border-pink-200/50 focus:border-primary transition-all text-foreground placeholder:text-muted-foreground"
                              />
                            </motion.div>
                          </motion.div>

                          {/* Password Input */}
                          <motion.div
                            className="space-y-2"
                            variants={itemVariants}
                            animate={shakeError === "email" ? "shake" : "initial"}
                          >
                            <Label
                              htmlFor="password"
                              className="text-sm font-medium text-foreground"
                            >
                              Password
                            </Label>
                            <motion.div
                              whileFocus={{ scale: 1.02 }}
                              transition={{ type: "spring", stiffness: 300 }}
                            >
                              <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loginMutation.isPending}
                                className="h-11 bg-white/60 border-pink-200/50 focus:border-primary transition-all text-foreground placeholder:text-muted-foreground"
                              />
                            </motion.div>
                          </motion.div>

                          {/* Sign In Button */}
                          <motion.div variants={itemVariants} className="pt-2">
                            <motion.button
                              type="submit"
                              disabled={loginMutation.isPending}
                              className="w-full h-11 btn-premium font-semibold rounded-lg flex items-center justify-center gap-2 disabled:opacity-75"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              {loginMutation.isPending ? (
                                <>
                                  <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{
                                      duration: 1,
                                      repeat: Infinity,
                                      ease: "linear",
                                    }}
                                  >
                                    <Loader2 className="h-4 w-4" />
                                  </motion.div>
                                  Signing in...
                                </>
                              ) : (
                                "Sign In"
                              )}
                            </motion.button>
                          </motion.div>

                          {/* Links */}
                          <motion.div
                            className="mt-6 space-y-3 text-center text-sm"
                            variants={itemVariants}
                          >
                            <div>
                              <Link href="/forgot-password">
                                <motion.span
                                  className="text-primary font-medium cursor-pointer transition-colors hover:opacity-80"
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  Forgot password?
                                </motion.span>
                              </Link>
                            </div>
                            <div className="text-muted-foreground">
                              Don't have an account?{" "}
                              <Link href="/join">
                                <motion.span
                                  className="text-primary font-medium cursor-pointer transition-colors hover:opacity-80"
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  Sign up
                                </motion.span>
                              </Link>
                            </div>
                          </motion.div>
                        </motion.form>
                      </TabsContent>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Phone Tab */}
                <AnimatePresence mode="wait">
                  {activeTab === "phone" && (
                    <motion.div
                      key="phone-tab"
                      variants={tabContentVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                    >
                      <TabsContent value="phone" className="mt-0">
                        <AnimatePresence mode="wait">
                          {!showOtpInput ? (
                            <motion.form
                              key="phone-form"
                              onSubmit={handleSendPhoneOtp}
                              className="space-y-4"
                              variants={containerVariants}
                              initial="hidden"
                              animate="visible"
                              exit="exit"
                            >
                              {/* Phone Input */}
                              <motion.div
                                className="space-y-2"
                                variants={itemVariants}
                                animate={shakeError === "phone" ? "shake" : "initial"}
                              >
                                <Label
                                  htmlFor="phone"
                                  className="text-sm font-medium text-foreground"
                                >
                                  Phone Number
                                </Label>
                                <motion.div
                                  whileFocus={{ scale: 1.02 }}
                                  transition={{ type: "spring", stiffness: 300 }}
                                >
                                  <Input
                                    id="phone"
                                    type="tel"
                                    placeholder="+1 (555) 000-0000"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    disabled={sendPhoneOtpMutation.isPending}
                                    className="h-11 bg-white/60 border-pink-200/50 focus:border-primary transition-all text-foreground placeholder:text-muted-foreground"
                                  />
                                </motion.div>
                                <motion.p
                                  className="text-xs text-muted-foreground"
                                  variants={itemVariants}
                                >
                                  Include country code (e.g., +1 for US)
                                </motion.p>
                              </motion.div>

                              {/* Send Code Button */}
                              <motion.div variants={itemVariants} className="pt-2">
                                <motion.button
                                  type="submit"
                                  disabled={sendPhoneOtpMutation.isPending}
                                  className="w-full h-11 btn-premium font-semibold rounded-lg flex items-center justify-center gap-2 disabled:opacity-75"
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                >
                                  {sendPhoneOtpMutation.isPending ? (
                                    <>
                                      <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{
                                          duration: 1,
                                          repeat: Infinity,
                                          ease: "linear",
                                        }}
                                      >
                                        <Loader2 className="h-4 w-4" />
                                      </motion.div>
                                      Sending...
                                    </>
                                  ) : (
                                    "Send Code"
                                  )}
                                </motion.button>
                              </motion.div>

                              {/* Sign Up Link */}
                              <motion.div
                                className="mt-6 text-center text-sm text-muted-foreground"
                                variants={itemVariants}
                              >
                                Don't have an account?{" "}
                                <Link href="/join">
                                  <motion.span
                                    className="text-primary font-medium cursor-pointer transition-colors hover:opacity-80"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    Sign up
                                  </motion.span>
                                </Link>
                              </motion.div>
                            </motion.form>
                          ) : (
                            <motion.form
                              key="otp-form"
                              onSubmit={handleVerifyPhoneOtp}
                              className="space-y-4"
                              variants={containerVariants}
                              initial="hidden"
                              animate="visible"
                              exit="exit"
                            >
                              {/* Back Button */}
                              <motion.div variants={itemVariants}>
                                <motion.button
                                  type="button"
                                  onClick={handleBackFromOtp}
                                  className="flex items-center gap-2 text-sm text-primary font-medium hover:opacity-80 transition-opacity"
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  <ArrowLeft className="h-4 w-4" />
                                  Back to phone number
                                </motion.button>
                              </motion.div>

                              {/* Verification Message */}
                              <motion.div
                                className="text-center mb-4 p-3 rounded-lg bg-pink-50/50"
                                variants={itemVariants}
                              >
                                <motion.p
                                  className="text-sm text-foreground"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ delay: 0.2 }}
                                >
                                  We sent a code to{" "}
                                  <span className="font-semibold text-primary">
                                    {phoneToVerify}
                                  </span>
                                </motion.p>
                              </motion.div>

                              {/* Name Input (for new users) */}
                              {isNewUser && (
                                <motion.div
                                  className="space-y-2"
                                  variants={itemVariants}
                                  animate={shakeError === "otp" ? "shake" : "initial"}
                                >
                                  <Label
                                    htmlFor="name"
                                    className="text-sm font-medium text-foreground"
                                  >
                                    Your Name
                                  </Label>
                                  <motion.div
                                    whileFocus={{ scale: 1.02 }}
                                    transition={{ type: "spring", stiffness: 300 }}
                                  >
                                    <Input
                                      id="name"
                                      type="text"
                                      placeholder="John Doe"
                                      value={newUserName}
                                      onChange={(e) => setNewUserName(e.target.value)}
                                      disabled={verifyPhoneOtpMutation.isPending}
                                      className="h-11 bg-white/60 border-pink-200/50 focus:border-primary transition-all text-foreground placeholder:text-muted-foreground"
                                    />
                                  </motion.div>
                                </motion.div>
                              )}

                              {/* OTP Input */}
                              <motion.div
                                className="space-y-3"
                                variants={itemVariants}
                                animate={shakeError === "otp" ? "shake" : "initial"}
                              >
                                <Label className="text-sm font-medium text-foreground block text-center">
                                  Verification Code
                                </Label>
                                <motion.div
                                  className="flex justify-center"
                                  whileFocus={{ scale: 1.02 }}
                                  transition={{ type: "spring", stiffness: 300 }}
                                >
                                  <div className="relative">
                                    <InputOTP
                                      maxLength={6}
                                      value={otpCode}
                                      onChange={setOtpCode}
                                      disabled={verifyPhoneOtpMutation.isPending}
                                    >
                                      <InputOTPGroup className="gap-2 bg-white/50 p-3 rounded-lg">
                                        {[0, 1, 2, 3, 4, 5].map((i) => (
                                          <motion.div
                                            key={i}
                                            initial={{ opacity: 0, scale: 0.5 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{
                                              delay: i * 0.05,
                                              type: "spring",
                                              stiffness: 150,
                                            }}
                                          >
                                            <InputOTPSlot
                                              index={i}
                                              className="h-12 w-10 text-base font-semibold border-2 border-pink-200/50 rounded-lg bg-white/80 transition-all focus:border-primary focus:bg-white"
                                            />
                                          </motion.div>
                                        ))}
                                      </InputOTPGroup>
                                    </InputOTP>
                                  </div>
                                </motion.div>
                              </motion.div>

                              {/* Verify Button */}
                              <motion.div variants={itemVariants} className="pt-2">
                                <motion.button
                                  type="submit"
                                  disabled={verifyPhoneOtpMutation.isPending}
                                  className="w-full h-11 btn-premium font-semibold rounded-lg flex items-center justify-center gap-2 disabled:opacity-75"
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                >
                                  {verifyPhoneOtpMutation.isPending ? (
                                    <>
                                      <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{
                                          duration: 1,
                                          repeat: Infinity,
                                          ease: "linear",
                                        }}
                                      >
                                        <Loader2 className="h-4 w-4" />
                                      </motion.div>
                                      Verifying...
                                    </>
                                  ) : (
                                    "Verify & Sign In"
                                  )}
                                </motion.button>
                              </motion.div>
                            </motion.form>
                          )}
                        </AnimatePresence>
                      </TabsContent>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Tabs>
            </div>
          </motion.div>

          {/* Success State Overlay */}
          <AnimatePresence>
            {showSuccess && (
              <motion.div
                className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
                variants={successVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <motion.div
                  className="bg-white/90 backdrop-blur-md rounded-full p-8 shadow-2xl"
                  variants={successVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 0.6, ease: "easeInOut" }}
                  >
                    <Check className="w-16 h-16 text-primary" />
                  </motion.div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
