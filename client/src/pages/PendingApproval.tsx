import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Loader2,
  CheckCircle2,
  X,
  Sparkles,
  Clock,
  LogOut,
  Home,
} from "lucide-react";
import { useEffect } from "react";

export default function PendingApproval() {
  const [, navigate] = useLocation();
  const { logout } = useAuth();
  const { data: profile, isLoading } = trpc.profile.me.useQuery();

  useEffect(() => {
    if (profile?.applicationStatus === "draft") {
      navigate("/join");
    }
  }, [profile, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "submitted":
      case "under_review":
        return {
          bgGradient: "from-amber-50 via-orange-50 to-pink-50",
          accentColor: "text-amber-600",
          accentBg: "bg-amber-100",
          accentBorder: "border-amber-300",
          title: "Application Under Review",
          icon: Clock,
          message:
            "We're carefully reviewing your application. This usually takes 24-48 hours. Thank you for your patience!",
          subMessage:
            "In the meantime, feel free to explore what Soapies has to offer.",
        };
      case "approved":
        return {
          bgGradient: "from-green-50 via-emerald-50 to-teal-50",
          accentColor: "text-green-600",
          accentBg: "bg-green-100",
          accentBorder: "border-green-300",
          title: "Welcome to Soapies!",
          icon: CheckCircle2,
          message: "Your application has been approved! You're all set to join.",
          subMessage: "Let's get started on your Soapies journey.",
          ctaText: "Go to Dashboard",
          ctaLink: "/dashboard",
        };
      case "rejected":
        return {
          bgGradient: "from-red-50 via-pink-50 to-rose-50",
          accentColor: "text-red-600",
          accentBg: "bg-red-100",
          accentBorder: "border-red-300",
          title: "Application Not Approved",
          icon: X,
          message:
            "Unfortunately, your application was not approved at this time.",
          subMessage:
            "You're welcome to reapply after 30 days. We'd love to have you join us then!",
        };
      case "waitlisted":
        return {
          bgGradient: "from-purple-50 via-violet-50 to-pink-50",
          accentColor: "text-purple-600",
          accentBg: "bg-purple-100",
          accentBorder: "border-purple-300",
          title: "You're on the Waitlist",
          icon: Sparkles,
          message:
            "You're on the waitlist for Soapies! We'll notify you as soon as a spot becomes available.",
          subMessage:
            "Thank you for your interest. We can't wait to welcome you to our community!",
        };
      default:
        return {
          bgGradient: "from-pink-50 via-purple-50 to-indigo-50",
          accentColor: "text-pink-600",
          accentBg: "bg-pink-100",
          accentBorder: "border-pink-300",
          title: "Checking Status...",
          icon: Loader2,
          message: "Please wait while we check your status.",
          subMessage: "",
        };
    }
  };

  const config = getStatusConfig(profile?.applicationStatus || "");
  const IconComponent = config.icon;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
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
        duration: 0.8,
        ease: "easeOut",
      },
    },
  };

  const pulseVariants = {
    pulse: {
      scale: [1, 1.05, 1],
      opacity: [1, 0.8, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  const spinVariants = {
    spin: {
      rotate: 360,
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "linear",
      },
    },
  };

  return (
    <div
      className={`min-h-screen bg-gradient-to-br ${config.bgGradient} relative overflow-hidden flex flex-col`}
    >
      {/* Animated background blobs */}
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

      {/* Header with logo */}
      <header className="relative z-10 w-full border-b border-white/20 bg-white/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-center justify-between">
          <motion.img
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663460303717/FfTbhpP94ZvscRd7twWNT6/soapies-logo_cf3c72b2.png"
            alt="Soapies Logo"
            className="h-10"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
          />
          <motion.button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/80 hover:bg-white text-gray-700 font-medium transition-all duration-200 hover:shadow-md"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </motion.button>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          className="w-full max-w-2xl"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Status Card */}
          <motion.div
            className="bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl p-8 sm:p-12 border border-white/50"
            variants={itemVariants}
          >
            {/* Icon */}
            <motion.div
              className={`w-24 h-24 mx-auto mb-8 ${config.accentBg} rounded-full flex items-center justify-center`}
              variants={
                profile?.applicationStatus === "submitted" ||
                profile?.applicationStatus === "under_review"
                  ? spinVariants
                  : pulseVariants
              }
              animate={
                profile?.applicationStatus === "submitted" ||
                profile?.applicationStatus === "under_review"
                  ? "spin"
                  : "pulse"
              }
            >
              <IconComponent className={`w-12 h-12 ${config.accentColor}`} />
            </motion.div>

            {/* Title */}
            <motion.h1
              className={`text-4xl sm:text-5xl font-bold text-center mb-6 ${config.accentColor}`}
              style={{ fontFamily: "Fredoka, sans-serif" }}
              variants={itemVariants}
            >
              {config.title}
            </motion.h1>

            {/* Message */}
            <motion.p
              className="text-lg sm:text-xl text-gray-700 text-center mb-4 leading-relaxed"
              variants={itemVariants}
            >
              {config.message}
            </motion.p>

            {/* Sub-message */}
            {config.subMessage && (
              <motion.p
                className="text-base sm:text-lg text-gray-600 text-center mb-8"
                variants={itemVariants}
              >
                {config.subMessage}
              </motion.p>
            )}

            {/* Status badge for under review */}
            {(profile?.applicationStatus === "submitted" ||
              profile?.applicationStatus === "under_review") && (
              <motion.div
                className={`mt-8 p-4 rounded-lg ${config.accentBg} border-2 ${config.accentBorder}`}
                variants={pulseVariants}
                animate="pulse"
              >
                <p className={`text-center font-semibold ${config.accentColor}`}>
                  ✨ We're reviewing your application
                </p>
              </motion.div>
            )}

            {/* CTA Button */}
            {"ctaLink" in config && config.ctaLink && (
              <motion.div
                className="mt-8"
                variants={itemVariants}
              >
                <motion.a
                  href={config.ctaLink}
                  className={`block w-full py-4 px-6 rounded-xl font-bold text-white text-center transition-all duration-200 ${
                    profile?.applicationStatus === "approved"
                      ? "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                      : "bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {"ctaText" in config ? config.ctaText : "Continue"}
                </motion.a>
              </motion.div>
            )}
          </motion.div>

          {/* Back to home link */}
          <motion.div
            className="text-center mt-8"
            variants={itemVariants}
          >
            <motion.a
              href="/"
              className="inline-flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium transition-colors duration-200"
              whileHover={{ x: -4 }}
            >
              <Home className="w-4 h-4" />
              <span>Back to Home</span>
            </motion.a>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
