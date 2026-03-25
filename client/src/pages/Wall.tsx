import PageWrapper from "@/components/PageWrapper";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, MessageCircle, Send, Loader2, Sparkles, Image as ImageIcon,
  Shield, MoreHorizontal, Smile, Flame, TrendingUp, Users
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { getLoginUrl } from "@/const";
import { FloatingBubbles, GlowOrb } from "@/components/FloatingElements";
import CommunityTeaser from "@/components/CommunityTeaser";

// ─── POST COMPOSER ─────────────────────────────────────────────────────────
function PostComposer({ user }: { user: any }) {
  const [content, setContent] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const utils = trpc.useUtils();

  const createPost = trpc.wall.create.useMutation({
    onSuccess: () => {
      setContent("");
      setIsFocused(false);
      utils.wall.posts.invalidate();
      toast.success("Posted!", { icon: "🎉" });
    },
    onError: (e) => toast.error(e.message),
  });

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
              value={content}
              onChange={e => setContent(e.target.value)}
              onFocus={() => setIsFocused(true)}
              placeholder="Share your vibe with the community... ✨"
              rows={isFocused ? 4 : 2}
              className="w-full px-4 py-3 rounded-xl border border-pink-100 bg-white/50 focus:border-pink-300 focus:ring-2 focus:ring-pink-200/50 outline-none transition-all text-sm resize-none placeholder:text-gray-300"
            />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {(isFocused || content.trim()) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-5 pb-4 flex items-center justify-between border-t border-pink-50 pt-3"
          >
            <div className="flex items-center gap-1">
              {[
                { icon: ImageIcon, label: "Photo" },
                { icon: Smile, label: "Emoji" },
              ].map(btn => (
                <motion.button
                  key={btn.label}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => toast("Feature coming soon!", { icon: "🚀" })}
                  className="p-2 rounded-lg hover:bg-pink-50 text-gray-400 hover:text-pink-500 transition-colors cursor-pointer"
                >
                  <btn.icon className="h-5 w-5" />
                </motion.button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-300">{content.length}/500</span>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  onClick={() => content.trim() && createPost.mutate({ content })}
                  disabled={!content.trim() || createPost.isPending}
                  className="bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl gap-2 px-5 shadow-lg shadow-pink-200/30"
                  size="sm"
                >
                  {createPost.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
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
function PostCard({ post, isLiked, index }: { post: any; isLiked: boolean; index: number }) {
  const [showComments, setShowComments] = useState(false);
  const [localLiked, setLocalLiked] = useState(isLiked);
  const [localLikes, setLocalLikes] = useState(post.likesCount || 0);
  const utils = trpc.useUtils();

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.06, type: "spring", stiffness: 200 }}
      className="glass-strong rounded-2xl border border-pink-100/50 overflow-hidden hover:shadow-lg hover:shadow-pink-100/20 transition-all"
    >
      <div className="p-5">
        {/* Author Header */}
        <div className="flex items-center gap-3 mb-4">
          <motion.div
            whileHover={{ scale: 1.1 }}
            className="w-11 h-11 rounded-xl bg-gradient-to-br from-pink-300 to-purple-400 flex items-center justify-center shadow-md"
          >
            <span className="text-sm font-black text-white">
              {String.fromCharCode(65 + ((post.authorId || 0) % 26))}
            </span>
          </motion.div>
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-800">Soapie #{post.authorId}</p>
            <p className="text-xs text-gray-400">{timeAgo}</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            className="p-1.5 rounded-lg hover:bg-pink-50 text-gray-300 cursor-pointer"
          >
            <MoreHorizontal className="h-4 w-4" />
          </motion.button>
        </div>

        {/* Content */}
        <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap mb-4">{post.content}</p>

        {/* Media */}
        {post.mediaUrl && (
          <motion.div whileHover={{ scale: 1.01 }} className="rounded-xl overflow-hidden mb-4 shadow-md">
            <img src={post.mediaUrl} alt="" className="w-full object-cover max-h-96" />
          </motion.div>
        )}

        {/* Engagement Stats */}
        {(localLikes > 0 || (post.commentsCount || 0) > 0) && (
          <div className="flex items-center justify-between text-xs text-gray-400 mb-3 px-1">
            {localLikes > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-4 h-4 rounded-full bg-gradient-to-r from-pink-500 to-red-500 flex items-center justify-center">
                  <Heart className="h-2.5 w-2.5 text-white fill-white" />
                </span>
                {localLikes}
              </span>
            )}
            {(post.commentsCount || 0) > 0 && (
              <span>{post.commentsCount} comment{post.commentsCount > 1 ? "s" : ""}</span>
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
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-200 to-purple-300 flex items-center justify-center shrink-0 shadow-sm">
              <span className="text-[10px] font-black text-white">
                {String.fromCharCode(65 + ((c.authorId || 0) % 26))}
              </span>
            </div>
            <div className="glass-strong rounded-xl px-3.5 py-2.5 flex-1 border border-pink-100/30">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-xs font-bold text-gray-700">Soapie #{c.authorId}</p>
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
            {addComment.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}

// ─── MAIN WALL PAGE ────────────────────────────────────────────────────────
export default function Wall() {
  const { user, isAuthenticated } = useAuth();
  const { data: posts, isLoading } = trpc.wall.posts.useQuery({}, {
    enabled: isAuthenticated, retry: false, staleTime: 15_000, refetchOnWindowFocus: false,
  });
  const { data: myLikes } = trpc.wall.myLikes.useQuery(undefined, {
    enabled: isAuthenticated, retry: false, staleTime: 15_000, refetchOnWindowFocus: false,
  });

  if (!isAuthenticated) {
    return (
      <PageWrapper withPadding={false}>
        <CommunityTeaser />
      </PageWrapper>
    );
  }

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
              <p className="text-white/70 text-sm">Share, connect, and vibe with fellow Soapies</p>
            </div>
          </div>
          <div className="relative z-10 flex gap-3 mt-4">
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

        {/* Posts Feed */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
              <Loader2 className="h-8 w-8 text-pink-400" />
            </motion.div>
            <p className="text-sm text-gray-400">Loading the feed...</p>
          </div>
        ) : !posts || posts.length === 0 ? (
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
            <p className="text-gray-400 text-sm">Be the first to share something with the community!</p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {posts.map((post: any, i: number) => (
                <PostCard
                  key={post.id}
                  post={post}
                  isLiked={myLikes?.includes(post.id) ?? false}
                  index={i}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
