import PageWrapper from "@/components/PageWrapper";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, MapPin, Users, Clock, ArrowLeft, Loader2, Ticket,
  Star, Minus, Plus, ShoppingCart, Sparkles, Heart, Shield,
  ChevronDown, PartyPopper, Music, Waves, X, Check
} from "lucide-react";
import { Link, useParams, useLocation } from "wouter";
import { format, isFuture, differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds } from "date-fns";
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
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="font-display text-2xl sm:text-3xl font-black text-white"
            >
              {String(value).padStart(2, "0")}
            </motion.span>
          </AnimatePresence>
        </div>
        <motion.div
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-pink-400/20 to-purple-400/20 -z-10 blur-sm"
        />
      </div>
      <span className="text-[10px] sm:text-xs font-bold text-white/70 uppercase tracking-widest mt-2">{label}</span>
    </motion.div>
  );
}

// ─── TICKET SELECTOR CARD ───────────────────────────────────────────────────
function TicketCard({
  ticket,
  price,
  quantity,
  onQuantityChange,
  isSelected,
  index,
}: {
  ticket: typeof TICKET_TYPES[0];
  price: number;
  quantity: number;
  onQuantityChange: (qty: number) => void;
  isSelected: boolean;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 * index, type: "spring", stiffness: 200 }}
      whileHover={{ scale: 1.02 }}
      onClick={() => quantity === 0 && onQuantityChange(1)}
      className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-300 cursor-pointer ${
        isSelected
          ? `${ticket.borderColor} shadow-lg shadow-pink-100/50`
          : "border-gray-100 hover:border-pink-100"
      }`}
    >
      {/* Selection indicator */}
      <AnimatePresence>
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute top-3 right-3 w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center z-10"
          >
            <Check className="h-3.5 w-3.5 text-white" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-5">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <motion.div
            animate={isSelected ? { rotate: [0, -10, 10, 0] } : {}}
            transition={{ duration: 0.5 }}
            className={`w-12 h-12 rounded-xl bg-gradient-to-br ${ticket.color} flex items-center justify-center text-2xl shadow-md`}
          >
            {ticket.emoji}
          </motion.div>
          <div>
            <h4 className="font-display font-bold text-gray-800">{ticket.label}</h4>
            <p className="text-xs text-gray-400">{ticket.description}</p>
          </div>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-1 mb-4">
          <span className={`text-3xl font-black ${ticket.textColor}`}>${price}</span>
          <span className="text-sm text-gray-400">/ticket</span>
        </div>

        {/* Quantity Controls */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</span>
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.stopPropagation(); onQuantityChange(Math.max(0, quantity - 1)); }}
              disabled={quantity === 0}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                quantity === 0
                  ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                  : `${ticket.bgColor} ${ticket.textColor} hover:shadow-md`
              }`}
            >
              <Minus className="h-4 w-4" />
            </motion.button>

            <AnimatePresence mode="popLayout">
              <motion.span
                key={quantity}
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 10, opacity: 0 }}
                className="w-8 text-center font-display text-xl font-black text-gray-800"
              >
                {quantity}
              </motion.span>
            </AnimatePresence>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.stopPropagation(); onQuantityChange(Math.min(10, quantity + 1)); }}
              disabled={quantity >= 10}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                quantity >= 10
                  ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                  : `bg-gradient-to-br ${ticket.color} text-white shadow-md hover:shadow-lg`
              }`}
            >
              <Plus className="h-4 w-4" />
            </motion.button>
          </div>
        </div>

        {/* Subtotal */}
        <AnimatePresence>
          {quantity > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className={`mt-4 pt-3 border-t ${ticket.borderColor} flex items-center justify-between`}>
                <span className="text-xs text-gray-500">Subtotal</span>
                <motion.span
                  key={quantity * price}
                  initial={{ scale: 1.3 }}
                  animate={{ scale: 1 }}
                  className={`font-display font-black text-lg ${ticket.textColor}`}
                >
                  ${(quantity * price).toFixed(2)}
                </motion.span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── MAIN EVENT DETAIL PAGE ─────────────────────────────────────────────────
export default function EventDetail() {
  const params = useParams<{ id: string }>();
  const eventId = parseInt(params.id || "0");
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const { data: event, isLoading } = trpc.events.byId.useQuery(
    { id: eventId },
    { enabled: eventId > 0, staleTime: 60_000, refetchOnWindowFocus: false }
  );

  const utils = trpc.useUtils();
  const createReservation = trpc.reservations.create.useMutation({
    onSuccess: () => {
      toast.success("Reservation confirmed! 🎉", {
        description: "Check your dashboard for details.",
      });
      utils.reservations.myReservations.invalidate();
      setShowSuccess(true);
    },
    onError: (err) => toast.error(err.message),
  });

  // Ticket state
  const [quantities, setQuantities] = useState<Record<string, number>>({
    single_female: 0,
    couple: 0,
    single_male: 0,
  });
  const [showReservationForm, setShowReservationForm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Prices from event data
  const prices = useMemo(() => ({
    single_female: event?.priceSingleFemale ? parseFloat(event.priceSingleFemale) : 40,
    couple: event?.priceCouple ? parseFloat(event.priceCouple) : 130,
    single_male: event?.priceSingleMale ? parseFloat(event.priceSingleMale) : 145,
  }), [event]);

  // Calculate totals
  const orderSummary = useMemo(() => {
    const items = TICKET_TYPES.map(t => ({
      ...t,
      quantity: quantities[t.id] || 0,
      price: prices[t.id as keyof typeof prices],
      subtotal: (quantities[t.id] || 0) * prices[t.id as keyof typeof prices],
    })).filter(i => i.quantity > 0);

    const total = items.reduce((sum, i) => sum + i.subtotal, 0);
    const totalTickets = items.reduce((sum, i) => sum + i.quantity, 0);

    return { items, total, totalTickets };
  }, [quantities, prices]);

  const handleQuantityChange = useCallback((ticketId: string, qty: number) => {
    setQuantities(prev => ({ ...prev, [ticketId]: qty }));
  }, []);

  const handleReserve = () => {
    if (orderSummary.totalTickets === 0) {
      toast.error("Please select at least one ticket");
      return;
    }

    const ticketSummary = orderSummary.items.map(i => `${i.quantity}x ${i.label}`).join(", ");

    createReservation.mutate({
      eventId: event!.id,
      ticketType: ticketSummary,
      quantity: orderSummary.totalTickets,
      totalAmount: orderSummary.total.toFixed(2),
    });
  };

  // Countdown
  const countdown = useCountdown(event?.startDate ? new Date(event.startDate) : new Date());

  // ─── LOADING STATE ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Loader2 className="h-12 w-12 text-pink-400" />
          </motion.div>
          <p className="text-sm text-gray-400 font-medium">Loading event details...</p>
        </div>
      </PageWrapper>
    );
  }

  // ─── NOT FOUND ──────────────────────────────────────────────────────────
  if (!event) {
    return (
      <PageWrapper>
        <div className="container px-4 py-20 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring" }}
            className="inline-flex w-20 h-20 rounded-full bg-pink-50 items-center justify-center mb-6"
          >
            <Calendar className="h-10 w-10 text-pink-300" />
          </motion.div>
          <h2 className="font-display text-2xl font-bold text-gray-700 mb-2">Event not found</h2>
          <p className="text-gray-400 mb-6">This event may have been removed or doesn't exist.</p>
          <Link href="/events">
            <Button variant="outline" className="rounded-xl gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to Events
            </Button>
          </Link>
        </div>
      </PageWrapper>
    );
  }

  const isUpcoming = event.startDate ? isFuture(new Date(event.startDate)) : false;
  const eventTypeLabel = getEventTypeLabel(event.title);
  const eventTypeIcon = getEventTypeIcon(event.title);

  // ─── SUCCESS OVERLAY ────────────────────────────────────────────────────
  if (showSuccess) {
    return (
      <PageWrapper>
        <div className="container px-4 py-20 max-w-lg mx-auto text-center">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="inline-flex w-24 h-24 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 items-center justify-center mb-8 shadow-2xl shadow-pink-200/50"
          >
            <Check className="h-12 w-12 text-white" />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="font-display text-3xl font-black text-gray-800 mb-3"
          >
            You're In! 🎉
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-gray-500 mb-2"
          >
            Your reservation for <strong className="text-pink-600">{event.title}</strong> has been submitted.
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-sm text-gray-400 mb-8"
          >
            {orderSummary.items.map(i => `${i.quantity}x ${i.label}`).join(" · ")} · Total: ${orderSummary.total.toFixed(2)}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Link href="/dashboard">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button className="bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl px-8 shadow-lg gap-2">
                  <Ticket className="h-4 w-4" /> View My Reservations
                </Button>
              </motion.div>
            </Link>
            <Link href="/events">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button variant="outline" className="rounded-xl px-8 border-pink-200 text-pink-600 gap-2">
                  Browse More Events
                </Button>
              </motion.div>
            </Link>
          </motion.div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper withPadding={false}>
      {/* ─── HERO SECTION ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          {event.coverImageUrl ? (
            <img src={event.coverImageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-600" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-pink-900/30 to-purple-900/30" />
        </div>

        <div className="relative z-10 container px-4 pt-24 pb-12 sm:pt-28 sm:pb-16">
          {/* Back button */}
          <Link href="/events">
            <motion.div
              whileHover={{ x: -4 }}
              className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-8 cursor-pointer text-sm"
            >
              <ArrowLeft className="h-4 w-4" /> All Events
            </motion.div>
          </Link>

          <div className="max-w-3xl">
            {/* Event type badge */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-xs font-bold mb-4"
            >
              {eventTypeIcon}
              {eventTypeLabel}
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="font-display text-4xl sm:text-5xl md:text-6xl font-black text-white leading-tight mb-4"
            >
              {event.title}
            </motion.h1>

            {/* Quick info pills */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-wrap gap-3 mb-8"
            >
              {event.startDate && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-sm text-white text-sm font-medium">
                  <Calendar className="h-4 w-4 text-pink-300" />
                  {format(new Date(event.startDate), "EEEE, MMM d, yyyy")}
                </span>
              )}
              {event.startDate && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-sm text-white text-sm font-medium">
                  <Clock className="h-4 w-4 text-purple-300" />
                  {format(new Date(event.startDate), "h:mm a")}
                  {event.endDate && ` – ${format(new Date(event.endDate), "h:mm a")}`}
                </span>
              )}
              {event.venue && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-sm text-white text-sm font-medium">
                  <MapPin className="h-4 w-4 text-pink-300" />
                  {event.venue}
                </span>
              )}
              {event.capacity && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-sm text-white text-sm font-medium">
                  <Users className="h-4 w-4 text-purple-300" />
                  {event.capacity} spots
                </span>
              )}
            </motion.div>

            {/* Countdown */}
            {countdown && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <p className="text-xs font-bold text-white/50 uppercase tracking-widest mb-3">Event starts in</p>
                <div className="flex gap-3 sm:gap-4">
                  <CountdownUnit value={countdown.days} label="Days" />
                  <CountdownUnit value={countdown.hours} label="Hours" />
                  <CountdownUnit value={countdown.minutes} label="Mins" />
                  <CountdownUnit value={countdown.seconds} label="Secs" />
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* ─── MAIN CONTENT ──────────────────────────────────────────────── */}
      <section className="container px-4 py-10 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left column: Details */}
          <div className="lg:col-span-3 space-y-8">
            {/* About */}
            {event.description && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl p-6 shadow-lg shadow-pink-50/50 border border-pink-50"
              >
                <h3 className="font-display text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-pink-500" /> About This Event
                </h3>
                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{event.description}</p>
              </motion.div>
            )}

            {/* Venue details */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl p-6 shadow-lg shadow-pink-50/50 border border-pink-50"
            >
              <h3 className="font-display text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-purple-500" /> Venue
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{event.venue || "TBA"}</p>
                    {event.address && <p className="text-sm text-gray-500 mt-0.5">{event.address}</p>}
                  </div>
                </div>
                {event.startDate && (
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center flex-shrink-0">
                      <Clock className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">
                        {format(new Date(event.startDate), "EEEE, MMMM d, yyyy")}
                      </p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {format(new Date(event.startDate), "h:mm a")}
                        {event.endDate && ` – ${format(new Date(event.endDate), "h:mm a")}`}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* What to expect */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl p-6 shadow-lg shadow-pink-50/50 border border-pink-50"
            >
              <h3 className="font-display text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Heart className="h-5 w-5 text-pink-500" /> What to Expect
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Shield, text: "Safe & Vetted", desc: "All guests verified" },
                  { icon: Star, text: "Premium Experience", desc: "Curated atmosphere" },
                  { icon: Users, text: "Like-Minded People", desc: "Open community" },
                  { icon: Heart, text: "No Judgment", desc: "Be yourself" },
                ].map((item, i) => (
                  <motion.div
                    key={item.text}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                    className="p-3 rounded-xl bg-gradient-to-br from-pink-50/50 to-purple-50/50 border border-pink-50"
                  >
                    <item.icon className="h-5 w-5 text-pink-500 mb-1.5" />
                    <p className="text-sm font-bold text-gray-800">{item.text}</p>
                    <p className="text-[11px] text-gray-400">{item.desc}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right column: Reservation form */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="sticky top-24"
            >
              <div className="bg-white rounded-2xl shadow-xl shadow-pink-100/50 border border-pink-50 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-display text-lg font-black text-white">Get Tickets</h3>
                      <p className="text-white/70 text-xs mt-0.5">Select your ticket type below</p>
                    </div>
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 3, repeat: Infinity }}
                    >
                      <Ticket className="h-8 w-8 text-white/50" />
                    </motion.div>
                  </div>
                </div>

                {/* Ticket selection */}
                <div className="p-5 space-y-4">
                  {isUpcoming ? (
                    <>
                      {TICKET_TYPES.map((ticket, i) => (
                        <TicketCard
                          key={ticket.id}
                          ticket={ticket}
                          price={prices[ticket.id as keyof typeof prices]}
                          quantity={quantities[ticket.id]}
                          onQuantityChange={(qty) => handleQuantityChange(ticket.id, qty)}
                          isSelected={quantities[ticket.id] > 0}
                          index={i}
                        />
                      ))}

                      {/* Order summary */}
                      <AnimatePresence>
                        {orderSummary.totalTickets > 0 && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="rounded-2xl bg-gradient-to-br from-pink-50 to-purple-50 p-4 border border-pink-100">
                              <h4 className="font-display font-bold text-gray-800 mb-3 text-sm">Order Summary</h4>
                              {orderSummary.items.map(item => (
                                <div key={item.id} className="flex items-center justify-between text-sm mb-1.5">
                                  <span className="text-gray-600">
                                    {item.quantity}x {item.label}
                                  </span>
                                  <span className="font-semibold text-gray-800">${item.subtotal.toFixed(2)}</span>
                                </div>
                              ))}
                              <div className="border-t border-pink-200 mt-3 pt-3 flex items-center justify-between">
                                <span className="font-display font-bold text-gray-800">Total</span>
                                <motion.span
                                  key={orderSummary.total}
                                  initial={{ scale: 1.2 }}
                                  animate={{ scale: 1 }}
                                  className="font-display text-2xl font-black bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent"
                                >
                                  ${orderSummary.total.toFixed(2)}
                                </motion.span>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Reserve button */}
                      {isAuthenticated ? (
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <Button
                            onClick={handleReserve}
                            disabled={createReservation.isPending || orderSummary.totalTickets === 0}
                            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-xl py-6 text-base font-bold shadow-xl shadow-pink-200/50 gap-2 disabled:opacity-50"
                            size="lg"
                          >
                            {createReservation.isPending ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              <ShoppingCart className="h-5 w-5" />
                            )}
                            {orderSummary.totalTickets === 0
                              ? "Select Tickets"
                              : createReservation.isPending
                                ? "Processing..."
                                : `Reserve ${orderSummary.totalTickets} Ticket${orderSummary.totalTickets > 1 ? "s" : ""}`
                            }
                          </Button>
                        </motion.div>
                      ) : (
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <Button
                            onClick={() => window.location.href = getLoginUrl()}
                            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl py-6 text-base font-bold shadow-xl gap-2"
                            size="lg"
                          >
                            <Sparkles className="h-5 w-5" /> Sign In to Get Tickets
                          </Button>
                        </motion.div>
                      )}

                      <p className="text-[11px] text-gray-400 text-center leading-relaxed">
                        By reserving, you agree to our community guidelines. All sales are final.
                      </p>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                        <Calendar className="h-8 w-8 text-gray-300" />
                      </div>
                      <p className="font-display font-bold text-gray-600 mb-1">Event has passed</p>
                      <p className="text-sm text-gray-400">Check out our upcoming events!</p>
                      <Link href="/events">
                        <Button variant="outline" className="mt-4 rounded-xl border-pink-200 text-pink-600 gap-2">
                          Browse Events <ArrowLeft className="h-4 w-4 rotate-180" />
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Bottom spacing */}
      <div className="pb-20" />
    </PageWrapper>
  );
}
