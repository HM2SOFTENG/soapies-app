import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import {
  Sparkles, Shield, Crown, Lock, Calendar, MapPin, Ticket, ArrowRight,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { FloatingBubbles, MorphBlob, GridPattern } from "@/components/FloatingElements";
import { Link, useLocation } from "wouter";
import { useRef, useState, useEffect, useMemo } from "react";
import { isFuture } from "date-fns";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663460303717/FfTbhpP94ZvscRd7twWNT6/soapies-logo_cf3c72b2.png";
const HERO_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663460303717/FfTbhpP94ZvscRd7twWNT6/hero-bg-WtnkLUDM6Zi7KpGbebTJq8.webp";

// ─── TRUST BADGES ────────────────────────────────────────────────────────────
const TRUST_ITEMS = [
  { icon: Shield, label: "Vetted Members", gradient: "from-pink-500 to-rose-400" },
  { icon: Crown, label: "Premium Events", gradient: "from-purple-500 to-indigo-400" },
  { icon: Lock, label: "Private & Safe", gradient: "from-pink-400 to-purple-500" },
];

// ─── COUNTDOWN DIGIT ─────────────────────────────────────────────────────────
function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center overflow-hidden">
          <AnimatePresence mode="popLayout">
            <motion.span
              key={value}
              initial={{ y: -20, opacity: 0, filter: "blur(4px)" }}
              animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
              exit={{ y: 20, opacity: 0, filter: "blur(4px)" }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="font-display text-2xl md:text-3xl font-black text-white"
            >
              {String(value).padStart(2, "0")}
            </motion.span>
          </AnimatePresence>
        </div>
        {/* Subtle glow under each digit */}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-10 h-2 bg-pink-500/30 rounded-full blur-md" />
      </div>
      <span className="text-[10px] md:text-xs font-bold text-white/60 uppercase tracking-[0.15em] mt-2">
        {label}
      </span>
    </div>
  );
}

