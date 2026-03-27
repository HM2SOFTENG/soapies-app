import PageWrapper from "@/components/PageWrapper";
import { trpc } from "@/lib/trpc";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, X, Loader2, Users } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/_core/hooks/useAuth";
import { useProfileStatus } from "@/hooks/useProfileStatus";
import CommunityTeaser from "@/components/CommunityTeaser";
import { useLocation } from "wouter";
import { toast } from "sonner";

// ─── ORIENTATION BADGE ────────────────────────────────────────────────────────

const ORIENTATION_COLORS: Record<string, string> = {
  straight: "bg-pink-100 text-pink-700 border-pink-200",
  gay: "bg-purple-100 text-purple-700 border-purple-200",
  lesbian: "bg-rose-100 text-rose-700 border-rose-200",
  bisexual: "bg-violet-100 text-violet-700 border-violet-200",
  queer: "bg-cyan-100 text-cyan-700 border-cyan-200",
  pansexual: "bg-yellow-100 text-yellow-700 border-yellow-200",
  other: "bg-gray-100 text-gray-600 border-gray-200",
};

function OrientationBadge({ orientation }: { orientation?: string | null }) {
  if (!orientation) return null;
  const key = orientation.toLowerCase();
  const colorClass = ORIENTATION_COLORS[key] ?? ORIENTATION_COLORS.other;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colorClass} capitalize`}>
      {orientation}
    </span>
  );
}

// ─── AVATAR ───────────────────────────────────────────────────────────────────

function Avatar({ avatarUrl, displayName, size = "md" }: { avatarUrl?: string | null; displayName?: string | null; size?: "sm" | "md" | "lg" }) {
  const initials = displayName
    ? displayName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";
  const sizeClass = size === "sm" ? "w-10 h-10 text-sm" : size === "lg" ? "w-24 h-24 text-3xl" : "w-14 h-14 text-lg";

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={displayName ?? "Member"}
        className={`${sizeClass} rounded-full object-cover ring-2 ring-pink-200/60`}
      />
    );
  }
  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-bold ring-2 ring-pink-200/60`}
      style={{ background: "linear-gradient(135deg, #f000bc 0%, #8b5cf6 100%)", color: "white" }}
    >
      {initials}
    </div>
  );
}

// ─── MEMBER CARD ─────────────────────────────────────────────────────────────

