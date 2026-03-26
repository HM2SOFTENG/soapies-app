import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { formatDistanceToNow } from "date-fns";

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

function Avatar({ avatarUrl, displayName, size = 80 }: { avatarUrl?: string | null; displayName?: string | null; size?: number }) {
  const initials = displayName
    ? displayName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={displayName ?? "Member"}
        className="rounded-full object-cover ring-2 ring-pink-200/60"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold ring-2 ring-pink-200/60"
      style={{
        width: size,
        height: size,
        background: "linear-gradient(135deg, #f9a8d4 0%, #c084fc 100%)",
        color: "white",
        fontSize: size * 0.3,
      }}
    >
      {initials}
    </div>
  );
}

// ─── PROPS ───────────────────────────────────────────────────────────────────

export interface UserProfilePreviewProps {
  userId: number;
  displayName: string;
  avatarUrl?: string | null;
  onClose: () => void;
  onSendMessage: (userId: number, displayName: string) => void;
  onViewProfile: (userId: number) => void;
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export default function UserProfilePreview({
  userId,
  displayName,
  avatarUrl,
  onClose,
  onSendMessage,
  onViewProfile,
}: UserProfilePreviewProps) {
  const { data: profile, isLoading } = trpc.members.byId.useQuery({ userId });

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          key="card"
          initial={{ scale: 0.85, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border border-pink-100/50"
          style={{
            background: "linear-gradient(135deg, rgba(253,242,248,0.98) 0%, rgba(245,232,255,0.96) 50%, rgba(252,231,243,0.98) 100%)",
            backdropFilter: "blur(30px)",
          }}
        >
          {/* Gradient top bar */}
          <div
            className="h-2"
            style={{ background: "linear-gradient(90deg, #f000bc, #8b5cf6, #06b6d4)" }}
          />

          <div className="p-6">
            {/* Header row */}
            <div className="flex justify-end mb-2">
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-pink-50 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Avatar + Name */}
            <div className="flex flex-col items-center gap-3 text-center mb-5">
              <Avatar
                avatarUrl={profile?.avatarUrl ?? avatarUrl}
                displayName={profile?.displayName ?? displayName}
                size={80}
              />

              <div className="space-y-1">
                <h2 className="text-lg font-bold text-gray-800">
                  {profile?.displayName ?? displayName}
                </h2>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-pink-400" />
                  ) : (
                    <OrientationBadge orientation={profile?.orientation} />
                  )}
                </div>
              </div>
            </div>

            {/* Details */}
            {!isLoading && profile && (
              <div className="space-y-3 mb-5">
                {profile.bio && (
                  <div className="bg-white/60 rounded-2xl p-3">
                    <p className="text-sm text-gray-700 leading-relaxed line-clamp-2">
                      {profile.bio}
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                  {profile.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-pink-400" />
                      <span>{profile.location}</span>
                    </div>
                  )}
                  {profile.createdAt && (
                    <span>
                      Member {formatDistanceToNow(new Date(profile.createdAt), { addSuffix: true })}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onSendMessage(userId, profile?.displayName ?? displayName)}
                className="flex-1 py-2.5 rounded-2xl text-sm font-semibold text-white shadow-md"
                style={{ background: "linear-gradient(135deg, #f000bc, #8b5cf6)" }}
              >
                💬 Message
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onViewProfile(userId)}
                className="flex-1 py-2.5 rounded-2xl text-sm font-semibold border-2 border-pink-200 text-pink-600 bg-white/60 hover:bg-pink-50 transition-colors"
              >
                👤 View Profile
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
