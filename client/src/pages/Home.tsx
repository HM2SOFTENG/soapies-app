import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import {
  Sparkles, Calendar, Users, MessageCircle, Heart, Star,
  ArrowRight, Shield, MapPin, Clock, Ticket, ChevronRight,
  PartyPopper, Music, Waves, Zap, Crown, Lock
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { FloatingBubbles, MorphBlob, GlowOrb, GridPattern } from "@/components/FloatingElements";
import { Link, useLocation } from "wouter";
import { format, isFuture, differenceInDays } from "date-fns";
import { useMemo, useRef, useState, useEffect, useCallback } from "react";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663460303717/FfTbhpP94ZvscRd7twWNT6/soapies-logo_cf3c72b2.png";
const HERO_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663460303717/FfTbhpP94ZvscRd7twWNT6/hero-bg-WtnkLUDM6Zi7KpGbebTJq8.webp";

// ─── ANIMATED COUNTER ────────────────────────────────────────────────────────
function AnimatedCounter({ target, suffix = "", prefix = "" }: { target: number; suffix?: string; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 2000;
    const step = Math.ceil(target / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(start);
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target]);

  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
}

// ─── EVENTS SHOWCASE ─────────────────────────────────────────────────────────
function HomeEventsShowcase() {
  const { data: events } = trpc.events.list.useQuery(undefined, {
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const [, setLocation] = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  const upcomingEvents = useMemo(() => {
    if (!events) return [];
    return [...events]
      .filter((e: any) => isFuture(new Date(e.startDate)))
      .sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 12);
  }, [events]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || upcomingEvents.length <= 2) return;
    let animationId: number;
    const scroll = () => {
      if (!isPaused && el) {
        el.scrollLeft += 0.5;
        if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 10) el.scrollLeft = 0;
      }
      animationId = requestAnimationFrame(scroll);
    };
    animationId = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(animationId);
  }, [isPaused, upcomingEvents.length]);

  if (!upcomingEvents.length) return null;

  const getTypeIcon = (title: string) => {
    const l = title.toLowerCase();
    if (l.includes("rave") || l.includes("glow")) return <Music className="h-3 w-3" />;
    if (l.includes("beach")) return <Waves className="h-3 w-3" />;
    return <PartyPopper className="h-3 w-3" />;
  };

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-pink-50/30 via-purple-50/20 to-white" />
      <GridPattern className="opacity-50" />
      <GlowOrb className="-top-20 -right-20" color="oklch(0.75 0.18 340 / 0.1)" size={400} />

      <div className="relative z-10 container px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-pink-100 to-purple-100 text-pink-600 text-xs font-bold mb-4"
          >
            <Calendar className="h-3.5 w-3.5" /> UPCOMING EXPERIENCES
          </motion.span>
          <h2 className="font-display text-4xl md:text-6xl font-black text-gradient">
            Don't Miss Out
          </h2>
          <p className="mt-4 text-gray-500 max-w-md mx-auto text-base">
            Our next unforgettable experiences are waiting for you.
          </p>
        </motion.div>
      </div>

      <div
        ref={scrollRef}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setTimeout(() => setIsPaused(false), 3000)}
        className="flex gap-5 overflow-x-auto px-4 pb-6 no-scrollbar"
      >
        {upcomingEvents.map((event: any, i: number) => {
          const daysUntil = differenceInDays(new Date(event.startDate), new Date());
          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              whileHover={{ y: -8 }}
              onClick={() => setLocation(`/events/${event.id}`)}
              className="flex-shrink-0 w-[280px] sm:w-[320px] group cursor-pointer"
            >
              <div className="card-premium card-glow rounded-2xl overflow-hidden">
                <div className="aspect-[16/10] overflow-hidden relative">
                  {event.coverImageUrl ? (
                    <img src={event.coverImageUrl} alt={event.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-pink-300 to-purple-400 flex items-center justify-center">
                      <Calendar className="h-12 w-12 text-white/50" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                  {daysUntil <= 14 && (
                    <motion.span
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute top-3 right-3 px-2.5 py-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-[10px] font-black rounded-full shadow-lg"
                    >
                      {daysUntil === 0 ? "TODAY!" : daysUntil === 1 ? "TOMORROW" : `${daysUntil} DAYS`}
                    </motion.span>
                  )}
                  <div className="absolute top-3 left-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-white text-[10px] font-bold">
                      {getTypeIcon(event.title)}
                    </span>
                  </div>
                  <div className="absolute bottom-3 left-3 text-white">
                    <p className="text-xl font-black leading-tight">{format(new Date(event.startDate), "MMM d")}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">{format(new Date(event.startDate), "EEEE")}</p>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-display text-sm font-bold text-gray-800 mb-2 group-hover:text-pink-600 transition-colors line-clamp-1">
                    {event.title}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
                    <MapPin className="h-3 w-3 text-purple-400" />
                    <span className="truncate">{event.venue}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      <span className="px-2 py-0.5 bg-pink-50 text-pink-600 text-[10px] font-bold rounded-full">$40</span>
                      <span className="px-2 py-0.5 bg-purple-50 text-purple-600 text-[10px] font-bold rounded-full">$130</span>
                    </div>
                    <span className="btn-premium px-3 py-1 text-[10px] font-black rounded-full inline-flex items-center gap-1">
                      <Ticket className="h-3 w-3" /> TICKETS
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="relative z-10 container px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-10"
        >
          <Link href="/events">
            <motion.div whileHover={{ scale: 1.05, x: 4 }} whileTap={{ scale: 0.95 }} className="inline-block">
              <Button size="lg" variant="outline" className="rounded-2xl px-8 border-pink-200 text-pink-600 hover:bg-pink-50 gap-2 font-bold">
                View All Events <ArrowRight className="h-5 w-5" />
              </Button>
            </motion.div>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

// ─── MAIN HOME PAGE ──────────────────────────────────────────────────────────
export default function Home() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      <Navbar />

      {/* ─── HERO ──────────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative min-h-[100svh] flex items-center justify-center overflow-hidden">
        {/* Parallax background */}
        <motion.div className="absolute inset-0" style={{ y: heroY, scale: heroScale }}>
          <img src={HERO_BG} alt="" className="w-full h-full object-cover" />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-white/5 to-white" />
        <div className="absolute inset-0 bg-gradient-to-r from-pink-900/10 to-purple-900/10" />

        {/* Floating elements */}
        <FloatingBubbles count={10} />
        <MorphBlob className="-top-32 -left-32" color="from-pink-300 to-rose-400" size="w-96 h-96" />
        <MorphBlob className="-bottom-32 -right-32" color="from-purple-300 to-indigo-400" size="w-80 h-80" />

        <motion.div style={{ opacity: heroOpacity }} className="relative z-10 container text-center px-4">
          {/* Logo entrance */}
          <motion.div
            initial={{ opacity: 0, scale: 0.3, rotate: -20 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 150, damping: 15, delay: 0.2 }}
            className="relative inline-block"
          >
            <img src={LOGO_URL} alt="Soapies" className="h-28 md:h-40 mx-auto mb-6 drop-shadow-2xl" />
            <motion.div
              className="absolute -inset-4 rounded-full"
              animate={{ boxShadow: ["0 0 0 0 oklch(0.68 0.2 340 / 0)", "0 0 0 20px oklch(0.68 0.2 340 / 0)", "0 0 0 40px oklch(0.68 0.2 340 / 0)"] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
            />
          </motion.div>

          {/* Title with staggered words */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="font-display text-5xl md:text-7xl lg:text-8xl font-black leading-[0.95] tracking-tight"
          >
            <span className="text-gradient">Where Fun</span>
            <br />
            <span className="text-gradient">Meets </span>
            <motion.span
              className="relative inline-block text-gray-800"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.9, type: "spring" }}
            >
              Connection
              <motion.svg
                viewBox="0 0 300 12"
                className="absolute -bottom-2 left-0 w-full"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ delay: 1.3, duration: 0.8 }}
              >
                <motion.path
                  d="M 0 6 Q 75 0 150 6 Q 225 12 300 6"
                  fill="none"
                  stroke="url(#underline-grad)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 1.3, duration: 0.8 }}
                />
                <defs>
                  <linearGradient id="underline-grad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="oklch(0.68 0.22 340)" />
                    <stop offset="100%" stopColor="oklch(0.55 0.25 310)" />
                  </linearGradient>
                </defs>
              </motion.svg>
            </motion.span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-8 text-lg md:text-xl text-gray-600 max-w-xl mx-auto leading-relaxed"
          >
            An exclusive community for adventurous adults. Curated events, genuine connections, unforgettable experiences.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
          >
            {isAuthenticated ? (
              <Link href="/dashboard">
                <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}>
                  <Button size="lg" className="btn-premium rounded-2xl px-10 py-7 text-lg gap-2">
                    <span className="relative z-10 flex items-center gap-2">
                      <Sparkles className="h-5 w-5" /> Go to Dashboard
                    </span>
                  </Button>
                </motion.div>
              </Link>
            ) : (
              <>
                <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    size="lg"
                    onClick={() => setLocation("/join")}
                    className="btn-premium rounded-2xl px-10 py-7 text-lg gap-2"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      <Sparkles className="h-5 w-5" /> Apply for Membership
                    </span>
                  </Button>
                </motion.div>
                <Link href="/events">
                  <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}>
                    <Button size="lg" variant="outline" className="rounded-2xl px-10 py-7 text-lg border-pink-200 text-pink-600 hover:bg-pink-50 gap-2 font-bold bg-white/80 backdrop-blur-sm">
                      Browse Events <ArrowRight className="h-5 w-5" />
                    </Button>
                  </motion.div>
                </Link>
              </>
            )}
          </motion.div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.3 }}
            className="mt-14 flex flex-wrap items-center justify-center gap-6 text-sm"
          >
            {[
              { icon: Shield, text: "Vetted Members", color: "text-pink-500" },
              { icon: Crown, text: "Premium Events", color: "text-purple-500" },
              { icon: Lock, text: "Private & Safe", color: "text-pink-500" },
            ].map((badge, i) => (
              <motion.span
                key={badge.text}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.4 + i * 0.1 }}
                className="flex items-center gap-2 px-4 py-2 rounded-full glass text-gray-600 font-medium"
              >
                <badge.icon className={`h-4 w-4 ${badge.color}`} />
                {badge.text}
              </motion.span>
            ))}
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
        >
          <div className="w-7 h-11 rounded-full border-2 border-pink-300/50 flex justify-center pt-2 glass">
            <motion.div
              animate={{ y: [0, 14, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full bg-gradient-to-b from-pink-400 to-purple-500"
            />
          </div>
        </motion.div>
      </section>

      {/* ─── STATS BAR ─────────────────────────────────────────────── */}
      <section className="relative -mt-1 z-20">
        <div className="container px-4">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-strong rounded-3xl p-8 md:p-10 shadow-xl shadow-pink-100/30 border-animated"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                { value: 500, suffix: "+", label: "Active Members", icon: Users },
                { value: 150, suffix: "+", label: "Events Hosted", icon: Calendar },
                { value: 98, suffix: "%", label: "Satisfaction Rate", icon: Star },
                { value: 50, suffix: "+", label: "Monthly Events", icon: Zap },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="space-y-1"
                >
                  <div className="inline-flex p-2.5 rounded-xl bg-gradient-to-br from-pink-50 to-purple-50 mb-2">
                    <stat.icon className="h-5 w-5 text-pink-500" />
                  </div>
                  <p className="font-display text-3xl md:text-4xl font-black text-gradient-static">
                    <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                  </p>
                  <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── FEATURES ──────────────────────────────────────────────── */}
      <section className="py-28 relative overflow-hidden">
        <GridPattern />
        <GlowOrb className="-bottom-20 -left-20" color="oklch(0.55 0.2 310 / 0.08)" size={350} />

        <div className="relative z-10 container px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 text-purple-600 text-xs font-bold mb-4">
              <Zap className="h-3.5 w-3.5" /> WHY SOAPIES
            </span>
            <h2 className="font-display text-4xl md:text-6xl font-black text-gradient">
              More Than a Community
            </h2>
            <p className="mt-4 text-gray-500 max-w-md mx-auto">It's a lifestyle built on trust, fun, and genuine connection.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Calendar, title: "Curated Events", desc: "Exclusive parties, retreats, and social gatherings designed for connection and adventure.", color: "from-pink-400 to-rose-500", glow: "shadow-pink-200/30" },
              { icon: Users, title: "Vetted Community", desc: "Every member is carefully screened to ensure quality, safety, and genuine intent.", color: "from-purple-400 to-indigo-500", glow: "shadow-purple-200/30" },
              { icon: MessageCircle, title: "Private Messaging", desc: "Connect with members through secure, encrypted private conversations.", color: "from-pink-500 to-purple-500", glow: "shadow-pink-200/30" },
              { icon: Heart, title: "Safe & Inclusive", desc: "A judgment-free zone where everyone can be their authentic, adventurous self.", color: "from-rose-400 to-pink-500", glow: "shadow-rose-200/30" },
            ].map((feat, i) => (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, type: "spring", stiffness: 200 }}
                whileHover={{ y: -10, scale: 1.02 }}
                className="group"
              >
                <div className={`card-premium card-glow rounded-2xl p-6 h-full ${feat.glow}`}>
                  <motion.div
                    whileHover={{ rotate: [0, -5, 5, 0], scale: 1.1 }}
                    transition={{ duration: 0.5 }}
                    className={`inline-flex p-3.5 rounded-2xl bg-gradient-to-br ${feat.color} shadow-lg mb-5`}
                  >
                    <feat.icon className="h-6 w-6 text-white" />
                  </motion.div>
                  <h3 className="font-display text-lg font-bold text-gray-800 mb-2 group-hover:text-gradient-static transition-all">{feat.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{feat.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── EVENTS SHOWCASE ───────────────────────────────────────── */}
      <HomeEventsShowcase />

      {/* ─── HOW IT WORKS ──────────────────────────────────────────── */}
      <section className="py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-white via-pink-50/30 to-white" />
        <MorphBlob className="top-20 right-0" color="from-purple-200 to-pink-200" size="w-72 h-72" />

        <div className="relative z-10 container px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-pink-100 to-purple-100 text-pink-600 text-xs font-bold mb-4">
              <Sparkles className="h-3.5 w-3.5" /> GET STARTED
            </span>
            <h2 className="font-display text-4xl md:text-6xl font-black text-gradient">
              How It Works
            </h2>
          </motion.div>

          <div className="max-w-3xl mx-auto space-y-0">
            {[
              { step: "01", title: "Apply", desc: "Submit your application with a brief intro about yourself and what you're looking for.", icon: Sparkles },
              { step: "02", title: "Get Verified", desc: "Our team reviews your application to ensure community fit and safety standards.", icon: Shield },
              { step: "03", title: "Explore Events", desc: "Browse upcoming events, reserve tickets, and connect with other members.", icon: Calendar },
              { step: "04", title: "Have Fun!", desc: "Attend events, make connections, and enjoy unforgettable experiences.", icon: PartyPopper },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: i % 2 === 0 ? -40 : 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, type: "spring" }}
                className="relative flex items-start gap-6 py-8"
              >
                {/* Connector line */}
                {i < 3 && (
                  <div className="absolute left-[27px] top-[72px] w-0.5 h-[calc(100%-40px)] bg-gradient-to-b from-pink-200 to-purple-200" />
                )}
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center shadow-lg shadow-pink-200/40 relative z-10"
                >
                  <item.icon className="h-6 w-6 text-white" />
                </motion.div>
                <div>
                  <span className="text-xs font-black text-pink-400 tracking-widest">STEP {item.step}</span>
                  <h3 className="font-display text-xl font-bold text-gray-800 mt-1">{item.title}</h3>
                  <p className="text-gray-500 mt-1 leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ───────────────────────────────────────────────────── */}
      <section className="py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500 bg-[length:200%_auto]" style={{ animation: "gradient 6s ease infinite" }} />
        <div className="absolute inset-0 noise-overlay" />
        <FloatingBubbles count={12} className="opacity-30" />

        <div className="relative z-10 container px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="inline-block mb-6"
            >
              <div className="w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center mx-auto">
                <Sparkles className="h-10 w-10 text-white" />
              </div>
            </motion.div>
            <h2 className="font-display text-4xl md:text-6xl font-black text-white mb-6 leading-tight">
              Ready to Join<br />the Fun?
            </h2>
            <p className="text-white/80 text-lg max-w-md mx-auto mb-10 leading-relaxed">
              Apply for membership today and unlock a world of exclusive experiences and genuine connections.
            </p>
            <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}>
              <Button
                size="lg"
                onClick={() => isAuthenticated ? setLocation("/dashboard") : setLocation("/join")}
                className="bg-white text-pink-600 hover:bg-white/90 rounded-2xl px-12 py-7 text-lg font-black shadow-2xl gap-2"
              >
                <Sparkles className="h-5 w-5" /> {isAuthenticated ? "Go to Dashboard" : "Get Started Now"}
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ─── FOOTER ────────────────────────────────────────────────── */}
      <footer className="bg-gray-950 text-gray-400 py-16 relative overflow-hidden">
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
            </div>
            <p className="text-xs text-gray-600">&copy; {new Date().getFullYear()} Soapies. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
