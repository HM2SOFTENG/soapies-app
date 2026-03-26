import PageWrapper from "@/components/PageWrapper";
import { trpc } from "@/lib/trpc";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, MapPin, Loader2, Heart, Users, Edit3 } from "lucide-react";
import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Link } from "wouter";

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

function Avatar({ avatarUrl, displayName, size = 96 }: { avatarUrl?: string | null; displayName?: string | null; size?: number }) {
  const initials = displayName
    ? displayName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={displayName ?? "Member"}
        className="rounded-full object-cover ring-4 ring-white shadow-xl"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold ring-4 ring-white shadow-xl"
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

// ─── COVER GRADIENT ──────────────────────────────────────────────────────────

function getCoverGradient(communityId?: string | null): string {
  switch (communityId) {
    case "soapies":
      return "linear-gradient(135deg, #500724 0%, #3b0764 100%)";
    case "groupies":
      return "linear-gradient(135deg, #2e1065 0%, #1e1b4b 100%)";
    case "gaypeez":
      return "linear-gradient(135deg, #7f1d1d 0%, #14532d 20%, #1e3a5f 40%, #4c1d95 60%, #6b21a8 80%, #be185d 100%)";
    default:
      return "linear-gradient(135deg, #701a75 0%, #3b0764 100%)";
  }
}

// ─── WALL POST CARD ───────────────────────────────────────────────────────────

function WallPostCard({ post, profileUserId }: { post: any; profileUserId: number }) {
  const [localLiked, setLocalLiked] = useState(false);
  const [localLikes, setLocalLikes] = useState(post.likesCount ?? 0);
  const utils = trpc.useUtils();

  const likePost = trpc.wall.like.useMutation({
    onMutate: () => {
      setLocalLiked(prev => !prev);
      setLocalLikes((prev: number) => localLiked ? prev - 1 : prev + 1);
    },
    onSuccess: () => {
      utils.members.wall.invalidate({ userId: profileUserId });
    },
    onError: () => {
      setLocalLiked(false);
      setLocalLikes(post.likesCount ?? 0);
    },
  });

  const timeAgo = post.createdAt
    ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })
    : "";
  const authorName = post.resolvedAuthorName ?? "Member";
  const authorAvatar = post.resolvedAvatarUrl;

  const initials = authorName.charAt(0).toUpperCase();

  return (
    <div className="bg-white/70 rounded-2xl border border-pink-100/50 p-4 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-sm overflow-hidden shrink-0"
          style={{ background: "linear-gradient(135deg, #f9a8d4 0%, #c084fc 100%)" }}
        >
          {authorAvatar ? (
            <img src={authorAvatar} alt={authorName} className="w-full h-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-800">{authorName}</p>
          <p className="text-xs text-gray-400">{timeAgo}</p>
        </div>
      </div>

      {post.content && (
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mb-3">{post.content}</p>
      )}

      {post.mediaUrl && (
        <div className="rounded-xl overflow-hidden mb-3">
          <img src={post.mediaUrl} alt="" className="w-full object-cover max-h-72" />
        </div>
      )}

      <div className="flex items-center">
        <button
          onClick={() => likePost.mutate({ postId: post.id })}
          disabled={likePost.isPending}
          className={`flex items-center gap-1.5 text-sm transition-colors ${
            localLiked ? "text-pink-500" : "text-gray-400 hover:text-pink-400"
          }`}
        >
          <Heart className={`w-4 h-4 ${localLiked ? "fill-current" : ""}`} />
          <span>{localLikes}</span>
        </button>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

interface MemberProfileProps {
  userId?: number;
  isOwnProfile?: boolean;
}

export default function MemberProfile({ userId: propUserId, isOwnProfile = false }: MemberProfileProps = {}) {
  const params = useParams<{ userId: string }>();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<"wall" | "about">("wall");

  const userId = propUserId ?? parseInt(params.userId ?? "0", 10);

  const { data: profile, isLoading: profileLoading } = trpc.members.byId.useQuery(
    { userId },
    { enabled: !!userId && !isNaN(userId) }
  );

  const { data: wallPosts, isLoading: wallLoading } = trpc.members.wall.useQuery(
    { userId },
    { enabled: !!userId && !isNaN(userId) }
  );

  const createConversation = trpc.messages.createConversation.useMutation({
    onSuccess: () => {
      navigate("/messages");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleMessage = () => {
    createConversation.mutate({ participantIds: [userId] });
  };

  if (profileLoading) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
        </div>
      </PageWrapper>
    );
  }

  if (!profile) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-6 text-center">
          <div className="text-5xl">🫧</div>
          <h2 className="text-xl font-bold text-gray-800">Profile Not Found</h2>
          <p className="text-sm text-gray-500">This member profile isn't available or may not be approved yet.</p>
          <button
            onClick={() => navigate("/members")}
            className="px-5 py-2.5 rounded-2xl text-sm font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #f000bc, #8b5cf6)" }}
          >
            ← Back to Members
          </button>
        </div>
      </PageWrapper>
    );
  }

  const coverGradient = getCoverGradient(profile.communityId);

  return (
    <PageWrapper>
      <div className="min-h-screen bg-gradient-to-b from-pink-50/50 to-purple-50/30">
        {/* Cover Section */}
        <div
          className="relative h-48 w-full"
          style={{ background: coverGradient }}
        >
          {/* Back button */}
          <button
            onClick={() => navigate(-1 as any)}
            className="absolute top-4 left-4 p-2 rounded-full bg-black/30 text-white backdrop-blur-sm hover:bg-black/50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Avatar overlapping */}
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
            <Avatar avatarUrl={profile.avatarUrl} displayName={profile.displayName} size={96} />
          </div>
        </div>

        {/* Profile Info */}
        <div className="pt-16 px-4 pb-4 text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            {profile.displayName ?? "Anonymous"}
          </h1>

          <div className="flex items-center justify-center gap-2 flex-wrap mb-3">
            {profile.memberRole && profile.memberRole !== "pending" && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-pink-100 text-pink-700 border border-pink-200 capitalize">
                {profile.memberRole}
              </span>
            )}
            {profile.communityId && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200 capitalize">
                {profile.communityId}
              </span>
            )}
            <OrientationBadge orientation={profile.orientation} />
          </div>

          {profile.bio && (
            <p className="text-sm text-gray-600 leading-relaxed max-w-sm mx-auto mb-4 line-clamp-3">
              {profile.bio}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-center mb-5 flex-wrap">
            {isOwnProfile ? (
              <Link href="/profile/edit">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-5 py-2.5 rounded-2xl text-sm font-semibold text-white shadow-md flex items-center gap-2"
                  style={{ background: "linear-gradient(135deg, #f000bc, #8b5cf6)" }}
                >
                  <Edit3 className="w-4 h-4" />
                  ✏️ Edit Profile
                </motion.button>
              </Link>
            ) : (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleMessage}
                disabled={createConversation.isPending}
                className="px-5 py-2.5 rounded-2xl text-sm font-semibold text-white shadow-md flex items-center gap-2"
                style={{ background: "linear-gradient(135deg, #f000bc, #8b5cf6)" }}
              >
                {createConversation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : "💬"}
                Message
              </motion.button>
            )}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/members")}
              className="px-5 py-2.5 rounded-2xl text-sm font-semibold border-2 border-pink-200 text-pink-600 bg-white/60 hover:bg-pink-50 transition-colors flex items-center gap-2"
            >
              <Users className="w-4 h-4" />
              Members
            </motion.button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="mx-4 mb-4">
          <div
            className="rounded-2xl p-4 border border-pink-100/50 grid grid-cols-2 divide-x divide-pink-100"
            style={{ background: "rgba(253,242,248,0.8)", backdropFilter: "blur(10px)" }}
          >
            <div className="text-center pr-4">
              <p className="text-lg font-bold text-gray-800">{profile.photoCount ?? 0}</p>
              <p className="text-xs text-gray-500">Posts</p>
            </div>
            <div className="text-center pl-4">
              <p className="text-sm font-semibold text-gray-700">
                {profile.createdAt
                  ? formatDistanceToNow(new Date(profile.createdAt), { addSuffix: true })
                  : "—"}
              </p>
              <p className="text-xs text-gray-500">Member Since</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mx-4 mb-4">
          <div className="flex rounded-2xl overflow-hidden border border-pink-100/50 bg-white/60">
            {(["wall", "about"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-sm font-semibold transition-all capitalize ${
                  activeTab === tab
                    ? "text-white"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                style={activeTab === tab ? { background: "linear-gradient(135deg, #f000bc, #8b5cf6)" } : {}}
              >
                {tab === "wall" ? "🧱 Wall" : "ℹ️ About"}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="px-4 pb-24">
          <AnimatePresence mode="wait">
            {activeTab === "wall" && (
              <motion.div
                key="wall"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {wallLoading && (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-pink-400" />
                  </div>
                )}
                {!wallLoading && (!wallPosts || wallPosts.length === 0) && (
                  <div className="text-center py-12 text-gray-400">
                    <div className="text-4xl mb-2">🌸</div>
                    <p className="text-sm">No posts yet</p>
                  </div>
                )}
                {wallPosts?.map(post => (
                  <WallPostCard key={post.id} post={post} profileUserId={userId} />
                ))}
              </motion.div>
            )}

            {activeTab === "about" && (
              <motion.div
                key="about"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                <div
                  className="rounded-2xl p-5 border border-pink-100/50 space-y-4"
                  style={{ background: "rgba(253,242,248,0.8)", backdropFilter: "blur(10px)" }}
                >
                  {profile.bio && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">About</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{profile.bio}</p>
                    </div>
                  )}

                  {profile.location && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Location</p>
                      <div className="flex items-center gap-1.5 text-sm text-gray-700">
                        <MapPin className="w-4 h-4 text-pink-400" />
                        {profile.location}
                      </div>
                    </div>
                  )}

                  {profile.orientation && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Orientation</p>
                      <OrientationBadge orientation={profile.orientation} />
                    </div>
                  )}

                  {profile.communityId && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Community</p>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200 capitalize">
                        {profile.communityId}
                      </span>
                    </div>
                  )}

                  {profile.createdAt && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Member Since</p>
                      <p className="text-sm text-gray-700">
                        {new Date(profile.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </PageWrapper>
  );
}