// ─── MAIN HOME PAGE ──────────────────────────────────────────────────────────
export default function Home() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);

  // ── Next event data ──
  const { data: events } = trpc.events.list.useQuery(undefined, {
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const nextEvent = useMemo(() => {
    if (!events) return null;
    return [...events]
      .filter((e: any) => isFuture(new Date(e.startDate)))
      .sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0] || null;
  }, [events]);

  const countdown = useMemo(() => {
    if (!nextEvent) return { days: 0, hours: 0, mins: 0, secs: 0 };
    const diff = new Date(nextEvent.startDate).getTime() - now.getTime();
    return {
      days: Math.max(0, Math.floor(diff / 86400000)),
      hours: Math.max(0, Math.floor((diff / 3600000) % 24)),
      mins: Math.max(0, Math.floor((diff / 60000) % 60)),
      secs: Math.max(0, Math.floor((diff / 1000) % 60)),
    };
  }, [nextEvent, now]);

  const handleReserve = () => {
    if (!nextEvent) return;
    if (isAuthenticated) {
      setLocation(`/events/${nextEvent.id}`);
    } else {
      setLocation("/join");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50/80 via-purple-50/40 to-pink-50/60 overflow-hidden">
      <Navbar />

      {/* ─── HERO ──────────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative min-h-[100svh] flex flex-col items-center justify-center overflow-hidden">
        {/* Parallax background */}
        <motion.div className="absolute inset-0" style={{ y: heroY, scale: heroScale }}>
          <img src={HERO_BG} alt="" className="w-full h-full object-cover" />
        </motion.div>

        {/* Overlay gradients */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/60" />
        <motion.div
          className="absolute inset-0"
          animate={{
            background: [
              "radial-gradient(ellipse at 30% 40%, oklch(0.7 0.2 340 / 0.12) 0%, transparent 60%)",
              "radial-gradient(ellipse at 70% 60%, oklch(0.65 0.22 310 / 0.12) 0%, transparent 60%)",
              "radial-gradient(ellipse at 30% 40%, oklch(0.7 0.2 340 / 0.12) 0%, transparent 60%)",
            ],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        />

        {/* Floating elements */}
        <FloatingBubbles count={10} />
        <MorphBlob className="-top-40 -left-40" color="from-pink-300 to-rose-400" size="w-96 h-96" />
        <MorphBlob className="-bottom-40 -right-40" color="from-purple-300 to-indigo-400" size="w-80 h-80" />

        {/* ── HERO CONTENT ── */}
        <div className="relative z-10 container px-6 flex flex-col items-center text-center max-w-3xl mx-auto">

          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
            className="relative mb-6"
          >
            <img src={LOGO_URL} alt="Soapies" className="h-20 md:h-28 drop-shadow-2xl" />
            <motion.div
              className="absolute -inset-3 rounded-full"
              animate={{ boxShadow: ["0 0 0 0 rgba(236,72,153,0)", "0 0 0 16px rgba(236,72,153,0)", "0 0 0 32px rgba(236,72,153,0)"] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            />
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="font-display text-4xl md:text-6xl lg:text-7xl font-black text-white leading-[1.05] tracking-tight"
          >
            Where Fun
            <br />
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-pink-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
                Meets Connection
              </span>
              <motion.div
                className="absolute -bottom-1 left-0 right-0 h-[3px] rounded-full bg-gradient-to-r from-pink-400 via-purple-400 to-pink-400"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                style={{ transformOrigin: "left" }}
              />
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-5 text-base md:text-lg text-white/70 max-w-lg mx-auto leading-relaxed font-medium"
          >
            An exclusive community for adventurous adults. Curated events, genuine connections, unforgettable experiences.
          </motion.p>

          {/* ── TRUST BADGES ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mt-8 flex items-center justify-center gap-3 md:gap-4"
          >
            {TRUST_ITEMS.map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 + i * 0.1, type: "spring", stiffness: 300 }}
                whileHover={{ scale: 1.08, y: -2 }}
                className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 cursor-default"
              >
                <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${item.gradient} flex items-center justify-center shadow-lg`}>
                  <item.icon className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
                </div>
                <span className="text-xs md:text-sm font-semibold text-white/90 tracking-wide">
                  {item.label}
                </span>
              </motion.div>
            ))}
          </motion.div>

          {/* ── SEPARATOR ── */}
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: 1.1, duration: 0.6 }}
            className="mt-10 w-24 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"
          />

          {/* ── NEXT EVENT COUNTDOWN ── */}
          {nextEvent && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, type: "spring", stiffness: 150 }}
              className="mt-8 w-full max-w-md"
            >
              {/* Event label */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.4 }}
                className="flex items-center justify-center gap-2 mb-4"
              >
                <div className="h-px flex-1 max-w-[40px] bg-gradient-to-r from-transparent to-white/30" />
                <span className="text-[10px] md:text-xs font-bold text-white/50 uppercase tracking-[0.2em]">
                  Next Experience
                </span>
                <div className="h-px flex-1 max-w-[40px] bg-gradient-to-l from-transparent to-white/30" />
              </motion.div>

              {/* Event name + venue */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
                className="text-center mb-5"
              >
                <h3 className="font-display text-lg md:text-xl font-black text-white leading-tight">
                  {nextEvent.title}
                </h3>
                <div className="flex items-center justify-center gap-3 mt-1.5 text-white/50 text-xs font-medium">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(nextEvent.startDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  </span>
                  {nextEvent.venue && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {nextEvent.venue}
                    </span>
                  )}
                </div>
              </motion.div>

              {/* Countdown grid */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.6, type: "spring" }}
                className="flex items-center justify-center gap-3 md:gap-4"
              >
                <CountdownUnit value={countdown.days} label="Days" />
                <span className="text-white/30 font-display text-2xl font-black mt-[-20px]">:</span>
                <CountdownUnit value={countdown.hours} label="Hours" />
                <span className="text-white/30 font-display text-2xl font-black mt-[-20px]">:</span>
                <CountdownUnit value={countdown.mins} label="Mins" />
                <span className="text-white/30 font-display text-2xl font-black mt-[-20px]">:</span>
                <CountdownUnit value={countdown.secs} label="Secs" />
              </motion.div>

              {/* Reserve button */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.8 }}
                className="mt-6 flex justify-center"
              >
                <motion.div
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    size="lg"
                    onClick={handleReserve}
                    className="relative overflow-hidden rounded-2xl px-10 py-6 text-base font-black bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500 text-white border-0 shadow-xl shadow-pink-500/25 gap-2 group"
                    style={{ backgroundSize: "200% auto" }}
                  >
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500"
                      animate={{ backgroundPosition: ["0% center", "100% center", "0% center"] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                      style={{ backgroundSize: "200% auto" }}
                    />
                    <span className="relative z-10 flex items-center gap-2">
                      <Ticket className="h-4 w-4" />
                      Reserve Your Spot
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </Button>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </div>
      </section>

      {/* ─── FOOTER ────────────────────────────────────────────────── */}
      <footer className="bg-gray-950 text-gray-400 py-16 max-md:pb-28 relative overflow-hidden">
        <GridPattern className="opacity-20" />
        <div className="relative z-10 container px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-3">
              <img src={LOGO_URL} alt="Soapies" className="h-10 rounded-lg" />
              <div>
                <span className="text-white font-display font-bold text-lg">Soapies</span>
                <p className="text-xs text-gray-500">Where fun meets connection</p>
              </div>
            </div>
            <div className="flex gap-8 text-sm font-medium">
              <Link href="/events"><span className="hover:text-pink-400 transition-colors cursor-pointer">Events</span></Link>
              <Link href="/wall"><span className="hover:text-pink-400 transition-colors cursor-pointer">Community</span></Link>
              <Link href="/dashboard"><span className="hover:text-pink-400 transition-colors cursor-pointer">Dashboard</span></Link>
              <Link href="/tos"><span className="hover:text-pink-400 transition-colors cursor-pointer">Terms</span></Link>
              <Link href="/privacy"><span className="hover:text-pink-400 transition-colors cursor-pointer">Privacy</span></Link>
            </div>
            <p className="text-xs text-gray-600">&copy; {new Date().getFullYear()} Soapies. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
