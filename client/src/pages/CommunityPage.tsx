import PageWrapper from "@/components/PageWrapper";
import { trpc } from "@/lib/trpc";
import { motion } from "framer-motion";
import { Users, Calendar, MapPin, Clock, Loader2, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { format, formatDistanceToNow, isFuture } from "date-fns";
import { Button } from "@/components/ui/button";

// ─── COMMUNITY CONFIG ────────────────────────────────────────────────────────

type CommunityId = "soapies" | "groupies" | "gaypeez";

const COMMUNITY_CONFIG: Record<CommunityId, { name: string; tagline: string; color: string; emoji: string; gradient: string }> = {
  soapies: {
    name: "Soapies",
    tagline: "The Original. The Lifestyle.",
    color: "#f000bc",
    emoji: "🧼",
    gradient: "linear-gradient(135deg, #f000bc 0%, #8b5cf6 100%)",
  },
  groupies: {
    name: "Groupies",
    tagline: "Group Experiences. Elevated.",
    color: "#8b5cf6",
    emoji: "🫧",
    gradient: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)",
  },
  gaypeez: {
    name: "Gaypeez",
    tagline: "Queer. Playful. Free.",
    color: "#06b6d4",
    emoji: "🏳️‍🌈",
    gradient: "linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%)",
  },
};

// ─── EVENT CARD (compact) ─────────────────────────────────────────────────────

function EventCard({ event }: { event: any }) {
  const upcoming = isFuture(new Date(event.startDate));

  return (
    <Link href={`/events/${event.id}`}>
      <motion.div
        whileHover={{ y: -4, scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className="relative overflow-hidden rounded-2xl border border-pink-100/50 cursor-pointer group shadow-md hover:shadow-lg transition-shadow"
        style={{
          background: "linear-gradient(135deg, rgba(253,242,248,0.95) 0%, rgba(245,232,255,0.92) 100%)",
          backdropFilter: "blur(20px)",
        }}
      >
        {event.coverImageUrl && (
          <div className="h-36 overflow-hidden">
            <img
              src={event.coverImageUrl}
              alt={event.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>
        )}
        <div className="p-4">
          <h3 className="font-semibold text-gray-800 text-sm mb-2 line-clamp-1">{event.title}</h3>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Calendar className="w-3.5 h-3.5 text-pink-400" />
              <span>{format(new Date(event.startDate), "MMM d, yyyy")}</span>
            </div>
            {event.venue && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <MapPin className="w-3.5 h-3.5 text-purple-400" />
                <span className="truncate">{event.venue}</span>
              </div>
            )}
          </div>
          {upcoming && (
            <span className="inline-flex items-center mt-2 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-600 border border-green-200">
              Upcoming
            </span>
          )}
        </div>
      </motion.div>
    </Link>
  );
}

// ─── POST CARD (compact) ──────────────────────────────────────────────────────

function PostCard({ post }: { post: any }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      className="flex gap-3 p-3 rounded-2xl border border-pink-50 bg-white/50"
    >
      <div
        className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
        style={{ background: "linear-gradient(135deg, #f000bc, #8b5cf6)" }}
      >
        {(post.authorName ?? "?")[0].toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-gray-700">{post.authorName ?? "Anonymous"}</span>
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
          </span>
        </div>
        <p className="text-sm text-gray-600 line-clamp-2">{post.content}</p>
      </div>
    </motion.div>
  );
}

// ─── SECTION HEADER ───────────────────────────────────────────────────────────

function SectionHeader({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="p-1.5 rounded-xl bg-pink-50">{icon}</div>
      <h2 className="text-lg font-bold text-gray-800">{title}</h2>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

interface CommunityPageProps {
  communityId: CommunityId;
}

export default function CommunityPage({ communityId }: CommunityPageProps) {
  const config = COMMUNITY_CONFIG[communityId];

  const { data, isLoading } = trpc.communities.landing.useQuery({ communityId });

  return (
    <PageWrapper className="min-h-screen pb-24">
      {/* ── Hero ── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden"
        style={{
          background: config.gradient,
          minHeight: "280px",
        }}
      >
        {/* Decorative blobs */}
        <div
          className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-20"
          style={{ background: "white" }}
        />
        <div
          className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full opacity-10"
          style={{ background: "white" }}
        />

        <div className="relative z-10 px-6 py-12 flex flex-col items-center text-center text-white">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.1, damping: 15 }}
            className="text-6xl mb-4"
          >
            {config.emoji}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-4xl font-black mb-2"
          >
            {config.name}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.9 }}
            transition={{ delay: 0.3 }}
            className="text-lg font-medium mb-6"
          >
            {config.tagline}
          </motion.p>

          {/* Member count */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="flex items-center gap-2 bg-white/20 backdrop-blur-md rounded-full px-5 py-2.5 mb-6 border border-white/30"
          >
            <Users className="w-4 h-4" />
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <span className="font-bold text-lg">{data?.memberCount ?? 0}</span>
            )}
            <span className="text-sm opacity-80">members</span>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Link href="/apply">
              <Button
                className="rounded-full px-8 py-3 text-base font-bold bg-white hover:bg-white/90 transition-colors flex items-center gap-2"
                style={{ color: config.color }}
              >
                Apply Now <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </motion.div>

      {/* ── Content ── */}
      <div className="px-4 py-8 space-y-10">

        {/* Upcoming Events */}
        <section>
          <SectionHeader
            title="Upcoming Events"
            icon={<Calendar className="w-4 h-4 text-pink-500" />}
          />
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-pink-400" />
            </div>
          ) : (data?.upcomingEvents?.length ?? 0) === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No upcoming events scheduled</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {data!.upcomingEvents.map((event: any, i: number) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <EventCard event={event} />
                </motion.div>
              ))}
            </div>
          )}
          <div className="flex justify-center mt-4">
            <Link href="/events">
              <button className="text-sm font-medium hover:underline flex items-center gap-1" style={{ color: config.color }}>
                View all events <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </Link>
          </div>
        </section>

        {/* Wall Preview */}
        <section>
          <SectionHeader
            title="Community Wall"
            icon={<Users className="w-4 h-4 text-purple-500" />}
          />
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
            </div>
          ) : (data?.latestPosts?.length ?? 0) === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No posts yet — be the first!</div>
          ) : (
            <div className="space-y-3">
              {data!.latestPosts.map((post: any) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
          <div className="flex justify-center mt-4">
            <Link href="/wall">
              <button className="text-sm font-medium hover:underline flex items-center gap-1" style={{ color: config.color }}>
                View full wall <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </Link>
          </div>
        </section>
      </div>
    </PageWrapper>
  );
}
