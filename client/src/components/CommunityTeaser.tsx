import { motion } from "framer-motion";
import { Lock, Heart, MessageCircle, Image as ImageIcon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FloatingBubbles } from "@/components/FloatingElements";
import { useLocation } from "wouter";

// Fake post data generator
const FAKE_POSTS = [
  {
    id: 1,
    initials: "SM",
    username: "Soapie Member",
    likes: 234,
    comments: 18,
    hasImage: true,
    avatarGradient: "from-pink-400 to-rose-500",
  },
  {
    id: 2,
    initials: "PL",
    username: "Party Lover",
    likes: 567,
    comments: 42,
    hasImage: false,
    avatarGradient: "from-purple-400 to-pink-500",
  },
  {
    id: 3,
    initials: "CC",
    username: "Community Champion",
    likes: 891,
    comments: 73,
    hasImage: true,
    avatarGradient: "from-blue-400 to-purple-500",
  },
  {
    id: 4,
    initials: "DJ",
    username: "DJ Fantastic",
    likes: 445,
    comments: 31,
    hasImage: false,
    avatarGradient: "from-orange-400 to-pink-500",
  },
  {
    id: 5,
    initials: "SG",
    username: "Social Guru",
    likes: 712,
    comments: 56,
    hasImage: true,
    avatarGradient: "from-cyan-400 to-blue-500",
  },
  {
    id: 6,
    initials: "FM",
    username: "Fun Maker",
    likes: 328,
    comments: 25,
    hasImage: false,
    avatarGradient: "from-rose-400 to-orange-500",
  },
];

interface FakePostCardProps {
  post: (typeof FAKE_POSTS)[number];
  index: number;
}

const FakePostCard = ({ post, index }: FakePostCardProps) => {
  const timeLabels = ["just now", "2m ago", "15m ago", "1h ago", "3h ago", "6h ago"];
  return (
    <div className="glass-strong rounded-2xl border border-pink-100/50 overflow-hidden">
      <div className="p-5">
        {/* Author Header */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`w-11 h-11 rounded-xl bg-gradient-to-br ${post.avatarGradient} flex items-center justify-center text-white text-sm font-black flex-shrink-0 shadow-md`}
          >
            {post.initials}
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-800">{post.username}</p>
            <p className="text-xs text-gray-400">{timeLabels[index] || "2h ago"}</p>
          </div>
        </div>

        {/* Blurred text content — mimics real post text */}
        <div className="mb-3 select-none" aria-hidden>
          <div className="space-y-2 blur-sm">
            <div className="h-3.5 bg-gray-200 rounded-full w-full" />
            <div className="h-3.5 bg-gray-200 rounded-full w-5/6" />
            {index % 2 === 0 && <div className="h-3.5 bg-gray-200 rounded-full w-3/4" />}
          </div>
        </div>

        {/* Image placeholder */}
        {post.hasImage && (
          <div className="mb-3 w-full h-36 bg-gradient-to-br from-pink-100 to-purple-100 rounded-xl flex items-center justify-center blur-sm">
            <ImageIcon className="w-10 h-10 text-pink-300" />
          </div>
        )}

        {/* Engagement stats */}
        <div className="flex items-center justify-between text-xs text-gray-400 mb-3 px-1">
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 rounded-full bg-gradient-to-r from-pink-500 to-red-500 flex items-center justify-center">
              <Heart className="h-2.5 w-2.5 text-white fill-white" />
            </span>
            {post.likes}
          </span>
          <span>{post.comments} comments</span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 pt-3 border-t border-pink-50">
          <div className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-gray-400">
            <Heart className="h-5 w-5" /> Love
          </div>
          <div className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-gray-400">
            <MessageCircle className="h-5 w-5" /> Comment
          </div>
        </div>
      </div>
    </div>
  );
};

export default function CommunityTeaser() {
  const [, navigate] = useLocation();

  return (
    <div className="relative w-full min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 overflow-hidden">
      {/* Blurred fake feed scrolling in background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ y: [0, -200] }}
          transition={{ duration: 20, repeat: Infinity, repeatType: "reverse", ease: "linear" }}
          className="max-w-2xl mx-auto px-4 pt-24 blur-[6px] opacity-60"
        >
          <div className="space-y-4">
            {FAKE_POSTS.map((post, index) => (
              <FakePostCard key={post.id} post={post} index={index} />
            ))}
            {/* Duplicate first few for seamless scroll */}
            {FAKE_POSTS.slice(0, 3).map((post, index) => (
              <FakePostCard key={`dup-${post.id}`} post={post} index={index + 6} />
            ))}
          </div>
        </motion.div>
      </div>

      {/* Gradient overlay to fade edges */}
      <div className="absolute inset-0 bg-gradient-to-b from-pink-50/80 via-transparent to-white/90 pointer-events-none" />

      {/* CTA Overlay */}
      <div className="relative min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 120, damping: 20, delay: 0.2 }}
          className="relative z-10 max-w-[280px] w-full"
        >
          {/* Glassmorphism card */}
          <div className="backdrop-blur-xl bg-white/85 rounded-2xl px-6 py-6 shadow-2xl shadow-pink-200/30 border border-pink-100/30">
            {/* Lock icon */}
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="flex justify-center mb-3"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-pink-200/40">
                <Lock className="w-5 h-5 text-white" />
              </div>
            </motion.div>

            {/* Heading */}
            <h2 className="font-display text-lg font-black text-center mb-1 text-gradient">
              Join the Conversation
            </h2>

            {/* Subtext */}
            <p className="text-center text-gray-500 mb-4 text-xs leading-relaxed">
              Sign in or join to connect with the Soapies community
            </p>

            {/* Buttons */}
            <div className="flex flex-col gap-2">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  size="sm"
                  className="w-full btn-premium rounded-lg py-2.5 gap-1.5 font-bold text-sm"
                  onClick={() => navigate("/join")}
                >
                  <Sparkles className="h-3.5 w-3.5" /> Apply to Join
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full rounded-lg py-2.5 border-pink-200 text-pink-600 hover:bg-pink-50 font-semibold text-xs"
                  onClick={() => navigate("/login")}
                >
                  Already a member? Sign In
                </Button>
              </motion.div>
            </div>
          </div>

          {/* Subtle gradient background glow */}
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute -inset-4 bg-gradient-to-r from-pink-300/15 via-purple-300/15 to-pink-300/15 rounded-2xl blur-2xl -z-10"
          />
        </motion.div>
      </div>
    </div>
  );
}