function MemberCard({ member, onClick, index }: { member: any; onClick: () => void; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      whileHover={{ y: -6, scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="relative overflow-hidden rounded-3xl cursor-pointer group border border-pink-100/50 shadow-lg hover:shadow-xl hover:shadow-pink-100/30 transition-shadow"
      style={{
        background: "linear-gradient(135deg, rgba(253,242,248,0.95) 0%, rgba(245,232,255,0.92) 50%, rgba(252,231,243,0.95) 100%)",
        backdropFilter: "blur(20px)",
      }}
    >
      {/* Gradient accent top */}
      <div
        className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl"
        style={{ background: "linear-gradient(90deg, #f000bc, #8b5cf6)" }}
      />

      <div className="p-4 flex flex-col items-center gap-3 text-center">
        <Avatar avatarUrl={member.avatarUrl} displayName={member.displayName} size="md" />

        <div className="space-y-1.5">
          <h3 className="font-semibold text-gray-800 text-sm truncate max-w-[120px]">
            {member.displayName ?? "Anonymous"}
          </h3>
          <OrientationBadge orientation={member.orientation} />
        </div>

        {member.location && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <MapPin className="w-3 h-3" />
            <span className="truncate max-w-[100px]">{member.location}</span>
          </div>
        )}

        <p className="text-xs text-gray-400">
          Joined {formatDistanceToNow(new Date(member.createdAt), { addSuffix: true })}
        </p>
      </div>
    </motion.div>
  );
}

// ─── MEMBER MODAL ────────────────────────────────────────────────────────────

function MemberModal({ member, onClose, onMessage, onViewProfile }: { member: any; onClose: () => void; onMessage: (member: any) => void; onViewProfile: (member: any) => void }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-pink-100/50"
          style={{
            background: "linear-gradient(135deg, rgba(253,242,248,0.98) 0%, rgba(245,232,255,0.96) 50%, rgba(252,231,243,0.98) 100%)",
            backdropFilter: "blur(30px)",
          }}
        >
          {/* Header gradient */}
          <div
            className="h-2"
            style={{ background: "linear-gradient(90deg, #f000bc, #8b5cf6, #06b6d4)" }}
          />

          <div className="p-6">
            {/* Close */}
            <div className="flex justify-end mb-4">
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-pink-50 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Profile */}
            <div className="flex flex-col items-center gap-4 text-center mb-6">
              <Avatar avatarUrl={member.avatarUrl} displayName={member.displayName} size="lg" />
              <div>
                <h2 className="text-xl font-bold text-gray-800">{member.displayName ?? "Anonymous"}</h2>
                <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
                  <OrientationBadge orientation={member.orientation} />
                  {member.communityId && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-pink-50 text-pink-600 border-pink-200 capitalize">
                      {member.communityId}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-3">
              {member.bio && (
                <div className="bg-white/60 rounded-2xl p-4">
                  <p className="text-sm font-medium text-gray-500 mb-1">About</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{member.bio}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {member.location && (
                  <div className="bg-white/60 rounded-2xl p-3">
                    <p className="text-xs font-medium text-gray-400 mb-1">Location</p>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-pink-500" />
                      <p className="text-sm text-gray-700">{member.location}</p>
                    </div>
                  </div>
                )}
                <div className="bg-white/60 rounded-2xl p-3">
                  <p className="text-xs font-medium text-gray-400 mb-1">Member Since</p>
                  <p className="text-sm text-gray-700">
                    {formatDistanceToNow(new Date(member.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-4">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onMessage(member)}
                  className="flex-1 py-2.5 rounded-2xl text-sm font-semibold text-white shadow-md"
                  style={{ background: "linear-gradient(135deg, #f000bc, #8b5cf6)" }}
                >
                  💬 Message
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onViewProfile(member)}
                  className="flex-1 py-2.5 rounded-2xl text-sm font-semibold border-2 border-pink-200 text-pink-600 bg-white/60 hover:bg-pink-50 transition-colors"
                >
                  👤 View Profile
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── FILTER CHIPS ─────────────────────────────────────────────────────────────

interface FilterChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function FilterChip({ label, active, onClick }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all whitespace-nowrap ${
        active
          ? "text-white border-transparent shadow-md"
          : "bg-white/60 text-gray-600 border-pink-100 hover:border-pink-300"
      }`}
      style={active ? { background: "linear-gradient(135deg, #f000bc, #8b5cf6)" } : {}}
    >
      {label}
    </button>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

const ORIENTATION_FILTERS = [
  { label: "All", value: "" },
  { label: "Women", value: "women" },
  { label: "Men", value: "men" },
  { label: "Couples", value: "couples" },
];

const COMMUNITY_FILTERS = [
  { label: "All Communities", value: "" },
  { label: "🧼 Soapies", value: "soapies" },
  { label: "🫧 Groupies", value: "groupies" },
  { label: "🏳️‍🌈 Gaypeez", value: "gaypeez" },
];

export default function Members() {
  const { isAuthenticated } = useAuth();
  const { isApprovedMember } = useProfileStatus();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [orientation, setOrientation] = useState("");
  const [community, setCommunity] = useState("");
  const [page, setPage] = useState(0);
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [sortBy, setSortBy] = useState<"name" | "newest">("newest");

  const createConversation = trpc.messages.createConversation.useMutation({
    onSuccess: () => {
      setSelectedMember(null);
      navigate("/messages");
    },
    onError: (e) => toast.error(e.message),
  });

  function handleMessage(member: any) {
    createConversation.mutate({ participantIds: [member.id] });
  }

  function handleViewProfile(member: any) {
    setSelectedMember(null);
    navigate(`/u/${member.id}`);
  }

  const { data, isLoading, isFetching } = trpc.members.browse.useQuery(
    { page, search: debouncedSearch || undefined, orientation: orientation || undefined, community: community || undefined },
    { enabled: isAuthenticated }
  );

  // Accumulate pages of results
  const prevPageRef = useRef(page);
  useEffect(() => {
    if (!data) return;
    if (page === 0 || prevPageRef.current > page) {
      setAllMembers(data as any[]);
    } else {
      setAllMembers(prev => [...prev, ...(data as any[])]);
    }
    prevPageRef.current = page;
  }, [data, page]);

  const hasMore = (data?.length ?? 0) === 20;

  function handleSearch(value: string) {
    setSearch(value);
    setPage(0);
    clearTimeout((window as any)._memberSearchTimer);
    (window as any)._memberSearchTimer = setTimeout(() => setDebouncedSearch(value), 400);
  }

  function handleFilterChange(key: "orientation" | "community", value: string) {
    if (key === "orientation") setOrientation(value);
    else setCommunity(value);
    setPage(0);
    setAllMembers([]);
  }

  if (!isApprovedMember) {
    return (
      <PageWrapper className="min-h-screen">
        <CommunityTeaser />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper className="min-h-screen pb-24">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-3xl font-bold" style={{ background: "linear-gradient(135deg, #f000bc, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            👥 Members
          </h1>
          <p className="text-gray-500 text-sm mt-1">Discover your community</p>
        </motion.div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search members..."
            className="pl-10 rounded-2xl border-pink-100 bg-white/70 backdrop-blur-sm focus:border-pink-300"
          />
          {search && (
            <button onClick={() => handleSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>

        {/* Orientation filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {ORIENTATION_FILTERS.map(f => (
            <FilterChip
              key={f.value}
              label={f.label}
              active={orientation === f.value}
              onClick={() => handleFilterChange("orientation", f.value)}
            />
          ))}
        </div>

        {/* Community filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 mt-2 scrollbar-hide">
          {COMMUNITY_FILTERS.map(f => (
            <FilterChip
              key={f.value}
              label={f.label}
              active={community === f.value}
              onClick={() => handleFilterChange("community", f.value)}
            />
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center justify-end mt-3 gap-2">
          <span className="text-xs text-gray-500 font-semibold">Sort:</span>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="px-3 py-1.5 rounded-lg border border-pink-200 bg-white text-xs outline-none focus:ring-2 focus:ring-pink-200/50 font-semibold"
          >
            <option value="newest">Newest</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      <div className="px-4">
        {isLoading && page === 0 ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-pink-400" />
          </div>
        ) : allMembers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 gap-4 text-center"
          >
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, rgba(240,0,188,0.1), rgba(139,92,246,0.1))" }}
            >
              <Users className="w-10 h-10 text-pink-400" />
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-700">No members found</p>
              <p className="text-sm text-gray-400 mt-1">Try adjusting your filters or search</p>
            </div>
          </motion.div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {[...allMembers].sort((a, b) => {
                if (sortBy === "name") return (a.displayName || "").localeCompare(b.displayName || "");
                return 0; // newest = server order
              }).map((member, i) => (
                <MemberCard
                  key={member.id}
                  member={member}
                  index={i}
                  onClick={() => navigate(`/u/${member.id}`)}
                />
              ))}
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center mt-8">
                <Button
                  onClick={() => setPage(p => p + 1)}
                  disabled={isFetching}
                  className="rounded-2xl px-8"
                  style={{ background: "linear-gradient(135deg, #f000bc, #8b5cf6)", color: "white", border: "none" }}
                >
                  {isFetching ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading...</>
                  ) : (
                    "Load More"
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Member detail modal */}
      {selectedMember && (
        <MemberModal
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
          onMessage={handleMessage}
          onViewProfile={handleViewProfile}
        />
      )}
    </PageWrapper>
  );
}
