import { motion } from "framer-motion";
import { Lock, Heart, MessageCircle, Image as ImageIcon } from "lucide-react";
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
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-white rounded-lg p-4 shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className={`w-10 h-10 rounded-full bg-gradient-to-br ${post.avatarGradient} flex items-center justify-center text-white text-sm font-semibold flex-shrink-0`}
        >
          {post.initials}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{post.username}</p>
          <p className="text-xs text-gray-500">2 hours ago</p>
        </div>
      </div>

      {/* Blurred text content */}
      <div className="mb-3">
        <div className="space-y-2 blur-md">
          <div className="h-3 bg-gray-300 rounded w-full"></div>
          <div className="h-3 bg-gray-300 rounded w-5/6"></div>
          <div className="h-3 bg-gray-300 rounded w-4/5"></div>
        </div>
      </div>

      {/* Image placeholder */}
      {post.hasImage && (
        <div className="mb-3 w-full h-32 bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg flex items-center justify-center blur-md">
          <ImageIcon className="w-8 h-8 text-gray-400" />
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center justify-between text-xs text-gray-600 mb-3 px-2 py-1 bg-gray-50 rounded">
        <span>{post.likes} likes</span>
        <span>{post.comments} comments</span>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button className="flex-1 flex items-center justify-center gap-2 py-2 px-3 hover:bg-gray-50 rounded-md transition-colors opacity-60">
          <Heart className="w-4 h-4 text-gray-600" />
          <span className="text-xs text-gray-600">Like</span>
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 py-2 px-3 hover:bg-gray-50 rounded-md transition-colors opacity-60">
          <MessageCircle className="w-4 h-4 text-gray-600" />
          <span className="text-xs text-gray-600">Comment</span>
        </button>
      </div>
    </motion.div>
  );
};

export default function CommunityTeaser() {
  const [, navigate] = useLocation();

  return (
    <div className="relative w-full min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 overflow-hidden">
      {/* Floating background elements */}
      <FloatingBubbles />

      {/* Blurred fake feed container */}
      <div className="pointer-events-none filter blur-lg absolute inset-0">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="space-y-4">
            {FAKE_POSTS.map((post, index) => (
              <FakePostCard key={post.id} post={post} index={index} />
            ))}
          </div>
        </div>
      </div>

      {/* CTA Overlay */}
      <div className="relative h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          className="relative z-10 max-w-md w-full"
        >
          {/* Glassmorphism card */}
          <div className="backdrop-blur-xl bg-white/90 rounded-2xl p-8 shadow-2xl border border-white/20">
            {/* Lock icon */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="flex justify-center mb-6"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center">
                <Lock className="w-8 h-8 text-white" />
              </div>
            </motion.div>

            {/* Heading */}
            <h2 className="font-display text-3xl font-bold text-center mb-3 text-gradient">
              Join the Conversation
            </h2>

            {/* Subtext */}
            <p className="text-center text-gray-600 mb-8 text-sm leading-relaxed">
              Sign in or apply for membership to connect with the Soapies community
            </p>

            {/* Buttons */}
            <div className="flex flex-col gap-3">
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => navigate("/login")}
              >
                Sign In
              </Button>
              <Button
                size="lg"
                className="w-full btn-premium"
                onClick={() => navigate("/join")}
              >
                Join Now
              </Button>
            </div>

            {/* Decorative sparkles */}
            <div className="absolute top-4 right-4 text-pink-300 opacity-40">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="w-5 h-5" />
              </motion.div>
            </div>
            <div className="absolute bottom-4 left-4 text-purple-300 opacity-40">
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="w-5 h-5" />
              </motion.div>
            </div>
          </div>

          {/* Subtle gradient background glow */}
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute -inset-4 bg-gradient-to-r from-pink-300/20 via-purple-300/20 to-pink-300/20 rounded-2xl blur-2xl -z-10"
          />
        </motion.div>
      </div>
    </div>
  );
}
