import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import {
  Loader2, Calendar, Clock, CheckCircle2, PhoneCall,
} from "lucide-react";
import BackButton from "@/components/BackButton";
import { useState } from "react";
import { toast } from "sonner";

// ─── SLOT CARD ───────────────────────────────────────────────────────────────

function SlotCard({
  slot,
  selected,
  onSelect,
}: {
  slot: any;
  selected: boolean;
  onSelect: () => void;
}) {
  const date = new Date(slot.scheduledAt);
  const dateStr = date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const timeStr = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  return (
    <motion.button
      onClick={onSelect}
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.97 }}
      className={`p-4 rounded-2xl border-2 text-left transition-all w-full ${
        selected
          ? "border-pink-500 bg-gradient-to-br from-pink-50 to-purple-50 shadow-lg shadow-pink-200/40"
          : "border-pink-100 bg-white/80 hover:border-pink-300 hover:shadow-md"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-xl ${selected ? "bg-pink-500" : "bg-pink-100"}`}>
          <Calendar className={`w-4 h-4 ${selected ? "text-white" : "text-pink-500"}`} />
        </div>
        <div>
          <p className={`font-bold text-sm ${selected ? "text-pink-700" : "text-gray-700"}`}>{dateStr}</p>
          <p className={`text-xs mt-0.5 ${selected ? "text-pink-600" : "text-gray-500"}`}>
            {timeStr} · {slot.duration || 30} min
          </p>
        </div>
        {selected && (
          <CheckCircle2 className="w-5 h-5 text-pink-500 ml-auto flex-shrink-0 mt-0.5" />
        )}
      </div>
    </motion.button>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────

export default function ScheduleInterview() {
  const [, navigate] = useLocation();
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [booked, setBooked] = useState<any>(null);

  const { data: profile, isLoading: profileLoading } = trpc.profile.me.useQuery();
  const { data: slots, isLoading: slotsLoading } = trpc.introCalls.available.useQuery(undefined, {
    enabled: true,
    staleTime: 30_000,
  });

  const utils = trpc.useUtils();
  const bookMutation = trpc.introCalls.book.useMutation({
    onSuccess: () => {
      const slot = (slots ?? []).find((s: any) => s.id === selectedSlotId);
      setBooked(slot);
      toast.success("Interview slot booked! 🎉");
      utils.introCalls.all.invalidate();
      // Redirect to pending after 4 seconds
      setTimeout(() => navigate("/pending"), 4000);
    },
    onError: (e) => toast.error(e.message || "Failed to book slot"),
  });

  const applicationPhase = (profile as any)?.applicationPhase;

  // Access control
  if (!profileLoading && !profile) {
    navigate("/login");
    return null;
  }
  if (!profileLoading && profile && applicationPhase !== "interview_scheduled") {
    navigate("/pending");
    return null;
  }

  const isLoading = profileLoading || slotsLoading;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 relative overflow-hidden flex flex-col">
      {/* Animated background */}
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

      {/* Header */}
      <header className="relative z-10 w-full border-b border-white/20 bg-white/50 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <motion.img
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663460303717/FfTbhpP94ZvscRd7twWNT6/soapies-logo_cf3c72b2.png"
            alt="Soapies Logo"
            className="h-9"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
          />
          <BackButton variant="glass" fallback="/pending" className="ml-auto" />
        </div>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          className="w-full max-w-2xl"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Booking confirmed state */}
          {booked ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl p-8 sm:p-12 border border-white/50 text-center"
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className="w-20 h-20 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center"
              >
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </motion.div>
              <h1 className="text-3xl font-bold text-gray-800 mb-3" style={{ fontFamily: "Fredoka, sans-serif" }}>
                You're All Set! 🎉
              </h1>
              <p className="text-gray-600 mb-2">Your intro call is booked for:</p>
              <div className="bg-pink-50 rounded-2xl p-4 mb-6 border border-pink-200">
                <p className="font-bold text-pink-700 text-lg">
                  {new Date(booked.scheduledAt).toLocaleDateString("en-US", {
                    weekday: "long", month: "long", day: "numeric", year: "numeric",
                  })}
                </p>
                <p className="text-pink-600">
                  {new Date(booked.scheduledAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} · {booked.duration || 30} minutes
                </p>
              </div>
              <p className="text-gray-400 text-sm">Redirecting you back in a moment...</p>
            </motion.div>
          ) : (
            <motion.div
              className="bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl p-8 sm:p-10 border border-white/50"
              variants={itemVariants}
            >
              {/* Header */}
              <motion.div variants={itemVariants} className="text-center mb-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-purple-100 rounded-full flex items-center justify-center">
                  <PhoneCall className="w-8 h-8 text-purple-600" />
                </div>
                <h1
                  className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2"
                  style={{ fontFamily: "Fredoka, sans-serif" }}
                >
                  Schedule Your Intro Call
                </h1>
                <p className="text-gray-500 max-w-sm mx-auto">
                  Pick a time that works for you. The call is quick (~15-30 min) and totally casual!
                </p>
              </motion.div>

              {/* Loading */}
              {isLoading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
                </div>
              )}

              {/* No slots */}
              {!isLoading && (!slots || slots.length === 0) && (
                <motion.div variants={itemVariants} className="text-center py-10">
                  <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No slots available right now</p>
                  <p className="text-gray-400 text-sm mt-1">We'll reach out soon with available times.</p>
                </motion.div>
              )}

              {/* Slots grid */}
              {!isLoading && slots && slots.length > 0 && (
                <motion.div variants={itemVariants}>
                  <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-gray-600">
                    <Calendar className="w-4 h-4 text-pink-400" />
                    Available Times ({slots.length} open slots)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 max-h-80 overflow-y-auto pr-1">
                    {slots.map((slot: any) => (
                      <SlotCard
                        key={slot.id}
                        slot={slot}
                        selected={selectedSlotId === slot.id}
                        onSelect={() => setSelectedSlotId(slot.id)}
                      />
                    ))}
                  </div>

                  <motion.button
                    onClick={() => {
                      if (!selectedSlotId) { toast.error("Please select a time slot first"); return; }
                      bookMutation.mutate({ slotId: selectedSlotId });
                    }}
                    disabled={!selectedSlotId || bookMutation.isPending}
                    className={`w-full py-4 px-6 rounded-2xl font-bold text-white text-center transition-all duration-200 ${
                      selectedSlotId
                        ? "bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 shadow-lg shadow-pink-200/50"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                    whileHover={selectedSlotId ? { scale: 1.02 } : {}}
                    whileTap={selectedSlotId ? { scale: 0.98 } : {}}
                  >
                    {bookMutation.isPending ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" /> Booking...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-5 h-5" /> Confirm My Slot
                      </span>
                    )}
                  </motion.button>
                </motion.div>
              )}
            </motion.div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
