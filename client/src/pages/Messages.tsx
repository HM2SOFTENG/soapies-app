import PageWrapper from "@/components/PageWrapper";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle, Send, Loader2, ArrowLeft, Plus, Shield,
  Sparkles, Search, Phone, Video, MoreVertical, Smile, Image as ImageIcon,
  Check, CheckCheck, Circle, Users, Pin, Lock, X, UserPlus
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { getLoginUrl } from "@/const";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useLocation } from "wouter";

// ─── NEW CHAT MODAL ────────────────────────────────────────────────────────
function NewChatModal({ onClose, onConversationCreated }: {
  onClose: () => void;
  onConversationCreated: (id: number) => void;
}) {
  const [memberSearch, setMemberSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"dm" | "group">("dm");
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<any[]>([]);

  const { data: members, isLoading: membersLoading } = trpc.members.browse.useQuery(
    { page: 0, search: memberSearch },
    { staleTime: 30_000 }
  );

  const createConversation = trpc.messages.createConversation.useMutation({
    onSuccess: (convId: any) => {
      if (convId) {
        onConversationCreated(Number(convId));
        onClose();
      }
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleSelectMember = (member: any) => {
    if (activeTab === "dm") {
      // For DM: immediately create/open conversation with this person
      createConversation.mutate({
        type: "dm",
        participantIds: [member.userId],
      });
    } else {
      // For group: toggle selection
      setSelectedMembers(prev =>
        prev.find(m => m.userId === member.userId)
          ? prev.filter(m => m.userId !== member.userId)
          : [...prev, member]
      );
    }
  };

  const handleCreateGroup = () => {
    if (selectedMembers.length === 0) {
      toast.error("Select at least one member");
      return;
    }
    createConversation.mutate({
      type: "group",
      name: groupName || `Group Chat`,
      participantIds: selectedMembers.map(m => m.userId),
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-pink-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-pink-500" />
            <h3 className="font-display text-lg font-bold text-gray-800">New Conversation</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-pink-50 text-gray-400">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-pink-50">
          {(["dm", "group"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setSelectedMembers([]); }}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                activeTab === tab
                  ? "text-pink-600 border-b-2 border-pink-500"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {tab === "dm" ? "Direct Message" : "Group Chat"}
            </button>
          ))}
        </div>

        {/* Group name input */}
        {activeTab === "group" && (
          <div className="px-4 pt-3">
            <input
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              placeholder="Group name (optional)"
              className="w-full px-4 py-2.5 rounded-xl border border-pink-100 bg-pink-50/30 text-sm outline-none focus:border-pink-300 placeholder:text-gray-300"
            />
          </div>
        )}

        {/* Search */}
        <div className="px-4 pt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
            <input
              value={memberSearch}
              onChange={e => setMemberSearch(e.target.value)}
              placeholder="Search members..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-pink-100 bg-pink-50/30 text-sm outline-none focus:border-pink-300 placeholder:text-gray-300"
            />
          </div>
        </div>

        {/* Selected members chips (group mode) */}
        {activeTab === "group" && selectedMembers.length > 0 && (
          <div className="px-4 pt-2 flex flex-wrap gap-2">
            {selectedMembers.map(m => (
              <span key={m.userId} className="inline-flex items-center gap-1 bg-pink-100 text-pink-700 rounded-full px-3 py-1 text-xs font-semibold">
                {m.displayName || m.name || "Member"}
                <button onClick={() => setSelectedMembers(prev => prev.filter(x => x.userId !== m.userId))}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Member list */}
        <div className="px-4 py-3 overflow-y-auto max-h-64">
          {membersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-pink-400" />
            </div>
          ) : !members || members.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">No members found</p>
          ) : (
            <div className="space-y-1">
              {members.map((member: any) => {
                const isSelected = selectedMembers.some(m => m.userId === member.userId);
                return (
                  <motion.button
                    key={member.userId}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSelectMember(member)}
                    disabled={createConversation.isPending}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                      isSelected ? "bg-pink-50 border border-pink-200" : "hover:bg-gray-50"
                    }`}
                  >
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-300 to-purple-400 flex items-center justify-center flex-shrink-0 shadow-md">
                      {member.avatarUrl ? (
                        <img src={member.avatarUrl} alt="" className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        <span className="text-white text-sm font-bold">
                          {(member.displayName || member.name || "?").charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {member.displayName || member.name || "Member"}
                      </p>
                      {member.location && (
                        <p className="text-xs text-gray-400 truncate">{member.location}</p>
                      )}
                    </div>
                    {createConversation.isPending && activeTab === "dm" && (
                      <Loader2 className="h-4 w-4 animate-spin text-pink-400" />
                    )}
                    {activeTab === "group" && isSelected && (
                      <Check className="h-4 w-4 text-pink-500" />
                    )}
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>

        {/* Group create button */}
        {activeTab === "group" && (
          <div className="px-4 pb-4">
            <Button
              onClick={handleCreateGroup}
              disabled={createConversation.isPending || selectedMembers.length === 0}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl shadow-lg shadow-pink-200/30"
            >
              {createConversation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Users className="h-4 w-4 mr-2" />
                  Create Group ({selectedMembers.length} member{selectedMembers.length !== 1 ? "s" : ""})
                </>
              )}
            </Button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── CONVERSATION LIST ─────────────────────────────────────────────────────
function ConversationList({ conversations, isLoading, onSelect }: {
  conversations: any[] | undefined; isLoading: boolean; onSelect: (id: number) => void;
}) {
  const [search, setSearch] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);

  const filtered = conversations?.reduce((acc: any, c: any) => {
    if (search && !(c.name || `Chat #${c.id}`).toLowerCase().includes(search.toLowerCase())) {
      return acc;
    }

    const section = c.type === "channel" ? "Channels" : c.type === "group" ? "Groups" : "Direct Messages";
    if (!acc[section]) acc[section] = [];
    acc[section].push(c);
    return acc;
  }, {});

  const sections = ["Channels", "Groups", "Direct Messages"];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-pink-50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-black text-gray-800">Messages</h2>
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button
              size="sm"
              onClick={() => setShowNewChat(true)}
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
        ) : !filtered || Object.keys(filtered).length === 0 ? (
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
            {sections.map(section => {
              const items = filtered[section];
              if (!items || items.length === 0) return null;

              return (
                <div key={section}>
                  {/* Section Header */}
                  <div className="px-4 sm:px-5 py-2.5 bg-gray-50 sticky top-0 z-10">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{section}</p>
                  </div>

                  {/* Items */}
                  {items.map((conv: any, i: number) => (
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
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md ${
                          conv.type === "channel"
                            ? "bg-gradient-to-br from-blue-300 to-blue-500"
                            : "bg-gradient-to-br from-pink-300 to-purple-400"
                        }`}>
                          {conv.type === "channel" ? (
                            <Lock className="h-5 w-5 text-white" />
                          ) : (
                            <MessageCircle className="h-5 w-5 text-white" />
                          )}
                        </div>
                        {/* Online indicator */}
                        {conv.type !== "channel" && (
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white"
                          />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <p className="text-sm font-bold text-gray-800 truncate">{conv.name || `Chat #${conv.id}`}</p>
                            {conv.type === "channel" && <Users className="h-3 w-3 text-gray-400 flex-shrink-0" />}
                          </div>
                          <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">
                            {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: false })}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 truncate">
                          {conv.type === "channel"
                            ? `Channel • ${conv.participantCount || 0} members`
                            : conv.type === "group"
                              ? `Group • ${conv.participantCount || 0} members`
                              : "Direct Message"}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
      {/* New Chat Modal */}
      <AnimatePresence>
        {showNewChat && (
          <NewChatModal
            onClose={() => setShowNewChat(false)}
            onConversationCreated={(id) => {
              setShowNewChat(false);
              onSelect(id);
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── CHAT VIEW ─────────────────────────────────────────────────────────────
function ChatView({ conversationId, userId, onBack }: {
  conversationId: number; userId: number; onBack: () => void;
}) {
  const { data: msgs, isLoading, refetch } = trpc.messages.messages.useQuery(
    { conversationId },
    { refetchInterval: 0, staleTime: Infinity }
  );
  const { data: conversation } = trpc.messages.conversations.useQuery(undefined, {
    staleTime: 15_000,
  });
  const utils = trpc.useUtils();
  const [text, setText] = useState("");
  const [typingUsers, setTypingUsers] = useState<Set<number>>(new Set());
  const [scrolledUp, setScrolledUp] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const { sendMessage, isConnected, subscribe } = useWebSocket();

  // Subscribe to WebSocket messages
  useEffect(() => {
    const unsubscribe = subscribe((msg) => {
      if (msg.type === "new_message" && msg.data?.conversationId === conversationId) {
        refetch();
      } else if (msg.type === "typing_start" && msg.data?.conversationId === conversationId) {
        setTypingUsers(prev => new Set(prev).add(msg.data.userId));
      } else if (msg.type === "typing_stop" && msg.data?.conversationId === conversationId) {
        setTypingUsers(prev => {
          const next = new Set(prev);
          next.delete(msg.data.userId);
          return next;
        });
      }
    });

    return unsubscribe;
  }, [conversationId, subscribe, refetch]);

  // Subscribe to conversation on mount
  useEffect(() => {
    sendMessage("presence_update", { conversationId });

    return () => {
      // Unsubscribe when leaving conversation
    };
  }, [conversationId, sendMessage]);

  const sendMsg = trpc.messages.send.useMutation({
    onSuccess: () => {
      setText("");
      utils.messages.messages.invalidate({ conversationId });
      // Notify via WebSocket
      if (isConnected) {
        sendMessage("typing_stop", { conversationId });
      }
    },
  });

  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollHeight, scrollTop, clientHeight } = messagesContainerRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      setScrolledUp(!isAtBottom);
    }
  };

  useEffect(() => {
    if (!scrolledUp && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [msgs, scrolledUp]);

  const conv = conversation?.find((c: any) => c.id === conversationId);

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
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md ${
            conv?.type === "channel"
              ? "bg-gradient-to-br from-blue-400 to-blue-500"
              : "bg-gradient-to-br from-pink-400 to-purple-500"
          }`}>
            {conv?.type === "channel" ? (
              <Lock className="h-4 w-4 text-white" />
            ) : (
              <MessageCircle className="h-4 w-4 text-white" />
            )}
          </div>
          {conv?.type !== "channel" && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white" />
          )}
        </div>
        <div className="flex-1">
          <h3 className="font-display font-bold text-gray-800 text-sm">{conv?.name || `Chat #${conversationId}`}</h3>
          <p className="text-[10px] text-emerald-500 font-semibold">
            {conv?.type === "channel" ? `Channel • members` : "Online"}
          </p>
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
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-3 bg-gradient-to-b from-pink-50/30 to-transparent"
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-pink-300" />
            <p className="text-xs text-gray-400">Loading messages...</p>
          </div>
        ) : msgs && msgs.length > 0 ? (
          <>
            {scrolledUp && (
              <motion.button
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => {
                  setScrolledUp(false);
                  messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
                }}
                className="sticky top-4 left-1/2 -translate-x-1/2 z-20 bg-white border border-pink-200 text-pink-600 px-4 py-2 rounded-full text-xs font-semibold shadow-md hover:bg-pink-50 transition-colors"
              >
                New messages ↓
              </motion.button>
            )}

            {msgs.map((msg: any, i: number) => {
              const isMine = msg.senderId === userId;
              const showTime = i === 0 || (
                new Date(msg.createdAt).getTime() - new Date(msgs[i - 1].createdAt).getTime() > 300000
              );
              const showSenderName = !isMine && (i === 0 || msgs[i - 1].senderId !== msg.senderId);
              const senderInitial = (msg.senderName || "?").charAt(0).toUpperCase();
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
                    className={`flex items-end gap-2 ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    {/* Sender avatar (others only) */}
                    {!isMine && (
                      <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-pink-300 to-purple-400 flex items-center justify-center shadow-sm mb-1">
                        <span className="text-white text-[10px] font-bold">{senderInitial}</span>
                      </div>
                    )}
                    <div className={`max-w-[75%] sm:max-w-[65%] relative group ${isMine ? "order-1" : ""}`}>
                      {/* Sender name label */}
                      {showSenderName && !isMine && (
                        <p className="text-[10px] text-gray-400 font-semibold mb-1 ml-1">{msg.senderName}</p>
                      )}
                      <div className={`px-4 py-3 text-sm leading-relaxed break-words ${
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
            })}

            {typingUsers.size > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-xs text-gray-400"
              >
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ y: [0, -8, 0] }}
                      transition={{ duration: 0.6, delay: i * 0.1, repeat: Infinity }}
                      className="w-2 h-2 rounded-full bg-gray-400"
                    />
                  ))}
                </div>
                <span>
                  {typingUsers.size === 1 ? "Someone" : "People"} {typingUsers.size === 1 ? "is" : "are"} typing...
                </span>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </>
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
                onClick={() => {
                  if (Icon === ImageIcon) {
                    // Handle image upload
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = "image/*";
                    input.onchange = async (e: any) => {
                      const file = e.target.files[0];
                      if (file) {
                        try {
                          const formData = new FormData();
                          formData.append("file", file);
                          const res = await fetch("/api/upload-photo", {
                            method: "POST",
                            body: file,
                            headers: {
                              "Content-Type": file.type,
                            },
                          });
                          const { url } = await res.json();
                          sendMsg.mutate({
                            conversationId,
                            content: "[Image]",
                            attachmentUrl: url,
                            attachmentType: "image",
                          });
                        } catch (err) {
                          toast.error("Failed to upload image");
                        }
                      }
                    };
                    input.click();
                  } else {
                    toast("Emoji picker coming soon!", { icon: "🚀" });
                  }
                }}
                className="p-2 rounded-xl hover:bg-pink-50 text-gray-400 cursor-pointer"
              >
                <Icon className="h-5 w-5" />
              </motion.button>
            ))}
          </div>
          <div className="flex-1 relative">
            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                // Auto-grow textarea
                if (e.target.parentElement) {
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                }
                // Send typing indicator
                if (isConnected) {
                  sendMessage("typing_start", { conversationId });
                  clearTimeout(typingTimeoutRef.current);
                  typingTimeoutRef.current = setTimeout(() => {
                    sendMessage("typing_stop", { conversationId });
                  }, 2000);
                }
              }}
              placeholder="Type a message..."
              rows={1}
              className="w-full px-4 py-3 rounded-xl border border-pink-100 bg-white/70 text-sm outline-none focus:border-pink-300 focus:ring-1 focus:ring-pink-200/50 placeholder:text-gray-300 resize-none max-h-30"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && text.trim()) {
                  e.preventDefault();
                  sendMsg.mutate({ conversationId, content: text });
                }
              }}
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
      <div className="container px-4 py-6 sm:py-8 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-strong rounded-3xl border border-pink-100/50 overflow-hidden shadow-xl shadow-pink-50/30"
          style={{ height: "calc(100vh - 10rem)", minHeight: "500px" }}
        >
          {/* Desktop split layout */}
          <div className="hidden md:grid grid-cols-[320px_1fr] h-full">
            <ConversationList
              conversations={conversations}
              isLoading={isLoading}
              onSelect={setSelectedConv}
            />
            <div className="border-l border-pink-50">
              {selectedConv ? (
                <ChatView
                  conversationId={selectedConv}
                  userId={user!.id}
                  onBack={() => setSelectedConv(null)}
                />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <motion.div
                      animate={{ y: [0, -8, 0] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-100 to-purple-100 items-center justify-center mb-4"
                    >
                      <MessageCircle className="h-8 w-8 text-pink-400" />
                    </motion.div>
                    <h3 className="font-display text-lg font-bold text-gray-600 mb-2">Select a conversation</h3>
                    <p className="text-gray-400 text-sm">Choose a chat to start messaging</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile single view */}
          <div className="md:hidden h-full">
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
          </div>
        </motion.div>
      </div>
    </PageWrapper>
  );
}
