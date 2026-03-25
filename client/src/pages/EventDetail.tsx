import PageWrapper from "@/components/PageWrapper";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, MapPin, Users, Clock, ArrowLeft, Loader2, Ticket,
  Star, Minus, Plus, ShoppingCart, Sparkles, Heart, Shield,
  ChevronDown, PartyPopper, Music, Waves, X, Check, Copy, Share2, AlertCircle
} from "lucide-react";
import { Link, useParams, useLocation } from "wouter";
import { format, isFuture, isPast, differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds } from "date-fns";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { useState, useEffect, useMemo, useCallback } from "react";

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

// ─── TICKET SELECTION ───────────────────────────────────────────────────────
function TicketSelection({ event, onReserve }: { event: any; onReserve: (data: any) => void }) {
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [promoCode, setPromoCode] = useState("");
  const [selectedAddons, setSelectedAddons] = useState<number[]>([]);
  const [showAddons, setShowAddons] = useState(false);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<any>(null);

  const { data: addons } = trpc.eventAddons.list.useQuery({ eventId: event.id });
  const utils = trpc.useUtils();

  const ticketPrice = useMemo(() => {
    if (!selectedTicket) return 0;
    if (selectedTicket === "single_female") return parseFloat(event.priceSingleFemale || "0");
    if (selectedTicket === "single_male") return parseFloat(event.priceSingleMale || "0");
    if (selectedTicket === "couple") return parseFloat(event.priceCouple || "0");
    return 0;
  }, [selectedTicket, event]);

  const addonPrice = useMemo(() => {
    return selectedAddons.reduce((sum, addonId) => {
      const addon = addons?.find((a: any) => a.id === addonId);
      return sum + (addon ? parseFloat(addon.price || "0") : 0);
    }, 0);
  }, [selectedAddons, addons]);

  const subtotal = (ticketPrice + addonPrice) * quantity;
  const discount = appliedPromo ? calculateDiscount(subtotal, appliedPromo) : 0;
  const total = subtotal - discount;

  function calculateDiscount(amount: number, promo: any) {
    if (promo.discountType === "percentage") {
      return amount * (parseFloat(promo.discountValue || "0") / 100);
    }
    return parseFloat(promo.discountValue || "0");
  }

  async function handleApplyPromo() {
    if (!promoCode.trim()) {
      toast.error("Enter a promo code");
      return;
    }
    setIsApplyingPromo(true);
    try {
      const result = await utils.promoCodes.validate.fetch({ code: promoCode });
      if (result.valid && result.promo) {
        setAppliedPromo(result.promo);
        toast.success(`Promo applied! ${result.promo.discountType === "percentage" ? result.promo.discountValue + "% off" : "$" + result.promo.discountValue + " off"}`);
      } else {
        toast.error(result.reason ?? "Invalid promo code");
      }
    } finally {
      setIsApplyingPromo(false);
    }
  }

  function handleReserve() {
    if (!selectedTicket) {
      toast.error("Select a ticket type");
      return;
    }
    onReserve({
      ticketType: selectedTicket,
      quantity,
      totalAmount: total.toFixed(2),
      addons: selectedAddons,
      promoCode: appliedPromo?.code || null,
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="glass-strong rounded-3xl p-6 sm:p-8 border border-pink-100/50 mb-8"
    >
      <h2 className="font-display text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <Ticket className="h-6 w-6 text-pink-500" /> Select Your Ticket
      </h2>

      {/* Ticket Types */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {TICKET_TYPES.map((ticket) => (
          <motion.div
            key={ticket.id}
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedTicket(ticket.id)}
            className={`relative p-5 rounded-2xl border-2 cursor-pointer transition-all ${
              selectedTicket === ticket.id
                ? `border-pink-500 ${ticket.bgColor} shadow-lg shadow-pink-200/50`
                : `border-gray-100 bg-white hover:border-pink-200`
            }`}
          >
            {selectedTicket === ticket.id && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center"
              >
                <Check className="h-4 w-4 text-white" />
              </motion.div>
            )}
            <div className="text-3xl mb-2">{ticket.emoji}</div>
            <h3 className={`font-bold ${ticket.textColor}`}>{ticket.label}</h3>
            <p className="text-xs text-gray-400 mt-1">{ticket.description}</p>
            <p className="text-lg font-black text-gray-800 mt-3">${ticketPrice.toFixed(2)}</p>
          </motion.div>
        ))}
      </div>

      {/* Quantity & Addons */}
      {selectedTicket && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Quantity */}
          <div className="flex items-center gap-6">
            <label className="text-sm font-bold text-gray-600">Quantity</label>
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-pink-100 flex items-center justify-center transition-colors"
              >
                <Minus className="h-4 w-4 text-gray-600" />
              </motion.button>
              <span className="font-display font-bold text-lg text-gray-800 w-8 text-center">{quantity}</span>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setQuantity(Math.min(event.capacity || 10, quantity + 1))}
                className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-pink-100 flex items-center justify-center transition-colors"
              >
                <Plus className="h-4 w-4 text-gray-600" />
              </motion.button>
            </div>
          </div>

          {/* Addons */}
          {addons && addons.length > 0 && (
            <motion.div className="pb-6 border-b border-gray-200">
              <button
                onClick={() => setShowAddons(!showAddons)}
                className="flex items-center gap-2 text-sm font-bold text-gray-700 hover:text-pink-600 transition-colors"
              >
                <ShoppingCart className="h-4 w-4" />
                Add-ons ({selectedAddons.length})
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${showAddons ? "rotate-180" : ""}`}
                />
              </button>
              <AnimatePresence>
                {showAddons && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 space-y-2"
                  >
                    {addons.map((addon: any) => (
                      <label
                        key={addon.id}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedAddons.includes(addon.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedAddons([...selectedAddons, addon.id]);
                            } else {
                              setSelectedAddons(selectedAddons.filter(id => id !== addon.id));
                            }
                          }}
                          className="rounded"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-sm text-gray-700">{addon.name}</p>
                          {addon.description && <p className="text-xs text-gray-400">{addon.description}</p>}
                        </div>
                        <p className="font-bold text-gray-800">${parseFloat(addon.price || "0").toFixed(2)}</p>
                      </label>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Promo Code */}
          <div>
            <label className="text-sm font-bold text-gray-600 block mb-2">Promo Code</label>
            <div className="flex gap-2">
              <Input
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                placeholder="Enter code"
                disabled={appliedPromo !== null}
                className="flex-1 rounded-xl border-pink-100"
              />
              {appliedPromo ? (
                <Button
                  onClick={() => {
                    setAppliedPromo(null);
                    setPromoCode("");
                  }}
                  className="bg-red-500 text-white rounded-xl"
                >
                  <X className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleApplyPromo}
                  disabled={isApplyingPromo}
                  className="bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl"
                >
                  {isApplyingPromo ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                </Button>
              )}
            </div>
            {appliedPromo && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-green-600 font-medium mt-2"
              >
                ✓ {appliedPromo.code} applied
              </motion.p>
            )}
          </div>
        </motion.div>
      )}

      {/* Order Summary */}
      {selectedTicket && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 p-5 rounded-2xl bg-gradient-to-br from-pink-50 to-purple-50 border border-pink-100"
        >
          <div className="space-y-2 text-sm mb-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Ticket × {quantity}</span>
              <span className="font-semibold text-gray-800">${(ticketPrice * quantity).toFixed(2)}</span>
            </div>
            {addonPrice > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Add-ons</span>
                <span className="font-semibold text-gray-800">${(addonPrice * quantity).toFixed(2)}</span>
              </div>
            )}
            {discount > 0 && (
              <div className="flex justify-between text-green-600 font-semibold">
                <span>Discount</span>
                <span>-${discount.toFixed(2)}</span>
              </div>
            )}
          </div>
          <div className="border-t border-pink-200 pt-2 flex justify-between">
            <span className="font-bold text-gray-800">Total</span>
            <span className="font-display text-2xl font-black bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">${total.toFixed(2)}</span>
          </div>
        </motion.div>
      )}

      {/* Reserve Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleReserve}
        disabled={!selectedTicket}
        className={`w-full mt-8 py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${
          selectedTicket
            ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-xl shadow-pink-200/50 hover:shadow-pink-200/70"
            : "bg-gray-200 text-gray-400 cursor-not-allowed"
        }`}
      >
        <ShoppingCart className="h-5 w-5" /> Reserve Now
      </motion.button>
    </motion.div>
  );
}

// ─── REFERRAL SECTION ───────────────────────────────────────────────────────
function ReferralSection() {
  const { isAuthenticated } = useAuth();
  const { data: referral } = trpc.referrals.myCode.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });
  const generate = trpc.referrals.generate.useMutation({
    onSuccess: () => toast.success("Referral code generated!"),
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
            <p className="text-sm text-gray-600">{format(new Date(event.startDate), "h:mm a")} - {format(new Date(event.endDate), "h:mm a")}</p>
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
export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const { data: event, isLoading, error } = trpc.events.byId.useQuery(
    { id: parseInt(id || "0") },
    { retry: false }
  );
  const createReservation = trpc.reservations.create.useMutation({
    onSuccess: (res) => {
      toast.success("Reservation created! ✨");
      setLocation("/dashboard");
    },
    onError: (e: any) => toast.error(e.message),
  });

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
            {/* Ticket Selection */}
            {!isPastEvent && (
              <TicketSelection
                event={event}
                onReserve={(data) => {
                  if (!isAuthenticated) {
                    window.location.href = getLoginUrl();
                    return;
                  }
                  createReservation.mutate({
                    eventId: event.id,
                    ...data,
                  });
                }}
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
            </motion.div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
