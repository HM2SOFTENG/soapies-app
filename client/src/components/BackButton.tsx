import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";

interface BackButtonProps {
  fallback?: string;       // Where to go if no history (default: "/dashboard")
  label?: string;          // Button label (default: "Back")
  variant?: "glass" | "pill" | "icon"; // Visual style
  className?: string;
}

export default function BackButton({
  fallback = "/dashboard",
  label = "Back",
  variant = "pill",
  className = ""
}: BackButtonProps) {
  const [, setLocation] = useLocation();

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation(fallback);
    }
  };

  if (variant === "icon") {
    return (
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handleBack}
        className={`p-2 rounded-full bg-black/30 text-white backdrop-blur-sm hover:bg-black/50 transition-colors ${className}`}
        aria-label="Go back"
      >
        <ArrowLeft className="w-5 h-5" />
      </motion.button>
    );
  }

  if (variant === "glass") {
    return (
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={handleBack}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur-sm border border-pink-100/50 text-gray-600 hover:text-pink-600 hover:bg-pink-50 text-sm font-semibold shadow-sm transition-all ${className}`}
      >
        <ArrowLeft className="w-4 h-4" />
        {label}
      </motion.button>
    );
  }

  // Default: pill
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={handleBack}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-pink-600 hover:bg-pink-50 text-sm font-semibold transition-colors ${className}`}
    >
      <ArrowLeft className="w-4 h-4" />
      {label}
    </motion.button>
  );
}
