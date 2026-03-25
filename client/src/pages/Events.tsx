import PageWrapper from "@/components/PageWrapper";
import { trpc } from "@/lib/trpc";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, MapPin, Users, Search, Loader2, Sparkles, ChevronRight, Filter, X } from "lucide-react";
import { Link } from "wouter";
import { format, formatDistanceToNow, isPast, isFuture } from "date-fns";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ─── EVENT CARD ──────────────────────────────────────────────────────────
function EventCard({ event }: { event: any }) {
  const isPastEvent = isPast(new Date(event.startDate));
  const isUpcoming = isFuture(new Date(event.startDate));

  return (
    <Link href={`/events/${event.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        whileHover={{ y: -8, scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="relative overflow-hidden rounded-3xl glass-strong border border-pink-100/50 cursor-pointer group h-full flex flex-col shadow-lg hover:shadow-2xl hover:shadow-pink-100/30 transition-all"
      >
        {/* Cover Image */}
        <div className="relative h-48 sm:h-56 overflow-hidden bg-gray-200">
          <motion.img
            src={event.coverImageUrl}
            alt={event.title}
            className="w-full h-full object-cover"
            whileHover={{ scale: 1.1 }}
            transition={{ duration: 0.6 }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Event Type Badge */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="absolute top-4 left-4 inline-flex items-center gap-2 px-3 py-1.5 bg-white/20 backdrop-blur-md rounded-full border border-white/30"
          >
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              {event.eventType === "party" ? "🎉 Party" : event.eventType === "social" ? "💬 Social" : "🎪 Event"}
            </span>
          </motion.div>

          {/* Status Badge */}
          {isPastEvent && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: -20 }}
              viewport={{ once: true }}
              className="absolute top-4 right-4 inline-flex items-center px-3 py-1.5 bg-red-500/90 backdrop-blur-md rounded-full border border-red-400/30"
            >
              <span className="text-xs font-bold text-white">Past Event</span>
            </motion.div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 p-5 sm:p-6">
          {/* Title */}
          <h3 className="font-display text-lg sm:text-xl font-bold text-gray-800 mb-3 line-clamp-2 group-hover:text-pink-600 transition-colors">
            {event.title}
          </h3>

          {/* Details */}
          <div className="space-y-2 mb-5 flex-1">
            <div className="flex items-center gap-2 text-gray-600 text-sm">
              <Calendar className="h-4 w-4 text-pink-500 flex-shrink-0" />
              <span className="font-medium">
                {isUpcoming ? "In " : ""}{formatDistanceToNow(new Date(event.startDate))}
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 text-sm">
              <MapPin className="h-4 w-4 text-pink-500 flex-shrink-0" />
              <span className="font-medium truncate">{event.venue}</span>
            </div>
          </div>

          {/* Prices */}
          <div className="mb-4 pb-4 border-t border-gray-200">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Tickets from</p>
            <div className="flex items-baseline gap-1">
              <span className="font-display text-2xl font-black text-gray-800">
                ${Math.min(
                  parseFloat(event.priceSingleFemale || "0"),
                  parseFloat(event.priceSingleMale || "0"),
                  parseFloat(event.priceCouple || "0")
                ).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Capacity Bar */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Capacity</p>
              <p className="text-xs font-bold text-pink-600">{event.capacity} spots</p>
            </div>
            <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: "60%" }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-pink-500 to-purple-600"
              />
            </div>
          </div>

          {/* CTA Button */}
          <motion.button
            whileHover={{ x: 4 }}
            className="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 group-hover:border-pink-400 text-pink-600 font-bold text-sm transition-all group-hover:shadow-lg"
          >
            <span>View Details</span>
            <ChevronRight className="h-4 w-4" />
          </motion.button>
        </div>
      </motion.div>
    </Link>
  );
}

// ─── MAIN EVENTS PAGE ────────────────────────────────────────────────────────
export default function Events() {
  const { data: events, isLoading } = trpc.events.list.useQuery(undefined, {
    retry: false,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // all, upcoming, past
  const [sortBy, setSortBy] = useState("date"); // date, popularity
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    if (!events) return [];

    let result = events.filter((e: any) => {
      const matchSearch = !search || e.title.toLowerCase().includes(search.toLowerCase()) || e.venue.toLowerCase().includes(search.toLowerCase());
      const eventDate = new Date(e.startDate);
      const matchStatus =
        filterStatus === "upcoming" ? isFuture(eventDate) :
        filterStatus === "past" ? isPast(eventDate) :
        true;
      return matchSearch && matchStatus;
    });

    // Sort
    if (sortBy === "date") {
      result.sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    } else if (sortBy === "popularity") {
      // Can be enhanced with actual popularity metrics
      result.sort((a: any, b: any) => (b.capacity || 0) - (a.capacity || 0));
    }

    return result;
  }, [events, search, filterStatus, sortBy]);

  const upcomingCount = events?.filter((e: any) => isFuture(new Date(e.startDate))).length ?? 0;
  const pastCount = events?.filter((e: any) => isPast(new Date(e.startDate))).length ?? 0;

  return (
    <PageWrapper>
      <div className="container px-4 max-w-6xl mx-auto py-6 sm:py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="h-6 w-6 text-pink-500" />
            <h1 className="font-display text-4xl sm:text-5xl font-black text-gradient">
              Events
            </h1>
          </div>
          <p className="text-gray-600 text-lg">Discover and book your next unforgettable experience</p>
        </motion.div>

        {/* Search & Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 space-y-4"
        >
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search events or venues..."
              className="pl-12 h-12 rounded-2xl border-pink-100 text-base"
            />
          </div>

          {/* Filter Tabs & Sort */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
            <div className="flex gap-2 flex-wrap">
              {[
                { value: "all", label: `All Events (${events?.length ?? 0})` },
                { value: "upcoming", label: `Upcoming (${upcomingCount})` },
                { value: "past", label: `Past (${pastCount})` },
              ].map((filter) => (
                <motion.button
                  key={filter.value}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setFilterStatus(filter.value)}
                  className={`px-4 py-2 rounded-full font-semibold text-sm transition-all ${
                    filterStatus === filter.value
                      ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-200/50"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {filter.label}
                </motion.button>
              ))}
            </div>

            {/* Sort Dropdown */}
            <motion.div whileHover={{ scale: 1.05 }}>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 rounded-full border-2 border-pink-100 bg-white font-semibold text-sm cursor-pointer outline-none focus:border-pink-300 transition-colors"
              >
                <option value="date">Sort by Date</option>
                <option value="popularity">Sort by Popularity</option>
              </select>
            </motion.div>
          </div>
        </motion.div>

        {/* Results Counter */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-sm text-gray-500 font-medium mb-6"
        >
          {filtered.length} {filtered.length === 1 ? "event" : "events"} found
        </motion.p>

        {/* Events Grid */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
              <Loader2 className="h-10 w-10 text-pink-400" />
            </motion.div>
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20"
          >
            <div className="inline-flex w-16 h-16 rounded-3xl bg-pink-50 items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-pink-300" />
            </div>
            <h3 className="font-display text-xl font-bold text-gray-800 mb-2">No events found</h3>
            <p className="text-gray-600 mb-6">Try adjusting your search or filters</p>
            <Button
              onClick={() => {
                setSearch("");
                setFilterStatus("all");
              }}
              className="bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl"
            >
              Clear Filters
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8"
          >
            <AnimatePresence>
              {filtered.map((event: any, i: number) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <EventCard event={event} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </PageWrapper>
  );
}
