import PageWrapper from "@/components/PageWrapper";
import { trpc } from "@/lib/trpc";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { Calendar, MapPin, Users, Clock, Loader2, Ticket, Sparkles, ChevronRight, ChevronDown, Filter } from "lucide-react";
import { Link, useLocation } from "wouter";
import { format, formatDistanceToNow, isPast, isFuture, differenceInDays } from "date-fns";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";

// ─── COUNTDOWN HOOK ──────────────────────────────────────────────────────────
function useCountdown(targetDate: Date) {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(targetDate));

  function getTimeLeft(target: Date) {
    const now = new Date().getTime();
    const diff = target.getTime() - now;
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((diff / (1000 * 60)) % 60),
      seconds: Math.floor((diff / 1000) % 60),
      expired: false,
    };
  }

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(getTimeLeft(targetDate)), 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  return timeLeft;
}

// ─── COUNTDOWN DIGIT ─────────────────────────────────────────────────────────
function CountdownDigit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <motion.div
        key={value}
        initial={{ rotateX: -90, opacity: 0 }}
        animate={{ rotateX: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="relative w-14 h-16 sm:w-20 sm:h-22 bg-gradient-to-b from-gray-900 to-gray-800 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20 border border-purple-500/30"
      >
        <span className="font-display text-2xl sm:text-4xl font-black text-white tabular-nums">
          {String(value).padStart(2, "0")}
        </span>
        <div className="absolute inset-x-0 top-1/2 h-px bg-black/30" />
      </motion.div>
      <span className="mt-2 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-pink-300">
        {label}
      </span>
    </div>
  );
}

