import PageWrapper from "@/components/PageWrapper";
import { useAuth } from "@/_core/hooks/useAuth";
import { useProfileStatus } from "@/hooks/useProfileStatus";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, MessageCircle, Share2, Loader2, Sparkles, Image as ImageIcon,
  MoreHorizontal, Flame, TrendingUp, Users, Pin, X, Lock, Globe, Users2, ChevronDown
} from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { FloatingBubbles } from "@/components/FloatingElements";
import CommunityTeaser from "@/components/CommunityTeaser";
import { useLocation, Link } from "wouter";
import UserProfilePreview from "@/components/UserProfilePreview";

const COMMUNITIES = [
  { id: "soapies", name: "Soapies", emoji: "🧼" },
  { id: "groupus", name: "Groupus", emoji: "👥" },
  { id: "gaypeez", name: "Gaypeez", emoji: "🏳️‍🌈" },
];

// ─── POST COMPOSER ─────────────────────────────────────────────────────────
function PostComposer({ user }: { user: any }) {
  const [content, setContent] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [selectedCommunity, setSelectedCommunity] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<"public" | "members" | "community">("members");
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const utils = trpc.useUtils();

  const createPost = trpc.wall.create.useMutation({
    onSuccess: () => {
      setContent("");
      setMediaUrl(null);
      setSelectedCommunity(null);
      setVisibility("members");
      setIsFocused(false);
      utils.wall.posts.invalidate();
      toast.success("Posted!", { icon: "🎉" });
    },
    onError: (e) => toast.error(e.message),
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const response = await fetch("/api/upload-photo", {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      setMediaUrl(data.url);
      toast.success("Image uploaded!");
    } catch (err: any) {
      toast.error(`Failed to upload image: ${err.message}`);
    }
  };

  const autoGrowTextarea = (elem: HTMLTextAreaElement) => {
    elem.style.height = "auto";
    elem.style.height = Math.min(elem.scrollHeight, 200) + "px";
  };

  const initials = user?.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "?";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-strong rounded-2xl border border-pink-100/50 overflow-hidden mb-6"
    >
      <div className="p-5">
        <div className="flex items-start gap-3">
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            className="w-11 h-11 rounded-xl bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center shrink-0 shadow-md"
          >
            <span className="text-sm font-black text-white">{initials}</span>
          </motion.div>
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={e => {
                setContent(e.target.value);
                autoGrowTextarea(e.target);
              }}
              onFocus={() => setIsFocused(true)}
              placeholder="Share your vibe with the community... ✨"
              rows={isFocused ? 4 : 2}
              className="w-full px-4 py-3 rounded-xl border border-pink-100 bg-white/50 focus:border-pink-300 focus:ring-2 focus:ring-pink-200/50 outline-none transition-all text-sm resize-none placeholder:text-gray-300"
            />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {(isFocused || content.trim() || mediaUrl) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-5 pb-4 space-y-3 border-t border-pink-50 pt-3"
          >
            {/* Image Preview */}
            {mediaUrl && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative rounded-lg overflow-hidden">
                <img src={mediaUrl} alt="" className="w-full max-h-48 object-cover rounded-lg" />
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setMediaUrl(null)}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-lg text-white hover:bg-black/80"
                >
                  <X className="h-4 w-4" />
                </motion.button>
              </motion.div>
            )}

            {/* Image Upload Button */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-pink-200 hover:bg-pink-50 text-pink-600 text-sm font-semibold transition-colors"
              >
                <ImageIcon className="h-4 w-4" /> Add Photo
              </motion.button>
            </div>

            {/* Visibility & Community Selection */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Visibility</label>
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-pink-200 bg-white text-sm outline-none focus:ring-2 focus:ring-pink-200/50"
                >
                  <option value="members">Members Only</option>
                  <option value="public">Public</option>
                  <option value="community">Community</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Community</label>
                <select
                  value={selectedCommunity || ""}
                  onChange={(e) => setSelectedCommunity(e.target.value || null)}
                  className="w-full px-3 py-2 rounded-lg border border-pink-200 bg-white text-sm outline-none focus:ring-2 focus:ring-pink-200/50"
                >
                  <option value="">All Communities</option>
                  {COMMUNITIES.map(c => (
                    <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-1">
              <span className="text-xs text-gray-400">{content.length}/500</span>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  onClick={() => content.trim() && createPost.mutate({ content, communityId: selectedCommunity || undefined, mediaUrl: mediaUrl || undefined, mediaType: "image", visibility })}
                  disabled={!content.trim() || createPost.isPending}
                  className="bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl gap-2 px-5 shadow-lg shadow-pink-200/30"
                  size="sm"
                >
                  {createPost.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Post
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── POST CARD ─────────────────────────────────────────────────────────────
function PostCard({ post, isLiked, index, onAuthorClick, currentUserId }: { post: any; isLiked: boolean; index: number; onAuthorClick?: (authorId: number, displayName: string, avatarUrl?: string | null) => void; currentUserId?: number }) {
  const [showComments, setShowComments] = useState(false);
  const [localLiked, setLocalLiked] = useState(isLiked);
  const [localLikes, setLocalLikes] = useState(post.likesCount || 0);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content || "");
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const updatePost = trpc.wall.updatePost.useMutation({
    onSuccess: () => { utils.wall.posts.invalidate(); setIsEditing(false); toast.success("Post updated!"); },
    onError: (e) => toast.error(e.message),
  });

  const deletePost = trpc.wall.deletePost.useMutation({
    onSuccess: () => { utils.wall.posts.invalidate(); toast.success("Post deleted!"); },
    onError: (e) => toast.error(e.message),
  });

  const isOwnPost = !!currentUserId && post.authorId === currentUserId;

  const likePost = trpc.wall.like.useMutation({
    onMutate: () => {
      setLocalLiked(!localLiked);
      setLocalLikes((prev: number) => localLiked ? prev - 1 : prev + 1);
    },
    onSuccess: () => {
      utils.wall.posts.invalidate();
      utils.wall.myLikes.invalidate();
    },
    onError: () => {
      setLocalLiked(isLiked);
      setLocalLikes(post.likesCount || 0);
    },
  });

  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });
  const communityInfo = COMMUNITIES.find(c => c.id === post.communityId);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied!");
  };

  const authorName = (post as any).resolvedAuthorName ?? (post.authorId ? `Member` : "Soapies Team");
  const authorAvatar = (post as any).resolvedAvatarUrl;
  const isSystemPost = !post.authorId;

  const getInitials = (name: string) => name.charAt(0).toUpperCase();
  const getAvatarGradient = (id: number | null) => {
    const colors = [
      "from-pink-400 to-rose-500",
      "from-purple-400 to-pink-500",
      "from-blue-400 to-purple-500",
      "from-cyan-400 to-blue-500",
      "from-orange-400 to-pink-500",
      "from-rose-400 to-orange-500",
    ];
    if (!id) return "from-fuchsia-500 to-pink-600"; // Soapies Team gradient
    return colors[id % colors.length];
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ delay: index * 0.06, type: "spring", stiffness: 200 }}
      className="glass-strong rounded-2xl border border-pink-100/50 overflow-hidden hover:shadow-lg hover:shadow-pink-100/20 transition-all"
    >
      <div className="p-5">
        {/* Header with Author & Badges */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 flex-1">
            <motion.div
              whileHover={{ scale: 1.1 }}
              onClick={() => !isSystemPost && post.authorId && onAuthorClick?.(post.authorId, authorName, authorAvatar)}
              className={`w-11 h-11 rounded-xl bg-gradient-to-br ${getAvatarGradient(post.authorId)} flex items-center justify-center shadow-md overflow-hidden flex-shrink-0 ${!isSystemPost && post.authorId ? "cursor-pointer" : ""}`}
            >
              {authorAvatar ? (
                <img src={authorAvatar} alt={authorName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-black text-white">{getInitials(authorName)}</span>
              )}
            </motion.div>
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <p
                  className={`text-sm font-bold text-gray-800 ${!isSystemPost && post.authorId ? "cursor-pointer hover:text-pink-600 transition-colors" : ""}`}
                  onClick={() => !isSystemPost && post.authorId && onAuthorClick?.(post.authorId, authorName, authorAvatar)}
                >
                  {authorName}
                </p>
                {isSystemPost && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-fuchsia-100 text-fuchsia-600 uppercase tracking-wide">Official</span>
                )}
              </div>
              <p className="text-xs text-gray-400">{timeAgo}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {post.isPinned && (
              <motion.div whileHover={{ scale: 1.1 }} className="p-1.5 rounded-lg bg-amber-50">
                <Pin className="h-4 w-4 text-amber-500" />
              </motion.div>
            )}
            {isOwnPost && (
              <div className="relative">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <MoreHorizontal className="h-4 w-4 text-gray-400" />
                </motion.button>
                {showMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-pink-100 z-20 min-w-[120px] py-1">
                    <button
                      onClick={() => { setIsEditing(true); setShowMenu(false); }}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-pink-50 transition-colors"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => { if (confirm('Delete this post?')) deletePost.mutate({ postId: post.id }); setShowMenu(false); }}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        {isEditing ? (
          <div className="mb-4">
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-pink-200 bg-white/70 text-sm outline-none focus:border-pink-400 resize-none"
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => updatePost.mutate({ postId: post.id, content: editContent })}
                disabled={updatePost.isPending}
                className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold"
              >
                {updatePost.isPending ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setIsEditing(false)} className="px-4 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-semibold">Cancel</button>
            </div>
          </div>
        ) : (() => {
          const eventLinkMatch = post.content?.match(/^([\s\S]*?) → (\/events\/(\d+))$/);
          if (eventLinkMatch) {
            return (
              <>
                <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap mb-3">{eventLinkMatch[1]}</p>
                <Link href={eventLinkMatch[2]}>
                  <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold shadow-md hover:opacity-90 transition cursor-pointer mb-4">
                    Join the fun 🎟️
                  </span>
                </Link>
              </>
            );
          }
          return <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap mb-4">{post.content}</p>;
        })()}

        {/* Media */}
        {post.mediaUrl && (
          <motion.div whileHover={{ scale: 1.01 }} className="rounded-xl overflow-hidden mb-4 shadow-md cursor-pointer" onClick={() => setFullscreenImage(post.mediaUrl)}>
            <img src={post.mediaUrl} alt="" className="w-full object-cover max-h-96" />
          </motion.div>
        )}

        {/* Fullscreen Image Overlay */}
        <AnimatePresence>
          {fullscreenImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 cursor-pointer"
              onClick={() => setFullscreenImage(null)}
            >
              <img src={fullscreenImage} alt="fullscreen" className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl" />
              <button onClick={() => setFullscreenImage(null)} className="absolute top-4 right-4 text-white bg-black/40 rounded-full p-2">
                <X className="h-6 w-6" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Badges */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {post.isPinned && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100/50 rounded-full text-xs font-semibold text-amber-700 border border-amber-200/50">
              <Pin className="h-3 w-3" /> Pinned
            </span>
          )}
          {communityInfo && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100/50 rounded-full text-xs font-semibold text-purple-700 border border-purple-200/50">
              {communityInfo.emoji} {communityInfo.name}
            </span>
          )}
          {post.visibility === "public" && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100/50 rounded-full text-xs font-semibold text-blue-700 border border-blue-200/50">
              <Globe className="h-3 w-3" /> Public
            </span>
          )}
        </div>

        {/* Engagement Stats */}
        {(localLikes > 0 || (post.commentsCount || 0) > 0) && (
          <div className="flex items-center justify-between text-xs text-gray-400 mb-3 px-1">
            {localLikes > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-4 h-4 rounded-full bg-gradient-to-r from-pink-500 to-red-500 flex items-center justify-center">
                  <Heart className="h-2.5 w-2.5 text-white fill-white" />
                </span>
                {localLikes} {localLikes === 1 ? "love" : "loves"}
              </span>
            )}
            {(post.commentsCount || 0) > 0 && (
              <span className="flex items-center gap-1">
                <MessageCircle className="h-3 w-3" /> {post.commentsCount} {post.commentsCount === 1 ? "comment" : "comments"}
              </span>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-1 pt-3 border-t border-pink-50">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.85 }}
            onClick={() => likePost.mutate({ postId: post.id })}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              localLiked
                ? "text-pink-500 bg-pink-50"
                : "text-gray-400 hover:bg-pink-50/50 hover:text-pink-400"
            }`}
          >
            <motion.div animate={localLiked ? { scale: [1, 1.4, 1] } : {}} transition={{ duration: 0.3 }}>
              <Heart className={`h-5 w-5 ${localLiked ? "fill-pink-500" : ""}`} />
            </motion.div>
            Love
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.85 }}
            onClick={() => setShowComments(!showComments)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              showComments
                ? "text-purple-500 bg-purple-50"
                : "text-gray-400 hover:bg-purple-50/50 hover:text-purple-400"
            }`}
          >
            <MessageCircle className="h-5 w-5" />
            Comment
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.85 }}
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:bg-blue-50/50 hover:text-blue-400 transition-all cursor-pointer"
          >
            <Share2 className="h-5 w-5" />
            Share
          </motion.button>
        </div>
      </div>

      {/* Comments Section */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <CommentsSection postId={post.id} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── COMMENTS SECTION ──────────────────────────────────────────────────────
function CommentsSection({ postId }: { postId: number }) {
  const { data: comments, isLoading } = trpc.wall.comments.useQuery({ postId });
  const utils = trpc.useUtils();
  const [text, setText] = useState("");

  const addComment = trpc.wall.addComment.useMutation({
    onSuccess: () => {
      setText("");
      utils.wall.comments.invalidate({ postId });
      utils.wall.posts.invalidate();
    },
  });

  const getAvatarGradient = (authorId: number | null) => {
    const colors = ["from-pink-400 to-rose-500","from-purple-400 to-pink-500","from-blue-400 to-purple-500","from-cyan-400 to-blue-500","from-orange-400 to-pink-500","from-rose-400 to-orange-500"];
    if (!authorId) return "from-gray-300 to-gray-400";
    return colors[authorId % colors.length];
  };

  return (
    <div className="bg-pink-50/30 px-5 py-4 space-y-3 border-t border-pink-50">
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-pink-300" />
        </div>
      ) : comments && comments.length > 0 ? (
        comments.map((c: any, i: number) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            className="flex gap-2.5"
          >
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getAvatarGradient(c.authorId)} flex items-center justify-center shrink-0 shadow-sm overflow-hidden`}>
              {c.resolvedAvatarUrl ? (
                <img src={c.resolvedAvatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] font-black text-white">{(c.resolvedAuthorName ?? "M").charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="glass-strong rounded-xl px-3.5 py-2.5 flex-1 border border-pink-100/30">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-xs font-bold text-gray-700">{c.resolvedAuthorName ?? "Member"}</p>
                <span className="text-[10px] text-gray-300">
                  {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                </span>
              </div>
              <p className="text-sm text-gray-600">{c.content}</p>
            </div>
          </motion.div>
        ))
      ) : (
        <p className="text-xs text-gray-400 text-center py-2">No comments yet — be the first!</p>
      )}

      {/* Comment Input */}
      <div className="flex gap-2 pt-1">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Write a comment..."
          className="flex-1 px-3.5 py-2.5 rounded-xl border border-pink-100 bg-white/70 text-sm outline-none focus:border-pink-300 focus:ring-1 focus:ring-pink-200/50 placeholder:text-gray-300"
          onKeyDown={e => e.key === "Enter" && text.trim() && addComment.mutate({ postId, content: text })}
        />
        <motion.div whileTap={{ scale: 0.9 }}>
          <Button
            onClick={() => text.trim() && addComment.mutate({ postId, content: text })}
            disabled={!text.trim() || addComment.isPending}
            size="sm"
            className="bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl shadow-md"
          >
            {addComment.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}

// ─── MAIN WALL PAGE ────────────────────────────────────────────────────────
export default function Wall() {
  const { user, isAuthenticated } = useAuth();
  const { isApprovedMember } = useProfileStatus();
  const [, navigate] = useLocation();
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"latest" | "popular">("latest");
  const [profilePreview, setProfilePreview] = useState<{ userId: number; displayName: string; avatarUrl?: string | null } | null>(null);

  const createConversation = trpc.messages.createConversation.useMutation({
    onSuccess: () => {
      setProfilePreview(null);
      navigate("/messages");
    },
    onError: (e) => toast.error(e.message),
  });

  function handleAuthorClick(authorId: number, displayName: string, avatarUrl?: string | null) {
    setProfilePreview({ userId: authorId, displayName, avatarUrl });
  }

  function handleSendMessage(userId: number, displayName: string) {
    createConversation.mutate({ participantIds: [userId] });
  }

  function handleViewProfile(userId: number) {
    setProfilePreview(null);
    navigate(`/u/${userId}`);
  }

  const [postLimit, setPostLimit] = useState(20);
  const { data: posts, isLoading } = trpc.wall.posts.useQuery(
    { communityId: selectedFilter || undefined, limit: postLimit },
    { enabled: isAuthenticated, retry: false, staleTime: 15_000, refetchOnWindowFocus: false }
  );

  const { data: myLikes } = trpc.wall.myLikes.useQuery(undefined, {
    enabled: isAuthenticated, retry: false, staleTime: 15_000, refetchOnWindowFocus: false,
  });

  if (!isApprovedMember) {
    return (
      <PageWrapper withPadding={false}>
        <CommunityTeaser />
      </PageWrapper>
    );
  }

  // Sort posts
  const sortedPosts = posts ? [...posts].sort((a, b) => {
    if (sortBy === "popular") {
      return (b.likesCount || 0) - (a.likesCount || 0);
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }) : [];

  return (
    <PageWrapper>
      <div className="container px-4 py-6 sm:py-8 max-w-2xl mx-auto">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 via-fuchsia-500 to-pink-500 p-6 mb-6"
        >
          <FloatingBubbles count={4} />
          <div className="relative z-10 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
              <Flame className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-black text-white">Community Wall</h1>
              <p className="text-white/70 text-sm">Share, connect, and vibe with the community</p>
            </div>
          </div>
          <div className="relative z-10 flex gap-3 mt-4 flex-wrap">
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-white/15 backdrop-blur-sm rounded-full text-white text-xs font-bold border border-white/20">
              <TrendingUp className="h-3 w-3" /> Trending
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-white/15 backdrop-blur-sm rounded-full text-white text-xs font-bold border border-white/20">
              <Users className="h-3 w-3" /> {posts?.length || 0} Posts
            </span>
          </div>
        </motion.div>

        {/* Post Composer */}
        <PostComposer user={user} />

        {/* Filter Tabs */}
        {isLoading ? null : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6"
          >
            <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedFilter(null)}
                className={`px-4 py-2 rounded-full font-semibold text-sm whitespace-nowrap transition-all ${
                  selectedFilter === null
                    ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-200/30"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                All
              </motion.button>
              {COMMUNITIES.map(c => (
                <motion.button
                  key={c.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedFilter(c.id)}
                  className={`px-4 py-2 rounded-full font-semibold text-sm whitespace-nowrap transition-all ${
                    selectedFilter === c.id
                      ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-200/30"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {c.emoji} {c.name}
                </motion.button>
              ))}
            </div>

            {/* Sort Options */}
            <div className="flex items-center justify-between">
              <div />
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-semibold">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-1.5 rounded-lg border border-pink-200 bg-white text-xs outline-none focus:ring-2 focus:ring-pink-200/50 font-semibold"
                >
                  <option value="latest">Latest</option>
                  <option value="popular">Popular</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}

        {/* Posts Feed */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
              <Loader2 className="h-8 w-8 text-pink-400" />
            </motion.div>
            <p className="text-sm text-gray-400">Loading the feed...</p>
          </div>
        ) : !sortedPosts || sortedPosts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16"
          >
            <motion.div
              animate={{ y: [0, -8, 0], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="inline-flex w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-100 to-purple-100 items-center justify-center mb-4"
            >
              <Sparkles className="h-10 w-10 text-pink-400" />
            </motion.div>
            <h3 className="font-display text-xl font-bold text-gray-600 mb-2">No posts yet</h3>
            <p className="text-gray-400 text-sm">
              {selectedFilter ? `Be the first to share in this community!` : `Be the first to share something with the community!`}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {sortedPosts.map((post: any, i: number) => (
                <PostCard
                  key={post.id}
                  post={post}
                  isLiked={myLikes?.includes(post.id) ?? false}
                  index={i}
                  onAuthorClick={handleAuthorClick}
                  currentUserId={user?.id}
                />
              ))}
            </AnimatePresence>
            {posts && posts.length >= postLimit && (
              <motion.div className="flex justify-center mt-6">
                <Button
                  variant="outline"
                  onClick={() => setPostLimit(p => p + 20)}
                  className="rounded-xl border-pink-200 text-pink-600 hover:bg-pink-50 gap-2"
                >
                  <ChevronDown className="h-4 w-4" /> Load More
                </Button>
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Profile Preview Modal */}
      {profilePreview && (
        <UserProfilePreview
          userId={profilePreview.userId}
          displayName={profilePreview.displayName}
          avatarUrl={profilePreview.avatarUrl}
          onClose={() => setProfilePreview(null)}
          onSendMessage={handleSendMessage}
          onViewProfile={handleViewProfile}
        />
      )}
    </PageWrapper>
  );
}
