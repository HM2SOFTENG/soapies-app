import { createEvent } from 'ics';
import PageWrapper from "@/components/PageWrapper";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, MapPin, Users, Clock, ArrowLeft, Loader2, Ticket,
  Star, Minus, Plus, ShoppingCart, Sparkles, Heart, Shield,
  ChevronDown, PartyPopper, Music, Waves, X, Check, Copy, Share2,
  AlertCircle, CreditCard, DollarSign, AlertTriangle, BadgeCheck,
  ChevronRight, Search, FlaskConical,
} from "lucide-react";
import { createEvent as createIcsEvent } from "ics";
import { Link, useParams, useLocation } from "wouter";
import { format, isFuture, isPast, differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds } from "date-fns";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";

// ─── TICKET TYPES ───────────────────────────────────────────────────────────
const TICKET_TYPES = [
  {
    id: "single_female",
    label: "Single Woman",
    emoji: "👩",
    color: "from-pink-400 to-rose-500",
    bgColor: "bg-pink-50",
    borderColor: "border-pink-200",
    textColor: "text-pink-600",
    description: "Individual entry for women",
  },
  {
    id: "couple",
    label: "Couple",
    emoji: "💑",
    color: "from-purple-400 to-indigo-500",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    textColor: "text-purple-600",
    description: "Entry for two partners",
  },
  {
    id: "single_male",
    label: "Single Man",
    emoji: "👨",
    color: "from-blue-400 to-indigo-500",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    textColor: "text-blue-600",
    description: "Individual entry for men",
  },
  {
    id: "volunteer",
    label: "Staff Volunteer",
    emoji: "⭐",
    color: "from-amber-400 to-orange-500",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-300",
    textColor: "text-amber-700",
    description: "Help run the event. Volunteer duties required — funds may be withheld if duties not fulfilled.",
    isVolunteer: true,
  },
];

// ─── EVENT TYPE ICONS ───────────────────────────────────────────────────────
function getEventTypeIcon(title: string) {
  const lower = title.toLowerCase();
  if (lower.includes("rave") || lower.includes("glow")) return <Music className="h-5 w-5" />;
  if (lower.includes("beach") || lower.includes("pool")) return <Waves className="h-5 w-5" />;
  return <PartyPopper className="h-5 w-5" />;
}

function getEventTypeLabel(title: string) {
  const lower = title.toLowerCase();
  if (lower.includes("rave") || lower.includes("glow")) return "Rave";
  if (lower.includes("beach") || lower.includes("pool")) return "Beach Party";
  return "House Party";
}

// ─── COUNTDOWN HOOK ─────────────────────────────────────────────────────────
function useCountdown(targetDate: Date) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isUpcoming = isFuture(targetDate);
  if (!isUpcoming) return null;

  const days = differenceInDays(targetDate, now);
  const hours = differenceInHours(targetDate, now) % 24;
  const minutes = differenceInMinutes(targetDate, now) % 60;
  const seconds = differenceInSeconds(targetDate, now) % 60;

  return { days, hours, minutes, seconds };
}

// ─── COUNTDOWN DISPLAY ──────────────────────────────────────────────────────
function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <motion.div
      key={value}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="flex flex-col items-center"
    >
      <div className="relative">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-lg">
          <AnimatePresence mode="popLayout">
            <motion.span
              key={value}
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="font-display text-2xl sm:text-3xl font-black text-white tabular-nums"
            >
              {String(value).padStart(2, "0")}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>
      <span className="mt-2 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/70">
        {label}
      </span>
    </motion.div>
  );
}

