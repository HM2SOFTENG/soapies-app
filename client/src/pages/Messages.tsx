import PageWrapper from "@/components/PageWrapper";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle, Send, Loader2, ArrowLeft, Plus, Shield,
  Sparkles, Search, Phone, Video, MoreVertical, Smile, Image as ImageIcon,
  Check, CheckCheck, Circle
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { getLoginUrl } from "@/const";
import { FloatingBubbles } from "@/components/FloatingElements";

// ─── CONVERSATION LIST ─────────────────────────────────────────────────────
function ConversationList({ conversations, isLoading, onSelect }: {
  conversations: any[] | undefined; isLoading: boolean; onSelect: (id: number) => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = conversations?.filter((c: any) =>
    !search || (c.name || `Chat #${c.id}`).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-pink-50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-black text-gray-800">Messages</h2>
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button
              size="sm"
              onClick={() => toast("Feature coming soon!", { icon: "🚀" })}
              className="bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl gap-1.5 shadow-lg shadow-pink-200/30"
            >
              <Plus className="h-4 w-4" /> New Chat
            </Button>
          </motion.div>
        </div>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-pink-100 bg-white/50 text-sm outline-none focus:border-pink-300 focus:ring-1 focus:ring-pink-200/50 placeholder:text-gray-300"
          />
        </div>
      </div>

      {/* Conversation Items */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-pink-400" />
            <p className="text-sm text-gray-400">Loading chats...</p>
          </div>
        ) : !filtered || filtered.length === 0 ? (
          <div className="text-center py-20 px-6">
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-100 to-purple-100 items-center justify-center mb-4"
            >
              <MessageCircle className="h-8 w-8 text-pink-400" />
            </motion.div>
            <h3 className="font-display text-lg font-bold text-gray-600 mb-2">No conversations yet</h3>
            <p className="text-gray-400 text-sm">Start chatting with community members!</p>
          </div>
        ) : (
          <div>
            {filtered.map((conv: any, i: number) => (
              <motion.div
                key={conv.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                whileHover={{ backgroundColor: "rgba(236, 72, 153, 0.04)" }}
                onClick={() => onSelect(conv.id)}
                className="flex items-center gap-3 px-4 sm:px-5 py-4 cursor-pointer border-b border-pink-50/50 transition-colors"
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-300 to-purple-400 flex items-center justify-center shadow-md">
                    <MessageCircle className="h-5 w-5 text-white" />
                  </div>
                  {/* Online indicator */}
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-sm font-bold text-gray-800 truncate">{conv.name || `Chat #${conv.id}`}</p>
                    <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">
                      {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: false })}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 truncate">
                    {conv.type === "dm" ? "Direct Message" : conv.type === "group" ? "Group Chat" : conv.type}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── CHAT VIEW ─────────────────────────────────────────────────────────────
function ChatView({ conversationId, userId, onBack }: {
  conversationId: number; userId: number; onBack: () => void;
}) {
  const { data: msgs, isLoading } = trpc.messages.messages.useQuery(
    { conversationId },
    { refetchInterval: 5000, staleTime: 3000 }
  );
  const utils = trpc.useUtils();
  const [text, setText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sendMsg = trpc.messages.send.useMutation({
    onSuccess: () => {
      setText("");
      utils.messages.messages.invalidate({ conversationId });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col h-full"
    >
      {/* Chat Header */}
      <div className="px-4 sm:px-5 py-3 border-b border-pink-50 flex items-center gap-3 glass-strong">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onBack}
          className="p-2 rounded-xl hover:bg-pink-50 text-gray-500 cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5" />
        </motion.button>
        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center shadow-md">
            <MessageCircle className="h-4 w-4 text-white" />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-display font-bold text-gray-800 text-sm">Chat #{conversationId}</h3>
          <p className="text-[10px] text-emerald-500 font-semibold">Online</p>
        </div>
        <div className="flex items-center gap-1">
          {[Phone, Video, MoreVertical].map((Icon, i) => (
            <motion.button
              key={i}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => toast("Feature coming soon!", { icon: "🚀" })}
              className="p-2 rounded-xl hover:bg-pink-50 text-gray-400 cursor-pointer"
            >
              <Icon className="h-4 w-4" />
            </motion.button>
          ))}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-3 bg-gradient-to-b from-pink-50/30 to-transparent">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-pink-300" />
            <p className="text-xs text-gray-400">Loading messages...</p>
          </div>
        ) : msgs && msgs.length > 0 ? (
          msgs.map((msg: any, i: number) => {
            const isMine = msg.senderId === userId;
            const showTime = i === 0 || (
              new Date(msg.createdAt).getTime() - new Date(msgs[i - 1].createdAt).getTime() > 300000
            );
            return (
              <div key={msg.id}>
                {showTime && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center text-[10px] text-gray-300 font-medium my-4"
                  >
                    {format(new Date(msg.createdAt), "MMM d, h:mm a")}
                  </motion.p>
                )}
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: i * 0.02, type: "spring", stiffness: 300 }}
                  className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[80%] sm:max-w-[70%] relative group ${isMine ? "order-1" : ""}`}>
                    <div className={`px-4 py-3 text-sm leading-relaxed ${
                      isMine
                        ? "bg-gradient-to-br from-pink-500 to-purple-600 text-white rounded-2xl rounded-br-md shadow-lg shadow-pink-200/30"
                        : "glass-strong border border-pink-100/50 text-gray-700 rounded-2xl rounded-bl-md"
                    }`}>
                      {msg.content}
                    </div>
                    <div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>
                      <span className="text-[10px] text-gray-300">
                        {format(new Date(msg.createdAt), "h:mm a")}
                      </span>
                      {isMine && (
                        <CheckCheck className="h-3 w-3 text-pink-300" />
                      )}
                    </div>
                  </div>
                </motion.div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-16">
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="inline-flex w-14 h-14 rounded-2xl bg-pink-50 items-center justify-center mb-3"
            >
              <Sparkles className="h-7 w-7 text-pink-300" />
            </motion.div>
            <p className="text-sm text-gray-400 font-medium">No messages yet</p>
            <p className="text-xs text-gray-300">Say hi and start the conversation!</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="px-4 sm:px-5 py-3 border-t border-pink-50 glass-strong">
        <div className="flex items-end gap-2">
          <div className="flex gap-1">
            {[ImageIcon, Smile].map((Icon, i) => (
              <motion.button
                key={i}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => toast("Feature coming soon!", { icon: "🚀" })}
                className="p-2 rounded-xl hover:bg-pink-50 text-gray-400 cursor-pointer"
              >
                <Icon className="h-5 w-5" />
              </motion.button>
            ))}
          </div>
          <div className="flex-1 relative">
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Type a message..."
              className="w-full px-4 py-3 rounded-xl border border-pink-100 bg-white/70 text-sm outline-none focus:border-pink-300 focus:ring-1 focus:ring-pink-200/50 placeholder:text-gray-300 pr-12"
              onKeyDown={e => e.key === "Enter" && text.trim() && sendMsg.mutate({ conversationId, content: text })}
            />
          </div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.9 }}>
            <Button
              onClick={() => text.trim() && sendMsg.mutate({ conversationId, content: text })}
              disabled={!text.trim() || sendMsg.isPending}
              className="bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl shadow-lg shadow-pink-200/30 h-11 w-11 p-0"
            >
              {sendMsg.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── MAIN MESSAGES PAGE ────────────────────────────────────────────────────
export default function Messages() {
  const { user, isAuthenticated } = useAuth();
  const [selectedConv, setSelectedConv] = useState<number | null>(null);
  const { data: conversations, isLoading } = trpc.messages.conversations.useQuery(undefined, {
    enabled: isAuthenticated, retry: false, staleTime: 15_000, refetchOnWindowFocus: false,
  });

  if (!isAuthenticated) {
    return (
      <PageWrapper>
        <div className="container px-4 py-20 text-center max-w-md mx-auto">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}
            className="inline-flex w-20 h-20 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 items-center justify-center mb-6">
            <Shield className="h-10 w-10 text-pink-400" />
          </motion.div>
          <h2 className="font-display text-2xl font-bold text-gray-700 mb-3">Private Messages</h2>
          <p className="text-gray-400 text-sm mb-6">Sign in to chat privately with community members.</p>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button onClick={() => window.location.href = getLoginUrl()}
              className="bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl px-8 py-3 shadow-xl gap-2">
              <Sparkles className="h-4 w-4" /> Sign In
            </Button>
          </motion.div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="container px-4 py-6 sm:py-8 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-strong rounded-3xl border border-pink-100/50 overflow-hidden shadow-xl shadow-pink-50/30"
          style={{ height: "calc(100vh - 10rem)", minHeight: "500px" }}
        >
          <AnimatePresence mode="wait">
            {selectedConv ? (
              <ChatView
                key={selectedConv}
                conversationId={selectedConv}
                userId={user!.id}
                onBack={() => setSelectedConv(null)}
              />
            ) : (
              <ConversationList
                key="list"
                conversations={conversations}
                isLoading={isLoading}
                onSelect={setSelectedConv}
              />
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </PageWrapper>
  );
}
