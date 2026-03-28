import PageWrapper from "@/components/PageWrapper";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, Ticket, Bell, CreditCard, Gift, Star, ChevronRight,
  Loader2, Check, Clock, Sparkles, Heart, MessageCircle, Users,
  ArrowUpRight, Copy, PartyPopper, Zap, TrendingUp, Shield, Share2
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { format, isFuture } from "date-fns";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { FloatingBubbles, GlowOrb } from "@/components/FloatingElements";

// ─── ANIMATED COUNTER ──────────────────────────────────────────────────────
function AnimatedNumber({ value, className = "" }: { value: number; className?: string }) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: -10, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={className}
    >
      {value}
    </motion.span>
  );
}

// ─── GREETING SECTION ──────────────────────────────────────────────────────
function GreetingHero({ userName }: { userName: string }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";
  const emoji = hour < 12 ? "☀️" : hour < 18 ? "✨" : "🌙";

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-pink-500 via-fuchsia-500 to-purple-600 p-6 sm:p-8 mb-8">
      <FloatingBubbles count={6} />
      <GlowOrb className="top-0 right-0 opacity-30" color="oklch(0.85 0.15 340 / 0.3)" size={200} />

      <div className="relative z-10">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 text-white/70 text-sm font-medium mb-2"
        >
          <span>{emoji}</span>
          <span>{greeting}</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="font-display text-3xl sm:text-4xl font-black text-white mb-2"
        >
          {userName}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-white/70 text-sm sm:text-base max-w-md"
        >
          Welcome back to your Soapies hub. Here's what's happening.
        </motion.p>

        {/* Quick action pills */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap gap-2 mt-5"
        >
          <Link href="/events">
            <motion.span
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/15 backdrop-blur-sm rounded-full text-white text-xs font-bold border border-white/20 cursor-pointer hover:bg-white/25 transition-colors"
            >
              <Calendar className="h-3.5 w-3.5" /> Browse Events
            </motion.span>
          </Link>
          <Link href="/wall">
            <motion.span
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/15 backdrop-blur-sm rounded-full text-white text-xs font-bold border border-white/20 cursor-pointer hover:bg-white/25 transition-colors"
            >
              <MessageCircle className="h-3.5 w-3.5" /> Community Wall
            </motion.span>
          </Link>
          <Link href="/messages">
            <motion.span
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/15 backdrop-blur-sm rounded-full text-white text-xs font-bold border border-white/20 cursor-pointer hover:bg-white/25 transition-colors"
            >
              <Heart className="h-3.5 w-3.5" /> Messages
            </motion.span>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

// ─── STAT CARD ─────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, delay, suffix = "" }: {
  icon: any; label: string; value: number | string; color: string; delay: number; suffix?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 200 }}
      whileHover={{ y: -4, scale: 1.03 }}
      className="relative overflow-hidden"
    >
      <div className="glass-strong rounded-2xl p-5 border border-pink-100/50 hover:shadow-lg hover:shadow-pink-100/30 transition-all duration-300">
        <div className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${color} shadow-md mb-3`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div className="font-display text-2xl sm:text-3xl font-black text-gray-800">
          {typeof value === "number" ? <AnimatedNumber value={value} /> : value}{suffix}
        </div>
        <p className="text-xs font-medium text-gray-400 mt-1 uppercase tracking-wider">{label}</p>
      </div>
    </motion.div>
  );
}

// ─── RESERVATIONS SECTION ──────────────────────────────────────────────────
function ReservationsSection() {
  const { isAuthenticated } = useAuth();
  const { data: reservations, isLoading } = trpc.reservations.myReservations.useQuery(undefined, {
    retry: false, refetchOnWindowFocus: false, staleTime: 30_000, enabled: isAuthenticated,
  });
  const [, setLocation] = useLocation();

  const statusConfig: Record<string, { color: string; icon: any; bg: string }> = {
    confirmed: { color: "text-emerald-600", icon: Check, bg: "bg-emerald-50" },
    pending: { color: "text-amber-600", icon: Clock, bg: "bg-amber-50" },
    cancelled: { color: "text-red-500", icon: Zap, bg: "bg-red-50" },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass-strong rounded-2xl border border-pink-100/50 overflow-hidden"
    >
      <div className="p-5 border-b border-pink-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-purple-400 to-indigo-500 shadow-md">
            <Ticket className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-display font-bold text-gray-800">My Reservations</h3>
            <p className="text-xs text-gray-400">{reservations?.length ?? 0} total</p>
          </div>
        </div>
        <Link href="/events">
          <motion.span whileHover={{ x: 4 }} className="text-xs font-bold text-pink-500 flex items-center gap-1 cursor-pointer">
            View All <ArrowUpRight className="h-3.5 w-3.5" />
          </motion.span>
        </Link>
      </div>

      <div className="p-5">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 text-pink-300 animate-spin" />
          </div>
        ) : !reservations || reservations.length === 0 ? (
          <div className="text-center py-8">
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="inline-flex w-14 h-14 rounded-2xl bg-pink-50 items-center justify-center mb-3"
            >
              <Ticket className="h-7 w-7 text-pink-300" />
            </motion.div>
            <p className="text-sm font-medium text-gray-500 mb-1">No reservations yet</p>
            <p className="text-xs text-gray-400 mb-4">Browse events and grab your tickets!</p>
            <Link href="/events">
              <Button size="sm" className="bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl text-xs gap-1">
                <Calendar className="h-3.5 w-3.5" /> Explore Events
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {reservations.slice(0, 4).map((r: any, i: number) => {
              const cfg = statusConfig[r.status] || statusConfig.pending;
              const StatusIcon = cfg.icon;
              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ x: 4 }}
                  onClick={() => r.eventId && setLocation(`/events/${r.eventId}`)}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-pink-50/50 transition-colors cursor-pointer group"
                >
                  <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                    <StatusIcon className={`h-5 w-5 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{r.ticketType}</p>
                    <p className="text-xs text-gray-400">
                      {r.quantity} ticket{r.quantity > 1 ? "s" : ""} · {format(new Date(r.createdAt), "MMM d, yyyy")}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-gray-800">${parseFloat(r.totalAmount || "0").toFixed(2)}</p>
                    <p className={`text-[10px] font-bold uppercase ${cfg.color}`}>{r.status}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-pink-400 transition-colors flex-shrink-0" />
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── TICKETS DASHBOARD ─────────────────────────────────────────────────────
function TicketsDashboard() {
  const { isAuthenticated } = useAuth();
  const { data: reservations, isLoading } = trpc.reservations.myReservations.useQuery(undefined, {
    retry: false, refetchOnWindowFocus: false, staleTime: 30_000, enabled: isAuthenticated,
  });
  const [, setLocation] = useLocation();
  const [expanded, setExpanded] = useState(false);

  const upcoming = useMemo(() => {
    if (!reservations) return [];
    return (reservations as any[])
      .filter((r: any) => r.status !== 'cancelled');
  }, [reservations]);

  const visibleTickets = expanded ? upcoming : upcoming.slice(0, 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="glass-strong rounded-2xl border border-pink-100/50 overflow-hidden h-full"
    >
      <div className="p-5 border-b border-pink-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 shadow-md">
            <Ticket className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-display font-bold text-gray-800">My Tickets</h3>
            <p className="text-xs text-gray-400">{upcoming.length} active</p>
          </div>
        </div>
        <Link href="/tickets">
          <motion.span whileHover={{ x: 4 }} className="text-xs font-bold text-pink-500 flex items-center gap-1 cursor-pointer">
            All Tickets <ArrowUpRight className="h-3.5 w-3.5" />
          </motion.span>
        </Link>
      </div>
      <div className="p-5">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 text-pink-300 animate-spin" />
          </div>
        ) : upcoming.length === 0 ? (
          <div className="text-center py-8">
            <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 2, repeat: Infinity }}
              className="inline-flex w-14 h-14 rounded-2xl bg-purple-50 items-center justify-center mb-3">
              <Ticket className="h-7 w-7 text-purple-300" />
            </motion.div>
            <p className="text-sm font-medium text-gray-500 mb-1">No tickets yet</p>
            <p className="text-xs text-gray-400 mb-4">Browse events and grab your spot!</p>
            <Link href="/events">
              <Button size="sm" className="bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl text-xs gap-1">
                <Calendar className="h-3.5 w-3.5" /> Find Events
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleTickets.map((r: any, i: number) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="relative overflow-hidden rounded-xl border border-purple-100 bg-gradient-to-r from-purple-50 to-pink-50 p-3"
              >
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border border-purple-100 -ml-1.5" />
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border border-purple-100 -mr-1.5" />
                <div className="flex items-center justify-between gap-2 px-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 text-sm truncate">{r.ticketType?.replace('_', ' ') || 'Ticket'}</p>
                    <p className="text-xs text-gray-500 mt-0.5 capitalize">
                      <span className={r.status === 'confirmed' ? 'text-emerald-600 font-semibold' : r.status === 'checked_in' ? 'text-blue-600 font-semibold' : 'text-amber-600 font-semibold'}>{r.status}</span>
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => r.eventId && setLocation(`/events/${r.eventId}`)}
                    className="border-purple-200 text-purple-600 hover:bg-purple-50 rounded-lg text-xs flex-shrink-0"
                  >
                    View
                  </Button>
                </div>
              </motion.div>
            ))}
            {upcoming.length > 1 && (
              <motion.button
                onClick={() => setExpanded(!expanded)}
                className="w-full text-xs text-pink-500 font-semibold py-2 hover:text-pink-600 transition-colors"
              >
                {expanded ? '↑ Show less' : `↓ Show ${upcoming.length - 1} more`}
              </motion.button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── NOTIFICATIONS SECTION ─────────────────────────────────────────────────
function NotificationsSection() {
  const { isAuthenticated } = useAuth();
  const { data: notifications } = trpc.notifications.list.useQuery(undefined, {
    retry: false, refetchOnWindowFocus: true, staleTime: 30_000, enabled: isAuthenticated, refetchInterval: 15_000,
  });
  const unread = notifications?.filter((n: any) => !n.isRead).length ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="glass-strong rounded-2xl border border-pink-100/50 overflow-hidden"
    >
      <div className="p-5 border-b border-pink-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 shadow-md">
            <Bell className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-display font-bold text-gray-800">Notifications</h3>
            <p className="text-xs text-gray-400">{unread > 0 ? `${unread} unread` : "All caught up!"}</p>
          </div>
        </div>
        {unread > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="px-2.5 py-1 bg-gradient-to-r from-pink-500 to-red-500 text-white text-[10px] font-black rounded-full shadow-md"
          >
            {unread}
          </motion.span>
        )}
      </div>

      <div className="p-5">
        {!notifications || notifications.length === 0 ? (
          <div className="text-center py-6">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="inline-flex w-12 h-12 rounded-2xl bg-pink-50 items-center justify-center mb-3"
            >
              <Bell className="h-6 w-6 text-pink-300" />
            </motion.div>
            <p className="text-sm text-gray-400">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.slice(0, 4).map((n: any, i: number) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`p-3 rounded-xl transition-colors ${n.isRead ? "bg-transparent" : "bg-pink-50/50"}`}
              >
                <p className="text-sm text-gray-700 font-medium">{n.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{n.body?.slice(0, 60)}</p>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── CREDITS & REFERRAL SECTION ────────────────────────────────────────────
function CreditsReferralSection() {
  const { isAuthenticated } = useAuth();
  const { data: balance } = trpc.credits.balance.useQuery(undefined, {
    retry: false, refetchOnWindowFocus: false, staleTime: 30_000, enabled: isAuthenticated,
  });
  const { data: creditHistory } = trpc.credits.history.useQuery(undefined, {
    retry: false, refetchOnWindowFocus: false, staleTime: 30_000, enabled: isAuthenticated,
  });
  const utils = trpc.useUtils();
  const { data: referral } = trpc.referrals.myCode.useQuery(undefined, {
    retry: false, refetchOnWindowFocus: false, staleTime: 60_000, enabled: isAuthenticated,
  });
  const generate = trpc.referrals.generate.useMutation({
    onSuccess: () => {
      toast.success("Referral code generated!");
      utils.referrals.myCode.invalidate();
    },
  });

  const copyCode = () => {
    if (referral?.code) {
      navigator.clipboard.writeText(referral.code);
      toast.success("Code copied to clipboard!");
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Credits Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          whileHover={{ y: -4 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-pink-500 via-fuchsia-500 to-purple-600 p-6 shadow-xl"
        >
          <FloatingBubbles count={4} />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm">
                <CreditCard className="h-5 w-5 text-white" />
              </div>
              <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }}>
                <Star className="h-5 w-5 text-yellow-300" />
              </motion.div>
            </div>
            <p className="text-white/70 text-xs font-bold uppercase tracking-wider mb-1">Credit Balance</p>
            <div className="font-display text-4xl font-black text-white">
              <AnimatedNumber value={balance ?? 0} />
            </div>
            <p className="text-white/50 text-xs mt-2">Earn credits through referrals & events</p>
          </div>
        </motion.div>

        {/* Referral Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          whileHover={{ y: -4 }}
          className="glass-strong rounded-2xl border border-pink-100/50 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-rose-400 to-pink-500 shadow-md">
              <Gift className="h-5 w-5 text-white" />
            </div>
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }}>
              <TrendingUp className="h-4 w-4 text-pink-400" />
            </motion.div>
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Referral Code</p>
          {referral?.code ? (
            <>
              <motion.div
                whileHover={{ scale: 1.02 }}
                onClick={copyCode}
                className="flex items-center gap-2 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl px-4 py-3 mt-2 cursor-pointer border border-pink-100 group"
              >
                <span className="font-mono text-lg font-black text-pink-600 flex-1">{referral.code}</span>
                <Copy className="h-4 w-4 text-pink-400 group-hover:text-pink-600 transition-colors" />
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.02 }}
                onClick={() => {
                  const referralLink = `${window.location.origin}/join?ref=${referral.code}`;
                  if (navigator.share) {
                    navigator.share({ title: "Join Soapies!", text: "Join me on Soapies Playgroup!", url: referralLink });
                  } else {
                    navigator.clipboard.writeText(referralLink);
                    toast.success("Referral link copied!");
                  }
                }}
                className="flex items-center gap-2 bg-pink-50 rounded-xl px-4 py-2.5 mt-2 cursor-pointer border border-pink-100 group hover:bg-pink-100 transition"
              >
                <Share2 className="h-4 w-4 text-pink-500" />
                <span className="text-xs font-semibold text-pink-600 flex-1">Share referral link</span>
                <Copy className="h-3.5 w-3.5 text-pink-400" />
              </motion.div>
              <p className="text-[11px] text-gray-400 mt-2">Share with friends to earn credits</p>
            </>
          ) : (
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={() => generate.mutate()}
                disabled={generate.isPending}
                className="w-full mt-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl gap-2 shadow-lg"
              >
                {generate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Generate My Code
              </Button>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Credit History */}
      {creditHistory && creditHistory.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="glass-strong rounded-2xl border border-pink-100/50 p-6"
        >
          <h3 className="font-display text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-pink-500" /> Credit History
          </h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {creditHistory.slice(0, 8).map((entry: any, i: number) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-pink-50/50 transition-colors"
              >
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800">{entry.reason || "Credit"}</p>
                  <p className="text-xs text-gray-500">{entry.createdAt ? format(new Date(entry.createdAt), "MMM d, yyyy") : "Recent"}</p>
                </div>
                <p className={`text-sm font-bold ${entry.amount > 0 ? "text-green-600" : "text-gray-600"}`}>
                  {entry.amount > 0 ? "+" : ""}{entry.amount}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── MY REFERRAL TRACKER ──────────────────────────────────────────────────
function MyReferralTracker() {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const { data: myCode } = trpc.referrals.myCode.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const { data: myReferrals, isLoading } = trpc.referrals.myReferrals.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const generate = trpc.referrals.generate.useMutation({
    onSuccess: () => { utils.referrals.myCode.invalidate(); toast.success("Referral code generated!"); },
  });

  const copyCode = () => {
    if (myCode?.code) {
      navigator.clipboard.writeText(myCode.code);
      toast.success("Code copied!");
    }
  };

  const shareLink = () => {
    const link = `${window.location.origin}/join?ref=${myCode?.code}`;
    if (navigator.share) {
      navigator.share({ title: "Join Soapies!", url: link });
    } else {
      navigator.clipboard.writeText(link);
      toast.success("Link copied!");
    }
  };

  const STEPS = ["Joined", "Applied", "Interview", "Approved", "Credit ✓"];

  function getStep(row: any): number {
    if (row.referralConverted) return 4;
    const status = row.applicationStatus as string;
    const phase = row.applicationPhase as string | null;
    if (status === "approved" || phase === "final_approved") return 3;
    if (phase === "interview_scheduled" || phase === "interview_complete") return 2;
    if (status === "submitted" || status === "under_review") return 1;
    if (row.userCreatedAt) return 0;
    return -1;
  }

  const creditsEarned = myReferrals?.filter((r: any) => r.referralConverted).length ?? 0;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
      className="glass-strong rounded-2xl border border-pink-100/50 overflow-hidden">
      <div className="p-5 border-b border-pink-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-rose-400 to-pink-500 shadow-md">
            <Gift className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-display font-bold text-gray-800">My Referrals</h3>
            <p className="text-xs text-gray-400">{myReferrals?.length ?? 0} referred · {creditsEarned} credits earned</p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Code section */}
        {myCode?.code ? (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-pink-50 border border-pink-100">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-pink-500 uppercase mb-0.5">Your Code</p>
              <p className="font-mono text-lg font-black text-pink-700">{myCode.code}</p>
            </div>
            <button onClick={copyCode} className="p-2 rounded-lg bg-pink-100 hover:bg-pink-200 text-pink-600 transition-colors flex-shrink-0">
              <Copy className="h-4 w-4" />
            </button>
            <button onClick={shareLink} className="px-3 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold flex-shrink-0">
              Share
            </button>
          </div>
        ) : (
          <Button onClick={() => generate.mutate()} disabled={generate.isPending}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl gap-2">
            {generate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
            Generate My Code
          </Button>
        )}

        {/* Referred users */}
        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-pink-300" /></div>
        ) : !myReferrals || myReferrals.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-400">No referrals yet.</p>
            <p className="text-xs text-gray-300 mt-1">Share your code and earn credits when they get approved!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(myReferrals as any[]).map((row: any, i: number) => {
              const step = getStep(row);
              return (
                <div key={row.referredProfileId} className={`p-3 rounded-xl border ${row.referralConverted ? "bg-emerald-50 border-emerald-100" : "bg-gray-50 border-gray-100"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-sm text-gray-800">{row.referredDisplayName ?? "Member"}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${row.referralConverted ? "bg-emerald-200 text-emerald-800" : "bg-gray-200 text-gray-600"}`}>
                      {row.referralConverted ? "💰 Credit Earned" : STEPS[Math.max(step, 0)]}
                    </span>
                  </div>
                  {/* Mini progress bar */}
                  <div className="flex gap-1 items-center">
                    {STEPS.map((label, si) => (
                      <div key={si} className="flex-1 flex flex-col items-center gap-0.5">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold ${si <= step ? "bg-pink-500 text-white" : "bg-gray-200 text-gray-400"}`}>
                          {si <= step ? "✓" : si + 1}
                        </div>
                        {si < STEPS.length - 1 && <div className={`h-0.5 w-full ${si < step ? "bg-pink-400" : "bg-gray-200"}`} />}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-1 mt-0.5">
                    {STEPS.map((label, si) => (
                      <p key={si} className={`flex-1 text-[8px] text-center ${si <= step ? "text-pink-500" : "text-gray-300"}`}>{label}</p>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── QUICK LINKS GRID ──────────────────────────────────────────────────────
function QuickLinksGrid() {
  const links = [
    { icon: Calendar, label: "Events", href: "/events", color: "from-pink-400 to-rose-500", desc: "Browse & book" },
    { icon: MessageCircle, label: "Wall", href: "/wall", color: "from-purple-400 to-indigo-500", desc: "Community feed" },
    { icon: Heart, label: "Messages", href: "/messages", color: "from-fuchsia-400 to-pink-500", desc: "Private chats" },
    { icon: Users, label: "Profile", href: "/profile", color: "from-violet-400 to-purple-500", desc: "Edit details" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7 }}
    >
      <h3 className="font-display text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
        <Zap className="h-5 w-5 text-pink-500" /> Quick Access
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {links.map((link, i) => (
          <Link key={link.href} href={link.href}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 + i * 0.05 }}
              whileHover={{ y: -4, scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="glass-strong rounded-2xl p-4 border border-pink-100/50 cursor-pointer group hover:shadow-lg hover:shadow-pink-100/30 transition-all text-center"
            >
              <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${link.color} shadow-md mb-3 group-hover:shadow-lg transition-shadow`}>
                <link.icon className="h-5 w-5 text-white" />
              </div>
              <p className="font-display text-sm font-bold text-gray-800 group-hover:text-pink-600 transition-colors">{link.label}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{link.desc}</p>
            </motion.div>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}

// ─── MAIN DASHBOARD ────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
            <Loader2 className="h-10 w-10 text-pink-400" />
          </motion.div>
          <p className="text-sm text-gray-400 font-medium">Loading your dashboard...</p>
        </div>
      </PageWrapper>
    );
  }

  if (!isAuthenticated) {
    return (
      <PageWrapper>
        <div className="container px-4 py-20 text-center max-w-md mx-auto">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring" }}
            className="inline-flex w-20 h-20 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 items-center justify-center mb-6"
          >
            <Shield className="h-10 w-10 text-pink-400" />
          </motion.div>
          <h2 className="font-display text-2xl font-bold text-gray-700 mb-3">Sign in to continue</h2>
          <p className="text-gray-400 text-sm mb-6">Access your dashboard, reservations, and community features.</p>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={() => window.location.href = getLoginUrl()}
              className="bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl px-8 py-3 shadow-xl shadow-pink-200/50 gap-2"
            >
              <Sparkles className="h-4 w-4" /> Sign In
            </Button>
          </motion.div>
        </div>
      </PageWrapper>
    );
  }

  const { data: dashProfile } = trpc.profile.me.useQuery(undefined, {
    enabled: isAuthenticated, retry: false, staleTime: 30_000,
  });
  const { data: dashReservations } = trpc.reservations.myReservations.useQuery(undefined, {
    enabled: isAuthenticated, retry: false, staleTime: 30_000,
  });
  const { data: dashNotifications } = trpc.notifications.list.useQuery(undefined, {
    enabled: isAuthenticated, retry: false, staleTime: 30_000,
  });
  const { data: dashCreditBalance } = trpc.credits.balance.useQuery(undefined, {
    enabled: isAuthenticated, retry: false, staleTime: 30_000,
  });

  const firstName = dashProfile?.displayName?.split(" ")[0] || user?.name?.split(" ")[0]?.split("@")[0] || "there";

  const statReservations = dashReservations?.length ?? 0;
  const statNotifications = dashNotifications?.filter((n: any) => !n.isRead).length ?? 0;
  const statCredits = dashCreditBalance ?? 0;
  const statAttended = dashReservations?.filter((r: any) => r.status === 'confirmed' || r.status === 'checked_in').length ?? 0;

  return (
    <PageWrapper>
      <div className="container px-4 py-6 sm:py-8 max-w-5xl mx-auto">
        {/* Greeting Hero */}
        <GreetingHero userName={firstName} />

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <StatCard icon={Ticket} label="Reservations" value={statReservations} color="from-purple-400 to-indigo-500" delay={0.15} />
          <StatCard icon={Bell} label="Notifications" value={statNotifications} color="from-pink-500 to-rose-500" delay={0.2} />
          <StatCard icon={CreditCard} label="Credits" value={statCredits} color="from-fuchsia-400 to-pink-500" delay={0.25} />
          <StatCard icon={PartyPopper} label="Events Attended" value={statAttended} color="from-violet-400 to-purple-500" delay={0.3} />
        </div>

        {/* Main Content Grid */}
        <div className="mb-8">
          <TicketsDashboard />
        </div>

        {/* Credits & Referral */}
        <div className="mb-8">
          <CreditsReferralSection />
        </div>

        {/* Referral Tracker */}
        <div className="mb-8">
          <MyReferralTracker />
        </div>

        {/* Quick Links */}
        <QuickLinksGrid />
      </div>
    </PageWrapper>
  );
}