// ─── NEXT EVENT HERO ─────────────────────────────────────────────────────────
function NextEventHero({ event }: { event: any }) {
  const countdown = useCountdown(new Date(event.startDate));
  const [, setLocation] = useLocation();

  const getEventTypeLabel = (title: string) => {
    if (title.includes("Beach")) return "Beach Party";
    if (title.includes("Rave")) return "Rave";
    if (title.includes("Vegas")) return "Vegas House Party";
    if (title.includes("SD House")) return "SD House Party";
    return "Event";
  };

  const getEventTypeColor = (title: string) => {
    if (title.includes("Beach")) return "from-amber-400 to-orange-500";
    if (title.includes("Rave")) return "from-purple-500 to-fuchsia-600";
    return "from-pink-500 to-rose-500";
  };

  return (
    <section className="relative overflow-hidden">
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
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/40 to-pink-900/40" />
      </div>

      {/* Floating particles */}
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-pink-400/40 rounded-full"
          style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.8, 0.2],
            scale: [1, 1.5, 1],
          }}
          transition={{ duration: 3 + Math.random() * 3, repeat: Infinity, delay: Math.random() * 2 }}
        />
      ))}

      <div className="relative container px-4 py-16 sm:py-24 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 mb-6"
        >
          <Sparkles className="h-4 w-4 text-pink-400" />
          <span className="text-sm font-bold text-white uppercase tracking-wider">Next Event</span>
          <Sparkles className="h-4 w-4 text-purple-400" />
        </motion.div>

        {/* Event Type */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
          className="mb-4"
        >
          <span className={`inline-block px-4 py-1 text-xs font-black uppercase tracking-widest text-white bg-gradient-to-r ${getEventTypeColor(event.title)} rounded-full shadow-lg`}>
            {getEventTypeLabel(event.title)}
          </span>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="font-display text-4xl sm:text-5xl md:text-6xl font-black text-white mb-3 leading-tight"
        >
          {event.title}
        </motion.h1>

        {/* Date & Venue */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-4 text-white/80 text-sm sm:text-base mb-8"
        >
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-pink-400" />
            {format(new Date(event.startDate), "EEEE, MMMM d, yyyy")}
          </span>
          <span className="hidden sm:block text-white/30">|</span>
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-purple-400" />
            {event.venue}, {event.address?.split(",").slice(-2).join(",")}
          </span>
          <span className="hidden sm:block text-white/30">|</span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-pink-400" />
            {event.title.includes("Beach") ? "All Day" : "8 PM – 2 AM"}
          </span>
        </motion.div>

        {/* Countdown */}
        {!countdown.expired && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mb-10"
          >
            <p className="text-pink-300 text-xs font-bold uppercase tracking-[0.3em] mb-4">
              Starts In
            </p>
            <div className="flex justify-center gap-3 sm:gap-4">
              <CountdownDigit value={countdown.days} label="Days" />
              <div className="flex items-center text-2xl font-bold text-pink-400 pt-0 pb-6">:</div>
              <CountdownDigit value={countdown.hours} label="Hours" />
              <div className="flex items-center text-2xl font-bold text-pink-400 pt-0 pb-6">:</div>
              <CountdownDigit value={countdown.minutes} label="Mins" />
              <div className="flex items-center text-2xl font-bold text-pink-400 pt-0 pb-6">:</div>
              <CountdownDigit value={countdown.seconds} label="Secs" />
            </div>
          </motion.div>
        )}

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(236,72,153,0.5)" }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setLocation(`/events/${event.id}`)}
            className="px-8 py-4 bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-600 text-white font-bold text-lg rounded-full shadow-2xl shadow-pink-500/30 flex items-center gap-2 cursor-pointer"
          >
            <Ticket className="h-5 w-5" />
            Get Tickets Now
            <ChevronRight className="h-5 w-5" />
          </motion.button>

          {/* Pricing pills */}
          <div className="flex gap-2 flex-wrap justify-center">
            <span className="px-3 py-1.5 bg-white/10 backdrop-blur-md text-white text-xs font-bold rounded-full border border-white/20">
              Women $40
            </span>
            <span className="px-3 py-1.5 bg-white/10 backdrop-blur-md text-white text-xs font-bold rounded-full border border-white/20">
              Couples $130
            </span>
            <span className="px-3 py-1.5 bg-white/10 backdrop-blur-md text-white text-xs font-bold rounded-full border border-white/20">
              Men $145
            </span>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-12"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="flex flex-col items-center text-white/40"
          >
            <span className="text-[10px] uppercase tracking-widest mb-1">Scroll for more</span>
            <ChevronDown className="h-5 w-5" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── EVENT CARD ──────────────────────────────────────────────────────────────
function EventCard({ event, index }: { event: any; index: number }) {
  const [, setLocation] = useLocation();
  const isUpcoming = isFuture(new Date(event.startDate));
  const daysUntil = differenceInDays(new Date(event.startDate), new Date());

  const getTypeGradient = (title: string) => {
    if (title.includes("Beach")) return "from-amber-500 to-orange-600";
    if (title.includes("Rave")) return "from-purple-600 to-fuchsia-600";
    if (title.includes("Vegas")) return "from-pink-500 to-rose-600";
    return "from-pink-500 to-purple-600";
  };

  const getTypeEmoji = (title: string) => {
    if (title.includes("Beach")) return "🏖️";
    if (title.includes("Rave")) return "🔥";
    if (title.includes("Vegas")) return "🎰";
    return "🏠";
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ delay: index * 0.05, duration: 0.5, ease: "easeOut" }}
      whileHover={{ y: -6, scale: 1.02 }}
      className="group flex-shrink-0 w-[300px] sm:w-[340px] snap-start"
    >
      <div
        onClick={() => setLocation(`/events/${event.id}`)}
        className="relative bg-white rounded-2xl overflow-hidden shadow-lg shadow-pink-100/50 border border-pink-50/80 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-pink-200/60 h-full"
      >
        {/* Image */}
        <div className="aspect-[16/10] overflow-hidden relative">
          {event.coverImageUrl ? (
            <motion.img
              src={event.coverImageUrl}
              alt={event.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-pink-300 via-purple-300 to-pink-400 flex items-center justify-center">
              <Calendar className="h-16 w-16 text-white/60" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Status badge */}
          <div className="absolute top-3 left-3">
            <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white bg-gradient-to-r ${getTypeGradient(event.title)} rounded-full shadow-lg`}>
              {getTypeEmoji(event.title)} {event.title.split(":")[0]}
            </span>
          </div>

          {/* Days until badge */}
          {isUpcoming && daysUntil <= 30 && (
            <div className="absolute top-3 right-3">
              <motion.span
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="px-2 py-1 bg-red-500 text-white text-[10px] font-black rounded-full shadow-lg"
              >
                {daysUntil === 0 ? "TODAY!" : daysUntil === 1 ? "TOMORROW" : `${daysUntil} DAYS`}
              </motion.span>
            </div>
          )}

          {/* Date overlay */}
          <div className="absolute bottom-3 left-3 text-white">
            <p className="text-lg font-black leading-none">{format(new Date(event.startDate), "MMM d")}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">{format(new Date(event.startDate), "EEEE")}</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Theme */}
          <h3 className="font-display text-base font-bold text-gray-800 mb-2 group-hover:text-pink-600 transition-colors line-clamp-1">
            {event.title.includes(":") ? event.title.split(":")[1].trim() : event.title}
          </h3>

          {/* Meta */}
          <div className="space-y-1.5 text-xs text-gray-500 mb-3">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-purple-400 flex-shrink-0" />
              <span className="truncate">{event.venue}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-pink-400 flex-shrink-0" />
              <span>{event.title.includes("Beach") ? "All Day Event" : "8:00 PM – 2:00 AM"}</span>
            </div>
          </div>

          {/* Pricing + CTA */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              <span className="px-2 py-0.5 bg-pink-50 text-pink-600 text-[10px] font-bold rounded-full">
                $40
              </span>
              <span className="px-2 py-0.5 bg-purple-50 text-purple-600 text-[10px] font-bold rounded-full">
                $130
              </span>
              <span className="px-2 py-0.5 bg-fuchsia-50 text-fuchsia-600 text-[10px] font-bold rounded-full">
                $145
              </span>
            </div>
            {isUpcoming && (
              <motion.span
                whileHover={{ scale: 1.1 }}
                className="px-3 py-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-[10px] font-black rounded-full shadow-md cursor-pointer"
              >
                GET TICKETS
              </motion.span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── AUTO-SCROLL CAROUSEL ────────────────────────────────────────────────────
function AutoScrollCarousel({ events, title, subtitle }: { events: any[]; title: string; subtitle: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || events.length <= 3) return;

    let animationId: number;
    let scrollSpeed = 0.5;

    const scroll = () => {
      if (!isPaused && el) {
        el.scrollLeft += scrollSpeed;
        if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 10) {
          el.scrollLeft = 0;
        }
      }
      animationId = requestAnimationFrame(scroll);
    };

    animationId = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(animationId);
  }, [isPaused, events.length]);

  return (
    <div className="mb-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="flex items-end justify-between mb-6 px-4"
      >
        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            {title}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        </div>
        <span className="text-xs font-bold text-pink-400 uppercase tracking-wider hidden sm:block">
          {events.length} events
        </span>
      </motion.div>

      <div
        ref={scrollRef}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setTimeout(() => setIsPaused(false), 3000)}
        className="flex gap-4 overflow-x-auto scrollbar-hide px-4 pb-4 snap-x snap-mandatory"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {events.map((event: any, i: number) => (
          <EventCard key={event.id} event={event} index={i} />
        ))}
        {/* Duplicate for seamless loop */}
        {events.length > 3 && events.slice(0, 3).map((event: any, i: number) => (
          <EventCard key={`dup-${event.id}`} event={event} index={events.length + i} />
        ))}
      </div>
    </div>
  );
}

// ─── FILTER PILLS ────────────────────────────────────────────────────────────
function FilterPills({ active, onChange }: { active: string; onChange: (v: string) => void }) {
  const filters = [
    { key: "all", label: "All Events", icon: "✨" },
    { key: "house", label: "House Parties", icon: "🏠" },
    { key: "rave", label: "Raves", icon: "🔥" },
    { key: "beach", label: "Beach Parties", icon: "🏖️" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-2 overflow-x-auto px-4 pb-2 scrollbar-hide"
      style={{ scrollbarWidth: "none" }}
    >
      {filters.map((f) => (
        <motion.button
          key={f.key}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onChange(f.key)}
          className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all cursor-pointer ${
            active === f.key
              ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-300/30"
              : "bg-white text-gray-600 border border-pink-100 hover:border-pink-300"
          }`}
        >
          {f.icon} {f.label}
        </motion.button>
      ))}
    </motion.div>
  );
}