// ─── EVENT HERO SECTION ─────────────────────────────────────────────────────
function EventHero({ event }: { event: any }) {
  const countdown = useCountdown(new Date(event.startDate));

  return (
    <section className="relative overflow-hidden -mx-4 sm:mx-0 sm:rounded-3xl mb-8">
      {/* Background */}
      <div className="absolute inset-0">
        <motion.img
          src={event.coverImageUrl}
          alt=""
          className="w-full h-full object-cover"
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 8, ease: "easeOut" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/30 to-pink-900/30" />
      </div>

      {/* Content */}
      <div className="relative z-10 h-80 sm:h-96 flex flex-col justify-between p-6 sm:p-8">
        {/* Top Info */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 mb-6"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/15 backdrop-blur-sm rounded-full border border-white/30">
              {getEventTypeIcon(event.title)}
              <span className="text-sm font-bold text-white">{getEventTypeLabel(event.title)}</span>
            </div>
            {!isFuture(new Date(event.startDate)) && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/20 backdrop-blur-sm rounded-full border border-red-500/50">
                <span className="text-sm font-bold text-red-100">Past Event</span>
              </div>
            )}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-display text-4xl sm:text-5xl font-black text-white mb-4 leading-tight max-w-2xl"
          >
            {event.title}
          </motion.h1>
        </div>

        {/* Bottom Info & Countdown */}
        <div className="space-y-4">
          {/* Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap gap-4"
          >
            <div className="flex items-center gap-2 text-white/80">
              <Calendar className="h-5 w-5 text-pink-300" />
              <span className="text-sm font-medium">{format(new Date(event.startDate), "MMM d, yyyy · h:mm a")}</span>
            </div>
            <div className="flex items-center gap-2 text-white/80">
              <MapPin className="h-5 w-5 text-pink-300" />
              <span className="text-sm font-medium">{event.venue}</span>
            </div>
          </motion.div>

          {/* Countdown */}
          {countdown && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex gap-2 sm:gap-3"
            >
              <CountdownUnit value={countdown.days} label="Days" />
              <CountdownUnit value={countdown.hours} label="Hours" />
              <CountdownUnit value={countdown.minutes} label="Mins" />
              <CountdownUnit value={countdown.seconds} label="Secs" />
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── CONFETTI ANIMATION ────────────────────────────────────────────────────
function ConfettiPiece({ delay, color }: { delay: number; color: string }) {
  const randomX = useMemo(() => Math.random() * 100, []);
  return (
    <motion.div
      className={`absolute w-3 h-3 rounded-sm ${color}`}
      style={{ left: `${randomX}%`, top: "-10px" }}
      initial={{ y: -10, rotate: 0, opacity: 1 }}
      animate={{
        y: "110vh",
        rotate: Math.random() * 720 - 360,
        opacity: [1, 1, 0],
        x: [0, (Math.random() - 0.5) * 200],
      }}
      transition={{ duration: 3 + Math.random() * 2, delay, ease: "easeIn" }}
    />
  );
}

function ConfettiEffect() {
  const colors = [
    "bg-pink-400", "bg-purple-400", "bg-yellow-400",
    "bg-blue-400", "bg-green-400", "bg-rose-400",
  ];
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {Array.from({ length: 30 }, (_, i) => (
        <ConfettiPiece
          key={i}
          delay={i * 0.1}
          color={colors[i % colors.length]}
        />
      ))}
    </div>
  );
}

// ─── RESERVATION FLOW ───────────────────────────────────────────────────────
type ReservationStep = "ticket" | "orientation" | "partner" | "testresult" | "payment" | "confirm";
type PaymentMethod = "venmo" | "credits" | "volunteer";

interface ReservationFlowProps {
  event: any;
  onSuccess: (data: {
    ticketType: string;
    paymentMethod: string;
    totalAmount: string;
    orientationSignal?: "straight" | "queer";
    isQueerPlay?: boolean;
    partnerUserId?: number;
    testResultUrl?: string;
  }) => void;
  isSubmitting: boolean;
}

function ReservationFlow({ event, onSuccess, isSubmitting }: ReservationFlowProps) {
  const [step, setStep] = useState<ReservationStep>("ticket");
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | null>(null);
  const [volunteerAgreed, setVolunteerAgreed] = useState(false);
  const [orientationSignal, setOrientationSignal] = useState<"straight" | "queer" | null>(null);
  const [partnerSearch, setPartnerSearch] = useState("");
  const [selectedPartner, setSelectedPartner] = useState<any | null>(null);
  const [testResultUrl, setTestResultUrl] = useState("");

  const { data: settings } = trpc.settings.get.useQuery();
  const { isAuthenticated } = useAuth();
  const { data: me } = trpc.auth.me.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const { data: creditBalance } = trpc.credits.balance.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });
  const { data: partnerResults } = trpc.profile.search.useQuery(
    { query: partnerSearch },
    { enabled: partnerSearch.length >= 2 }
  );

  const venmoHandle = settings?.["venmo_handle"] ?? "@SoapiesEvents";

  const getTicketPrice = useCallback((ticketId: string) => {
    if (ticketId === "single_female") return parseFloat(event.priceSingleFemale || "0");
    if (ticketId === "single_male") return parseFloat(event.priceSingleMale || "0");
    if (ticketId === "couple") return parseFloat(event.priceCouple || "0");
    if (ticketId === "volunteer") return 0;
    return 0;
  }, [event]);

  const ticketPrice = selectedTicket ? getTicketPrice(selectedTicket) : 0;
  // For volunteer, base price is what would have been charged (for display)
  const baseTicketPrice = useMemo(() => {
    // Show what the "equivalent" ticket would cost (use single_female as base for volunteer)
    return parseFloat(event.priceSingleFemale || "0");
  }, [event]);

  const creditBalanceNum = typeof creditBalance === "number" ? creditBalance : 0;
  const canPayWithCredits = creditBalanceNum >= ticketPrice;
  const isVolunteerTicket = selectedTicket === "volunteer";

  function handleSelectTicket(ticketId: string) {
    setSelectedTicket(ticketId);
    setSelectedPayment(null);
    setVolunteerAgreed(false);
    setOrientationSignal(null);
    setSelectedPartner(null);
    setTestResultUrl("");
    // Volunteer skips orientation step
    if (ticketId === "volunteer") {
      setStep("payment");
    } else {
      setStep("orientation");
    }
  }

  function handleSelectPayment(method: PaymentMethod) {
    setSelectedPayment(method);
  }

  function handleSubmit() {
    if (!selectedTicket || !selectedPayment) return;

    let paymentStatus: "pending" | "paid" = "pending";
    if (selectedPayment === "credits") paymentStatus = "paid";

    const totalAmount = isVolunteerTicket ? "0.00" : ticketPrice.toFixed(2);

    onSuccess({
      ticketType: selectedTicket,
      paymentMethod: selectedPayment,
      totalAmount,
      orientationSignal: orientationSignal ?? undefined,
      isQueerPlay: orientationSignal === "queer",
      partnerUserId: selectedPartner?.userId ?? undefined,
      testResultUrl: testResultUrl || undefined,
    });
  }

  // Step 1: Ticket selection
  if (step === "ticket") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong rounded-3xl p-6 sm:p-8 border border-pink-100/50 mb-8"
      >
        <h2 className="font-display text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
          <Ticket className="h-6 w-6 text-pink-500" /> Choose Your Ticket
        </h2>
        <p className="text-gray-500 text-sm mb-6">Select the ticket type that applies to you</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TICKET_TYPES.map((ticket) => {
            const price = getTicketPrice(ticket.id);
            return (
              <motion.button
                key={ticket.id}
                whileHover={{ scale: 1.02, y: -3 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleSelectTicket(ticket.id)}
                className={`relative p-5 rounded-2xl border-2 text-left transition-all w-full ${
                  ticket.isVolunteer
                    ? "border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 hover:border-amber-400"
                    : "border-gray-100 bg-white hover:border-pink-200 hover:shadow-md"
                }`}
              >
                {ticket.isVolunteer && (
                  <div className="absolute top-2 right-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
                      ⭐ Special
                    </span>
                  </div>
                )}
                <div className="text-3xl mb-2">{ticket.emoji}</div>
                <h3 className={`font-bold text-base ${ticket.textColor}`}>{ticket.label}</h3>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">{ticket.description}</p>
                {ticket.isVolunteer ? (
                  <div className="mt-3">
                    <span className="text-2xl font-black text-green-600">Free</span>
                    {baseTicketPrice > 0 && (
                      <p className="text-xs text-amber-600 font-medium mt-1">
                        ${baseTicketPrice.toFixed(2)} credited back after completion
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-2xl font-black text-gray-800 mt-3">${price.toFixed(2)}</p>
                )}
                <div className="mt-3 flex items-center gap-1 text-pink-500">
                  <span className="text-xs font-semibold">Select</span>
                  <ChevronRight className="h-3 w-3" />
                </div>
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    );
  }

  // Step 2: Orientation / Play Style selection
  if (step === "orientation") {
    return (
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        className="glass-strong rounded-3xl p-6 sm:p-8 border border-pink-100/50 mb-8"
      >
        <button
          onClick={() => { setStep("ticket"); setSelectedTicket(null); }}
          className="flex items-center gap-1 text-sm text-pink-500 font-semibold mb-5 hover:text-pink-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to ticket selection
        </button>
        <h2 className="font-display text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
          <Heart className="h-6 w-6 text-pink-500" /> Play Style
        </h2>
        <p className="text-gray-500 text-sm mb-6">Let us know your play orientation. This helps us assign your wristband color.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Straight */}
          <motion.button
            whileHover={{ scale: 1.02, y: -3 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              setOrientationSignal("straight");
              setStep(selectedTicket === "couple" ? "partner" : "testresult");
            }}
            className={`relative p-6 rounded-2xl border-2 text-left transition-all w-full ${
              orientationSignal === "straight"
                ? "border-purple-400 bg-purple-50 shadow-md"
                : "border-gray-100 bg-white hover:border-purple-200"
            }`}
          >
            <div className="text-4xl mb-3">💜</div>
            <h3 className="font-bold text-lg text-gray-800">Straight</h3>
            <p className="text-sm text-gray-500 mt-1">Standard wristband</p>
          </motion.button>

          {/* Queer/Open */}
          <motion.button
            whileHover={{ scale: 1.02, y: -3 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              setOrientationSignal("queer");
              setStep(selectedTicket === "couple" ? "partner" : "testresult");
            }}
            className={`relative p-6 rounded-2xl border-2 text-left transition-all w-full ${
              orientationSignal === "queer"
                ? "border-purple-400 bg-purple-50 shadow-md"
                : "border-gray-100 bg-white hover:border-purple-200"
            }`}
          >
            <div className="text-4xl mb-3">🌈</div>
            <h3 className="font-bold text-lg text-gray-800">Queer / Open</h3>
            <p className="text-sm text-gray-500 mt-1">Rainbow wristband 🌈</p>
          </motion.button>
        </div>
      </motion.div>
    );
  }

  // Step 3: Partner search (couples only)
  if (step === "partner") {
    return (
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        className="glass-strong rounded-3xl p-6 sm:p-8 border border-pink-100/50 mb-8"
      >
        <button
          onClick={() => { setStep("orientation"); setSelectedPartner(null); }}
          className="flex items-center gap-1 text-sm text-pink-500 font-semibold mb-5 hover:text-pink-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <h2 className="font-display text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
          <Users className="h-6 w-6 text-pink-500" /> Find Your Partner
        </h2>
        <p className="text-gray-500 text-sm mb-6">Search for your partner by display name. Partner must be opposite gender.</p>

        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            value={partnerSearch}
            onChange={(e) => setPartnerSearch(e.target.value)}
            placeholder="Search by display name..."
            className="pl-12 rounded-xl border-pink-100"
          />
        </div>

        {/* Results */}
        {partnerResults && partnerResults.length > 0 && (
          <div className="space-y-2 mb-4">
            {partnerResults.map((p: any) => (
              <motion.button
                key={p.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedPartner(p)}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                  selectedPartner?.id === p.id
                    ? "border-pink-400 bg-pink-50"
                    : "border-gray-100 bg-white hover:border-pink-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  {p.avatarUrl ? (
                    <img src={p.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center">
                      <span className="text-white font-bold text-sm">{p.displayName?.[0] || "?"}</span>
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-gray-800">{p.displayName}</p>
                    <p className="text-xs text-gray-500 capitalize">{p.gender || "No gender listed"}</p>
                  </div>
                  {selectedPartner?.id === p.id && (
                    <Check className="h-5 w-5 text-pink-500 ml-auto" />
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        )}

        {partnerSearch.length >= 2 && (!partnerResults || partnerResults.length === 0) && (
          <p className="text-sm text-gray-500 text-center py-4">No members found</p>
        )}

        <div className="flex gap-3 mt-4">
          <Button
            variant="outline"
            onClick={() => setStep("testresult")}
            className="flex-1 rounded-xl border-gray-200 text-gray-600"
          >
            Skip
          </Button>
          <Button
            onClick={() => setStep("testresult")}
            disabled={!selectedPartner}
            className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl"
          >
            Continue
          </Button>
        </div>
      </motion.div>
    );
  }

  // Step 4: Test result URL (optional)
  if (step === "testresult") {
    return (
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        className="glass-strong rounded-3xl p-6 sm:p-8 border border-pink-100/50 mb-8"
      >
        <button
          onClick={() => setStep(selectedTicket === "couple" ? "partner" : "orientation")}
          className="flex items-center gap-1 text-sm text-pink-500 font-semibold mb-5 hover:text-pink-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <h2 className="font-display text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
          <FlaskConical className="h-6 w-6 text-blue-500" /> Upload Test Result
          <span className="text-sm font-normal text-gray-400 ml-1">(Optional)</span>
        </h2>
        <p className="text-gray-500 text-sm mb-6">
          Submit recent STI test results for a <span className="font-bold text-blue-600">Blue Wristband 💙</span>. Results must be within 30 days of the event.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Test Result URL</label>
            <Input
              value={testResultUrl}
              onChange={(e) => setTestResultUrl(e.target.value)}
              placeholder="https://drive.google.com/... or similar"
              className="rounded-xl border-blue-100 focus:border-blue-300"
            />
            <p className="text-xs text-gray-400 mt-2">Upload your test results to Google Drive, Dropbox, or similar and paste the link here.</p>
          </div>

          {testResultUrl && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 rounded-xl bg-blue-50 border border-blue-200"
            >
              <p className="text-sm font-semibold text-blue-700 flex items-center gap-2">
                <Check className="h-4 w-4" /> Test result URL added
              </p>
              <p className="text-xs text-blue-600 mt-1">Our team will review your submission and approve your Blue Wristband 💙</p>
            </motion.div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="outline"
            onClick={() => setStep("payment")}
            className="flex-1 rounded-xl border-gray-200 text-gray-600"
          >
            Skip
          </Button>
          <Button
            onClick={() => setStep("payment")}
            className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl"
          >
            {testResultUrl ? "Continue with Test Result" : "Continue"}
          </Button>
        </div>
      </motion.div>
    );
  }

  // Step 5: Payment method
  if (step === "payment") {
    const ticket = TICKET_TYPES.find(t => t.id === selectedTicket)!;

    return (
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        className="glass-strong rounded-3xl p-6 sm:p-8 border border-pink-100/50 mb-8"
      >
        {/* Back button */}
        <button
          onClick={() => { isVolunteerTicket ? setStep("ticket") : setStep("testresult"); }}
          className="flex items-center gap-1 text-sm text-pink-500 font-semibold mb-5 hover:text-pink-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> {isVolunteerTicket ? "Back to ticket selection" : "Back"}
        </button>

        {/* Summary */}
        <div className={`p-4 rounded-2xl ${ticket.bgColor} border ${ticket.borderColor} mb-6`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Selected Ticket</p>
              <p className="font-bold text-gray-800 mt-1">{ticket.emoji} {ticket.label}</p>
            </div>
            <div className="text-right">
              <p className="font-black text-2xl text-gray-800">
                {isVolunteerTicket ? "Free" : `$${ticketPrice.toFixed(2)}`}
              </p>
            </div>
          </div>
        </div>

        {/* Volunteer-only flow */}
        {isVolunteerTicket ? (
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-5 rounded-2xl bg-gradient-to-br from-red-50 to-amber-50 border-2 border-red-200"
            >
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-6 w-6 text-red-500 flex-shrink-0" />
                <h3 className="font-bold text-red-700 text-lg">Volunteer Commitment</h3>
              </div>
              <p className="text-red-800 text-sm font-medium mb-4 leading-relaxed">
                By reserving a Volunteer Ticket, you agree to:
              </p>
              <ul className="space-y-2 mb-4">
                {[
                  "Fulfill all assigned volunteer duties for this event.",
                  "Understand that failure to fulfill duties will result in forfeiture of your ticket payment.",
                  "Acknowledge that repeated no-shows may result in suspension or removal from the Soapies community.",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-red-700">
                    <span className="mt-0.5 w-5 h-5 rounded-full bg-red-200 flex-shrink-0 flex items-center justify-center text-xs font-bold text-red-600">
                      {i + 1}
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-red-600 font-bold uppercase tracking-wider">
                ⚠️ This agreement is binding. Staff will contact you with your duties.
              </p>
            </motion.div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep("ticket")}
                className="flex-1 rounded-xl border-gray-200 text-gray-600"
              >
                Cancel
              </Button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setSelectedPayment("volunteer");
                  setVolunteerAgreed(true);
                  handleSubmit();
                }}
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-amber-200/50"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    I Understand & Agree
                  </>
                )}
              </motion.button>
            </div>
          </div>
        ) : (
          /* Normal payment options */
          <div className="space-y-4">
            <h3 className="font-bold text-gray-700 mb-3">Choose Payment Method</h3>

            {/* Venmo */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelectPayment("venmo")}
              className={`w-full p-5 rounded-2xl border-2 text-left transition-all ${
                selectedPayment === "venmo"
                  ? "border-blue-400 bg-blue-50 shadow-md shadow-blue-100"
                  : "border-gray-100 bg-white hover:border-blue-200"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-gray-800">Pay via Venmo</p>
                    {selectedPayment === "venmo" && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                        className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center"
                      >
                        <Check className="h-4 w-4 text-white" />
                      </motion.div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Send payment to <span className="font-bold text-blue-600">{venmoHandle}</span> and include your name + event name in the memo. Your reservation will be confirmed once payment is verified.
                  </p>
                </div>
              </div>
            </motion.button>

            {/* Credits */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => canPayWithCredits ? handleSelectPayment("credits") : undefined}
              className={`w-full p-5 rounded-2xl border-2 text-left transition-all ${
                !canPayWithCredits ? "opacity-60 cursor-not-allowed" :
                selectedPayment === "credits"
                  ? "border-green-400 bg-green-50 shadow-md shadow-green-100"
                  : "border-gray-100 bg-white hover:border-green-200"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-gray-800">Pay with Credits</p>
                    {selectedPayment === "credits" && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                        className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center"
                      >
                        <Check className="h-4 w-4 text-white" />
                      </motion.div>
                    )}
                  </div>
                  {canPayWithCredits ? (
                    <p className="text-xs text-gray-500 mt-1">
                      You have <span className="font-bold text-green-600">${creditBalanceNum.toFixed(2)}</span> in credits. Use credits to reserve instantly.
                    </p>
                  ) : (
                    <p className="text-xs text-red-500 mt-1">
                      Insufficient credits. You have <span className="font-bold">${creditBalanceNum.toFixed(2)}</span>, need <span className="font-bold">${ticketPrice.toFixed(2)}</span>.
                    </p>
                  )}
                </div>
              </div>
            </motion.button>

            {/* Submit button for Venmo */}
            {selectedPayment === "venmo" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 mb-4">
                  <p className="text-sm font-semibold text-blue-700 mb-1">📱 Venmo Instructions</p>
                  <p className="text-xs text-blue-600">
                    1. Open Venmo and send <strong>${ticketPrice.toFixed(2)}</strong> to <strong>{venmoHandle}</strong><br />
                    2. In the memo write your name + "{event.title}"<br />
                    3. Tap "I've Sent Payment" below — your spot will be reserved pending verification
                  </p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-blue-200/50"
                >
                  {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Check className="h-5 w-5" /> I've Sent Payment</>}
                </motion.button>
              </motion.div>
            )}

            {/* Submit button for Credits */}
            {selectedPayment === "credits" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSubmit}
                  disabled={isSubmitting || !canPayWithCredits}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-green-200/50"
                >
                  {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Sparkles className="h-5 w-5" /> Pay with Credits</>}
                </motion.button>
              </motion.div>
            )}
          </div>
        )}
      </motion.div>
    );
  }

  return null;
}

// ─── CONFIRMATION SUCCESS ───────────────────────────────────────────────────
interface ConfirmationProps {
  paymentMethod: string;
  totalAmount: string;
  event: any;
  venmoHandle: string;
  userName?: string;
}

function ReservationConfirmation({ paymentMethod, totalAmount, event, venmoHandle, userName }: ConfirmationProps) {
  const [, setLocation] = useLocation();
  const displayName = userName || "You";

  return (
    <>
      <ConfettiEffect />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-strong rounded-3xl p-8 sm:p-10 border border-pink-100/50 mb-8 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2 }}
          className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-pink-400 to-purple-600 flex items-center justify-center shadow-2xl shadow-pink-300/50 mb-6"
        >
          <span className="text-5xl">🎉</span>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="font-display text-3xl font-black text-gray-800 mb-3"
        >
          Your spot is reserved!
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-4"
        >
          {paymentMethod === "venmo" && (
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 text-left">
              <p className="font-semibold text-blue-700 mb-2 flex items-center gap-2">
                <DollarSign className="h-4 w-4" /> Next Step: Send Payment
              </p>
              <p className="text-sm text-blue-600 leading-relaxed">
                Send <strong>${totalAmount}</strong> to <strong>{venmoHandle}</strong> with memo:<br />
                <span className="font-mono text-blue-800 bg-blue-100 px-2 py-0.5 rounded mt-1 inline-block">
                  "{displayName} - {event.title}"
                </span>
              </p>
              <p className="text-xs text-blue-500 mt-3">
                ⏳ Your reservation is pending payment confirmation. We'll notify you once verified.
              </p>
            </div>
          )}

          {paymentMethod === "credits" && (
            <div className="p-4 rounded-2xl bg-green-50 border border-green-100">
              <p className="font-semibold text-green-700 flex items-center gap-2">
                <Check className="h-4 w-4" /> Credits Deducted
              </p>
              <p className="text-sm text-green-600 mt-1">
                Your reservation is confirmed! See you at the party 🎊
              </p>
            </div>
          )}

          {paymentMethod === "volunteer" && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100">
              <p className="font-semibold text-amber-700 flex items-center gap-2">
                <Star className="h-4 w-4" /> Volunteer Reservation Submitted
              </p>
              <p className="text-sm text-amber-600 mt-1">
                Staff will be in touch with your duties. Thank you for helping make this event amazing!
              </p>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 flex flex-col sm:flex-row gap-3 justify-center"
        >
          <Button
            onClick={() => setLocation("/dashboard")}
            className="bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl gap-2 px-8"
          >
            <BadgeCheck className="h-4 w-4" /> View My Reservations
          </Button>
          <Button
            variant="outline"
            onClick={() => setLocation("/events")}
            className="rounded-xl border-pink-200 text-pink-600 hover:bg-pink-50"
          >
            Browse More Events
          </Button>
        </motion.div>
      </motion.div>
    </>
  );
}

// ─── MAIN TICKET SECTION ────────────────────────────────────────────────────
function TicketSection({ event, waiverRequired }: { event: any; waiverRequired?: boolean | null }) {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [reserved, setReserved] = useState(false);
  const [reservationData, setReservationData] = useState<any>(null);
  const [atCapacity, setAtCapacity] = useState(false);
  const [joinedWaitlist, setJoinedWaitlist] = useState(false);
  const { data: settings } = trpc.settings.get.useQuery();
  const { data: me } = trpc.auth.me.useQuery(undefined, { enabled: isAuthenticated, retry: false });

  const venmoHandle = settings?.["venmo_handle"] ?? "@SoapiesEvents";

  const joinWaitlist = trpc.reservations.joinWaitlist.useMutation({
    onSuccess: () => { setJoinedWaitlist(true); toast.success("You're on the waitlist!"); },
    onError: (e: any) => toast.error(e.message || "Failed to join waitlist"),
  });

  const createReservation = trpc.reservations.create.useMutation({
    onSuccess: () => {
      setReserved(true);
      utils.events.byId.invalidate({ id: event.id });
    },
    onError: (e: any) => {
      if ((e as any)?.data?.code === "PRECONDITION_FAILED" || e.message === "This event is at capacity.") {
        setAtCapacity(true);
      } else {
        toast.error(e.message || "Failed to create reservation");
      }
    },
  });

  function handleReserve(data: {
    ticketType: string;
    paymentMethod: string;
    totalAmount: string;
    orientationSignal?: "straight" | "queer";
    isQueerPlay?: boolean;
    partnerUserId?: number;
    testResultUrl?: string;
  }) {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }

    let paymentStatus: "pending" | "paid" = "pending";
    if (data.paymentMethod === "credits") paymentStatus = "paid";

    setReservationData(data);
    createReservation.mutate({
      eventId: event.id,
      ticketType: data.ticketType as any,
      totalAmount: data.totalAmount,
      paymentMethod: data.paymentMethod as any,
      paymentStatus,
      orientationSignal: data.orientationSignal,
      isQueerPlay: data.isQueerPlay,
      partnerUserId: data.partnerUserId,
      testResultUrl: data.testResultUrl,
    });
  }

  if (reserved && reservationData) {
    return (
      <>
        <ReservationConfirmation
          paymentMethod={reservationData.paymentMethod}
          totalAmount={reservationData.totalAmount}
          event={event}
          venmoHandle={venmoHandle}
          userName={(me as any)?.name}
        />
        <AddToCalendarSection event={event} />
      </>
    );
  }

  if (!isAuthenticated) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong rounded-3xl p-8 border border-pink-100/50 mb-8 text-center"
      >
        <div className="text-5xl mb-4">🎟️</div>
        <h2 className="font-display text-2xl font-bold text-gray-800 mb-2">Reserve Your Spot</h2>
        <p className="text-gray-500 text-sm mb-6">Sign in or create an account to reserve your ticket</p>
        <Button
          onClick={() => { window.location.href = getLoginUrl(); }}
          className="bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl gap-2 px-8 py-3"
        >
          Sign In to Reserve
        </Button>
        <AddToCalendarSection event={event} />
      </motion.div>
    );
  }

  if (atCapacity) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong rounded-3xl p-8 border border-yellow-200 bg-yellow-50 mb-8 text-center"
      >
        <div className="text-4xl mb-3">⚠️</div>
        <h2 className="font-display text-xl font-bold text-yellow-800 mb-2">This event is at capacity.</h2>
        {joinedWaitlist ? (
          <p className="text-yellow-700 text-sm">✅ You're on the waitlist! We'll notify you if a spot opens up.</p>
        ) : (
          <>
            <p className="text-yellow-700 text-sm mb-4">Join the waitlist? We'll notify you if a spot opens up.</p>
            <Button
              onClick={() => joinWaitlist.mutate({ eventId: event.id })}
              disabled={joinWaitlist.isPending}
              className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl gap-2"
            >
              {joinWaitlist.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join Waitlist"}
            </Button>
          </>
        )}
      </motion.div>
    );
  }

  return (
    <>
      {waiverRequired ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-strong rounded-3xl p-8 border border-yellow-200 bg-yellow-50 mb-8 text-center opacity-60 pointer-events-none select-none"
        >
          <div className="text-4xl mb-2">🔒</div>
          <p className="text-yellow-800 font-semibold">Sign the waiver above to unlock ticket selection.</p>
        </motion.div>
      ) : (
        <ReservationFlow
          event={event}
          onSuccess={handleReserve}
          isSubmitting={createReservation.isPending}
        />
      )}
      <AddToCalendarSection event={event} />
    </>
  );
}

// ─── ADD TO CALENDAR ────────────────────────────────────────────────────────
function AddToCalendarSection({ event }: { event: any }) {
  const start = new Date(event.startDate);
  const end = event.endDate ? new Date(event.endDate) : new Date(start.getTime() + 3 * 60 * 60 * 1000);

  function toGoogleDate(d: Date) {
    return d.toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  }

  const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${toGoogleDate(start)}/${toGoogleDate(end)}&details=${encodeURIComponent(event.description ?? "")}&location=${encodeURIComponent(event.venue ?? "")}`;

  function downloadIcs() {
    const arr = (d: Date): [number, number, number, number, number] => [
      d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes(),
    ];
    const { error, value } = createIcsEvent({
      title: event.title,
      description: event.description ?? "",
      location: event.venue ?? "",
      start: arr(start),
      end: arr(end),
    });
    if (error || !value) return;
    const blob = new Blob([value], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${event.title.replace(/\s+/g, "_")}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap gap-2 mt-4"
    >
      <a
        href={googleUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:border-pink-200 hover:text-pink-600 transition-colors"
      >
        📅 Google Calendar
      </a>
      <button
        onClick={downloadIcs}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:border-pink-200 hover:text-pink-600 transition-colors"
      >
        📅 iCal / Apple
      </button>
    </motion.div>
  );
}

// ─── REFERRAL SECTION ───────────────────────────────────────────────────────
function ReferralSection() {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const { data: referral } = trpc.referrals.myCode.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });
  const generate = trpc.referrals.generate.useMutation({
    onSuccess: () => {
      toast.success("Referral code generated!");
      utils.referrals.myCode.invalidate();
    },
  });

  if (!isAuthenticated) return null;

  const copyCode = () => {
    if (referral?.code) {
      navigator.clipboard.writeText(referral.code);
      toast.success("Code copied!");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="glass-strong rounded-3xl p-6 sm:p-8 border border-pink-100/50 mb-8"
    >
      <h2 className="font-display text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <Sparkles className="h-6 w-6 text-pink-500" /> Refer & Earn
      </h2>
      <p className="text-gray-600 text-sm mb-4">Share your unique code and earn credits for every friend who joins!</p>

      {referral?.code ? (
        <motion.div
          whileHover={{ scale: 1.02 }}
          onClick={copyCode}
          className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 cursor-pointer group"
        >
          <div className="flex-1">
            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Your Code</p>
            <p className="font-mono text-2xl font-black text-pink-600">{referral.code}</p>
          </div>
          <Copy className="h-5 w-5 text-pink-400 group-hover:text-pink-600 transition-colors" />
        </motion.div>
      ) : (
        <Button
          onClick={() => generate.mutate()}
          disabled={generate.isPending}
          className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl gap-2"
        >
          {generate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Generate My Code
        </Button>
      )}
    </motion.div>
  );
}

// ─── FEEDBACK SECTION (for past events) ──────────────────────────────────────
function FeedbackSection({ eventId, isPastEvent }: { eventId: number; isPastEvent: boolean }) {
  const { isAuthenticated } = useAuth();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const { data: feedback } = trpc.events.feedback.useQuery(
    { eventId },
    { enabled: isPastEvent && isAuthenticated, retry: false }
  );

  if (!isPastEvent) return null;
  if (!isAuthenticated) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="glass-strong rounded-3xl p-6 sm:p-8 border border-pink-100/50"
    >
      <h2 className="font-display text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <Star className="h-6 w-6 text-pink-500" /> Event Feedback
      </h2>
      <p className="text-gray-600 text-sm mb-6">How was your experience?</p>

      {/* Rating */}
      <div className="flex gap-2 mb-6">
        {[1, 2, 3, 4, 5].map((star) => (
          <motion.button
            key={star}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setRating(star)}
            className="transition-colors"
          >
            <Star
              className={`h-8 w-8 ${
                star <= rating
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-300"
              }`}
            />
          </motion.button>
        ))}
      </div>

      {/* Comment */}
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Share your thoughts..."
        className="w-full px-4 py-3 rounded-xl border border-pink-100 text-sm outline-none focus:border-pink-300 focus:ring-1 focus:ring-pink-200/50 bg-white/50 resize-none"
        rows={3}
      />

      {/* Existing Feedback */}
      {feedback && feedback.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
          <h3 className="font-bold text-sm text-gray-700">Feedback from Others</h3>
          {feedback.map((f: any, i: number) => (
            <motion.div
              key={f.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className="p-3 rounded-xl bg-gray-50"
            >
              <div className="flex items-center gap-1 mb-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-3 w-3 ${
                      i < (f.rating || 0)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-600">{f.comment}</p>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ─── EVENT DETAILS CARD ──────────────────────────────────────────────────────
function EventDetailsCard({ event }: { event: any }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="glass-strong rounded-3xl p-6 sm:p-8 border border-pink-100/50"
    >
      <h2 className="font-display text-2xl font-bold text-gray-800 mb-6">Event Details</h2>

      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <Calendar className="h-5 w-5 text-pink-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase">Date & Time</p>
            <p className="font-semibold text-gray-800">{format(new Date(event.startDate), "EEEE, MMMM d, yyyy")}</p>
            <p className="text-sm text-gray-600">{format(new Date(event.startDate), "h:mm a")}{event.endDate ? ` - ${format(new Date(event.endDate), "h:mm a")}` : ""}</p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <MapPin className="h-5 w-5 text-pink-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase">Venue</p>
            <p className="font-semibold text-gray-800">{event.venue}</p>
            <p className="text-sm text-gray-600">{event.address}</p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <Users className="h-5 w-5 text-pink-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase">Capacity</p>
            <p className="font-semibold text-gray-800">{event.capacity} guests</p>
            <div className="w-full h-2 rounded-full bg-gray-200 mt-2">
              <div
                className="h-full rounded-full bg-gradient-to-r from-pink-500 to-purple-600"
                style={{ width: "60%" }}
              />
            </div>
          </div>
        </div>

        {event.description && (
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase mb-2">About</p>
            <p className="text-gray-700 leading-relaxed">{event.description}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────
function downloadIcs(event: any) {
  const start = new Date(event.startDate);
  createEvent(
    {
      title: event.title,
      start: [start.getFullYear(), start.getMonth() + 1, start.getDate(), start.getHours(), start.getMinutes()],
      duration: { hours: 4 },
      location: event.venue || '',
      description: event.description || '',
      url: window.location.href,
    },
    (error: any, value: string) => {
      if (!error) {
        const blob = new Blob([value], { type: 'text/calendar' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${event.title.replace(/\s+/g, '-')}.ics`;
        a.click();
        URL.revokeObjectURL(url);
      }
    }
  );
}

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const { data: event, isLoading, error } = trpc.events.byId.useQuery(
    { id: parseInt(id || "0") },
    { retry: false }
  );
  const { data: myProfile } = trpc.profile.me.useQuery(undefined, { enabled: isAuthenticated, retry: false });

  if (isLoading) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
            <Loader2 className="h-10 w-10 text-pink-400" />
          </motion.div>
          <p className="text-sm text-gray-400 font-medium">Loading event...</p>
        </div>
      </PageWrapper>
    );
  }

  if (error || !event) {
    return (
      <PageWrapper>
        <div className="container px-4 max-w-4xl mx-auto py-12">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="font-display text-2xl font-bold text-gray-800 mb-2">Event Not Found</h2>
            <p className="text-gray-600 mb-6">This event doesn't exist or has been removed.</p>
            <Link href="/events">
              <Button className="bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl gap-2">
                <ArrowLeft className="h-4 w-4" /> Back to Events
              </Button>
            </Link>
          </motion.div>
        </div>
      </PageWrapper>
    );
  }

  const isPastEvent = isPast(new Date(event.startDate));

  return (
    <PageWrapper>
      <div className="container px-4 max-w-4xl mx-auto py-6 sm:py-8">
        {/* Back Button */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <Link href="/events">
            <button className="flex items-center gap-2 text-pink-600 hover:text-pink-700 font-semibold mb-6 transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back to Events
            </button>
          </Link>
        </motion.div>

        {/* Hero */}
        <EventHero event={event} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Waiver Gate Banner */}
            {!isPastEvent && (event as any).requiresWaiver && myProfile && !(myProfile as any).waiverSignedAt && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-4 rounded-2xl bg-yellow-50 border border-yellow-300"
              >
                <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                <p className="text-sm text-yellow-800 font-medium flex-1">
                  ⚠️ This event requires a signed waiver before you can reserve tickets.{" "}
                  <Link href="/waiver">
                    <span className="underline font-bold text-yellow-900 hover:text-yellow-700 cursor-pointer">Sign Waiver →</span>
                  </Link>
                </p>
              </motion.div>
            )}
            {/* Ticket / Reservation Flow */}
            {!isPastEvent && (
              <TicketSection
                event={event}
                waiverRequired={(event as any).requiresWaiver && myProfile && !(myProfile as any).waiverSignedAt}
              />
            )}

            {/* Event Details */}
            <EventDetailsCard event={event} />

            {/* Referral */}
            <ReferralSection />

            {/* Feedback */}
            <FeedbackSection eventId={event.id} isPastEvent={isPastEvent} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Share Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="glass-strong rounded-3xl p-6 border border-pink-100/50"
            >
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Share2 className="h-5 w-5 text-pink-500" /> Share Event
              </h3>
              <Button
                onClick={() => {
                  const text = `Join me at ${event.title}! 🎉`;
                  if (navigator.share) {
                    navigator.share({ title: event.title, text });
                  } else {
                    navigator.clipboard.writeText(`${text} ${window.location.href}`);
                    toast.success("Copied to clipboard!");
                  }
                }}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl gap-2"
              >
                <Share2 className="h-4 w-4" /> Share with Friends
              </Button>
            </motion.div>

            {/* Calendar Export Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="glass-strong rounded-3xl p-6 border border-pink-100/50"
            >
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-pink-500" /> Add to Calendar
              </h3>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => downloadIcs(event)}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-pink-100/50 text-gray-700 hover:text-pink-600 text-sm px-4 py-2.5 rounded-xl transition w-full justify-center font-medium"
                >
                  📅 Add to iCal
                </button>
                <a
                  href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${new Date(event.startDate).toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${new Date(new Date(event.startDate).getTime() + 4 * 3600000).toISOString().replace(/[-:]/g, '').split('.')[0]}Z&details=${encodeURIComponent(event.description || '')}&location=${encodeURIComponent(event.venue || '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-pink-100/50 text-gray-700 hover:text-pink-600 text-sm px-4 py-2.5 rounded-xl transition w-full justify-center font-medium"
                >
                  📅 Google Calendar
                </a>
              </div>
            </motion.div>

            {/* Info Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="glass-strong rounded-3xl p-6 border border-pink-100/50 space-y-4"
            >
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase">Event Type</p>
                <p className="font-semibold text-gray-800 mt-1">{getEventTypeLabel(event.title)}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase">Capacity</p>
                <p className="font-semibold text-gray-800 mt-1">{event.capacity} guests</p>
              </div>
              {event.priceSingleFemale && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase">Pricing</p>
                  <div className="mt-1 space-y-1 text-sm">
                    <p className="text-gray-700">👩 Women: <span className="font-bold">${parseFloat(event.priceSingleFemale).toFixed(2)}</span></p>
                    {event.priceCouple && <p className="text-gray-700">💑 Couple: <span className="font-bold">${parseFloat(event.priceCouple).toFixed(2)}</span></p>}
                    {event.priceSingleMale && <p className="text-gray-700">👨 Men: <span className="font-bold">${parseFloat(event.priceSingleMale).toFixed(2)}</span></p>}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