// ─── MAIN EVENTS PAGE ────────────────────────────────────────────────────────
export default function Events() {
  const { data: events, isLoading } = trpc.events.list.useQuery(undefined, {
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const [filter, setFilter] = useState("all");

  const sortedEvents = useMemo(() => {
    if (!events) return [];
    // Sort by date ascending, upcoming first
    return [...events].sort((a: any, b: any) => {
      const aDate = new Date(a.startDate).getTime();
      const bDate = new Date(b.startDate).getTime();
      const now = Date.now();
      const aUpcoming = aDate > now;
      const bUpcoming = bDate > now;
      if (aUpcoming && !bUpcoming) return -1;
      if (!aUpcoming && bUpcoming) return 1;
      if (aUpcoming && bUpcoming) return aDate - bDate;
      return bDate - aDate; // Past events: most recent first
    });
  }, [events]);

  const nextEvent = useMemo(() => {
    return sortedEvents.find((e: any) => isFuture(new Date(e.startDate)));
  }, [sortedEvents]);

  const upcomingEvents = useMemo(() => {
    let upcoming = sortedEvents.filter((e: any) => isFuture(new Date(e.startDate)));
    if (filter === "house") upcoming = upcoming.filter((e: any) => e.title.includes("House"));
    if (filter === "rave") upcoming = upcoming.filter((e: any) => e.title.includes("Rave"));
    if (filter === "beach") upcoming = upcoming.filter((e: any) => e.title.includes("Beach"));
    return upcoming;
  }, [sortedEvents, filter]);

  const pastEvents = useMemo(() => {
    let past = sortedEvents.filter((e: any) => isPast(new Date(e.startDate)));
    if (filter === "house") past = past.filter((e: any) => e.title.includes("House"));
    if (filter === "rave") past = past.filter((e: any) => e.title.includes("Rave"));
    if (filter === "beach") past = past.filter((e: any) => e.title.includes("Beach"));
    return past;
  }, [sortedEvents, filter]);

  // Group upcoming by month
  const upcomingByMonth = useMemo(() => {
    const groups: Record<string, any[]> = {};
    upcomingEvents.forEach((e: any) => {
      const key = format(new Date(e.startDate), "MMMM yyyy");
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    });
    return groups;
  }, [upcomingEvents]);

  return (
    <PageWrapper withPadding={false}>
      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center items-center py-40">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Loader2 className="h-12 w-12 text-pink-400" />
          </motion.div>
        </div>
      )}

      {!isLoading && events && (
        <>
          {/* HERO: Next Event with Countdown */}
          {nextEvent && <NextEventHero event={nextEvent} />}

          {/* Filter Section */}
          <div className="py-8">
            <div className="container">
              <FilterPills active={filter} onChange={setFilter} />
            </div>
          </div>

          {/* Upcoming Events - Auto-scroll Carousels by Month */}
          {Object.entries(upcomingByMonth).map(([month, monthEvents]) => (
            <div key={month} className="container">
              <AutoScrollCarousel
                events={monthEvents}
                title={month}
                subtitle={`${monthEvents.length} event${monthEvents.length > 1 ? "s" : ""} coming up`}
              />
            </div>
          ))}

          {/* All Upcoming Grid */}
          {upcomingEvents.length > 0 && (
            <section className="py-12 bg-gradient-to-b from-white to-pink-50/50">
              <div className="container px-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="text-center mb-10"
                >
                  <h2 className="font-display text-3xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
                    Full Calendar
                  </h2>
                  <p className="text-sm text-muted-foreground mt-2">
                    {upcomingEvents.length} upcoming events — don't miss out!
                  </p>
                </motion.div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {upcomingEvents.map((event: any, i: number) => (
                    <EventCard key={event.id} event={event} index={i} />
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Past Events */}
          {pastEvents.length > 0 && (
            <section className="py-12 bg-gray-50/50">
              <div className="container px-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="text-center mb-10"
                >
                  <h2 className="font-display text-2xl font-bold text-gray-400">
                    Past Events
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">
                    Look back at our incredible gatherings
                  </p>
                </motion.div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {pastEvents.map((event: any, i: number) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.03 }}
                      className="group cursor-pointer"
                    >
                      <Link href={`/events/${event.id}`}>
                        <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-gray-200">
                          {event.coverImageUrl && (
                            <img
                              src={event.coverImageUrl}
                              alt={event.title}
                              className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                            />
                          )}
                          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all" />
                          <div className="absolute bottom-2 left-2 right-2">
                            <p className="text-white text-xs font-bold truncate">{event.title.includes(":") ? event.title.split(":")[1].trim() : event.title}</p>
                            <p className="text-white/60 text-[10px]">{format(new Date(event.startDate), "MMM d, yyyy")}</p>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Bottom CTA */}
          <section className="py-16 bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-600 relative overflow-hidden">
            {Array.from({ length: 8 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-32 h-32 bg-white/5 rounded-full"
                style={{ left: `${i * 15}%`, top: `${(i % 3) * 30}%` }}
                animate={{ y: [0, -20, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 4 + i, repeat: Infinity }}
              />
            ))}
            <div className="container px-4 text-center relative">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <h2 className="font-display text-3xl sm:text-4xl font-black text-white mb-4">
                  Ready to Join the Party?
                </h2>
                <p className="text-white/80 text-lg mb-8 max-w-md mx-auto">
                  Become a Soapies member and get exclusive access to all our events.
                </p>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link href="/">
                    <span className="inline-flex items-center gap-2 px-8 py-4 bg-white text-pink-600 font-bold text-lg rounded-full shadow-2xl cursor-pointer hover:bg-pink-50 transition-colors">
                      <Sparkles className="h-5 w-5" />
                      Apply for Membership
                    </span>
                  </Link>
                </motion.div>
              </motion.div>
            </div>
          </section>
        </>
      )}
    </PageWrapper>
  );
}
