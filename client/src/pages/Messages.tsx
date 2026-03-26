import PageWrapper from "@/components/PageWrapper";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle, Send, Loader2, ArrowLeft, Plus, Shield,
  Sparkles, Search, Phone, Video, MoreVertical, Smile, Image as ImageIcon,
  Check, CheckCheck, Circle, Users, Pin, Lock, X, UserPlus,
  Reply, Trash2, Flag, Copy, MicOff, Mic, VideoOff, PhoneOff,
  ZoomIn,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { format, formatDistanceToNow, isToday, isYesterday, isSameDay } from "date-fns";
import { getLoginUrl } from "@/const";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useLocation } from "wouter";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";

// ─── REACTION BAR ──────────────────────────────────────────────────────────
const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

function ReactionBar({ onReact }: { onReact: (emoji: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 4 }}
      className="flex items-center gap-1 bg-[var(--card)] rounded-full border border-[var(--border)] shadow-lg px-2 py-1"
    >
      {REACTION_EMOJIS.map(emoji => (
        <button
          key={emoji}
          onClick={() => onReact(emoji)}
          className="text-lg hover:scale-125 transition-transform"
        >
          {emoji}
        </button>
      ))}
    </motion.div>
  );
}

// ─── MESSAGE MENU ──────────────────────────────────────────────────────────
function MessageMenu({
  isMine,
  msg,
  onReply,
  onPin,
  onCopy,
  onDelete,
  onReport,
  onClose,
}: {
  isMine: boolean;
  msg: any;
  onReply: () => void;
  onPin: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onReport: () => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="absolute z-30 bg-[var(--popover)] rounded-2xl shadow-xl border border-pink-50 py-1 min-w-[160px]"
      style={isMine ? { right: 0, bottom: "100%" } : { left: 0, bottom: "100%" }}
    >
      <button onClick={() => { onReply(); onClose(); }} className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-[var(--foreground)] hover:bg-[var(--accent)]">
        <Reply className="h-4 w-4 text-[var(--muted-foreground)]" /> Reply
      </button>
      <button onClick={() => { onCopy(); onClose(); }} className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-[var(--foreground)] hover:bg-[var(--accent)]">
        <Copy className="h-4 w-4 text-[var(--muted-foreground)]" /> Copy
      </button>
      <button onClick={() => { onPin(); onClose(); }} className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-[var(--foreground)] hover:bg-[var(--accent)]">
        <Pin className="h-4 w-4 text-[var(--muted-foreground)]" /> Pin Message
      </button>
      {isMine ? (
        <button onClick={() => { onDelete(); onClose(); }} className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50">
          <Trash2 className="h-4 w-4" /> Delete
        </button>
      ) : (
        <button onClick={() => { onReport(); onClose(); }} className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-orange-500 hover:bg-orange-50">
          <Flag className="h-4 w-4" /> Report
        </button>
      )}
    </motion.div>
  );
}

// ─── IMAGE FULLSCREEN ─────────────────────────────────────────────────────
function ImageFullscreen({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <img src={url} alt="fullscreen" className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl" />
      <button onClick={onClose} className="absolute top-4 right-4 text-white bg-black/40 rounded-full p-2">
        <X className="h-6 w-6" />
      </button>
    </motion.div>
  );
}

// ─── CALL UI ───────────────────────────────────────────────────────────────
function CallUI({
  conversationId,
  convName,
  isVideo,
  userId,
  sendMessage: wsSend,
  onClose,
}: {
  conversationId: number;
  convName: string;
  isVideo: boolean;
  userId: number;
  sendMessage: (type: string, data: any) => void;
  onClose: () => void;
}) {
  const [callState, setCallState] = useState<"calling" | "connected" | "ended">("calling");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function startCall() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: isVideo,
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        const pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });
        pcRef.current = pc;

        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        pc.onicecandidate = (e) => {
          if (e.candidate) {
            wsSend("call_ice", { conversationId, candidate: e.candidate, userId });
          }
        };

        pc.ontrack = (e) => {
          if (remoteVideoRef.current && e.streams[0]) {
            remoteVideoRef.current.srcObject = e.streams[0];
            setCallState("connected");
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        wsSend("call_offer", { conversationId, offer, userId, isVideo });
      } catch (err) {
        console.error("Call setup error:", err);
        toast.error("Could not access camera/microphone");
        onClose();
      }
    }

    startCall();
    // Notify other participant
    wsSend("call_initiated", { conversationId, userId, isVideo });

    return () => {
      cancelled = true;
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      pcRef.current?.close();
    };
  }, []);

  const endCall = () => {
    wsSend("call_ended", { conversationId, userId });
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    pcRef.current?.close();
    setCallState("ended");
    onClose();
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = isMuted; });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = isVideoOff; });
      setIsVideoOff(!isVideoOff);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-900"
    >
      <div className="text-white text-center mb-8">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center mx-auto mb-4 shadow-2xl">
          <span className="text-4xl font-bold">{convName.charAt(0).toUpperCase()}</span>
        </div>
        <h2 className="text-2xl font-bold">{convName}</h2>
        <p className="text-[var(--muted-foreground)] text-sm mt-1">
          {callState === "calling" ? "Calling..." : callState === "connected" ? "Connected" : "Call ended"}
        </p>
      </div>

      {isVideo && (
        <div className="relative w-full max-w-sm aspect-video mb-8">
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover rounded-2xl bg-gray-800" />
          <video ref={localVideoRef} autoPlay playsInline muted className="absolute bottom-2 right-2 w-24 aspect-video object-cover rounded-xl border-2 border-white" />
        </div>
      )}

      <div className="flex items-center gap-4">
        <button
          onClick={toggleMute}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg ${isMuted ? "bg-red-500" : "bg-gray-700"}`}
        >
          {isMuted ? <MicOff className="h-6 w-6 text-white" /> : <Mic className="h-6 w-6 text-white" />}
        </button>

        {isVideo && (
          <button
            onClick={toggleVideo}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg ${isVideoOff ? "bg-red-500" : "bg-gray-700"}`}
          >
            {isVideoOff ? <VideoOff className="h-6 w-6 text-white" /> : <Video className="h-6 w-6 text-white" />}
          </button>
        )}

        <button
          onClick={endCall}
          className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-xl"
        >
          <PhoneOff className="h-7 w-7 text-white" />
        </button>
      </div>
    </motion.div>
  );
}

// ─── DATE DIVIDER ─────────────────────────────────────────────────────────
function DateDivider({ date }: { date: Date }) {
  let label: string;
  if (isToday(date)) label = "Today";
  else if (isYesterday(date)) label = "Yesterday";
  else label = format(date, "MMMM d, yyyy");

  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-pink-100" />
      <span className="text-[10px] text-[var(--muted-foreground)] font-semibold uppercase tracking-wide px-2">{label}</span>
      <div className="flex-1 h-px bg-pink-100" />
    </div>
  );
}

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
      createConversation.mutate({
        type: "dm",
        participantIds: [member.id],
      });
    } else {
      setSelectedMembers(prev =>
        prev.find(m => m.id === member.id)
          ? prev.filter(m => m.id !== member.id)
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
      participantIds: selectedMembers.map(m => m.id),
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
        className="bg-[var(--popover)] rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-pink-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-pink-500" />
            <h3 className="font-display text-lg font-bold text-[var(--foreground)]">New Conversation</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-pink-50 text-[var(--muted-foreground)]">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border)]">
          {(["dm", "group"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setSelectedMembers([]); }}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                activeTab === tab
                  ? "text-pink-600 border-b-2 border-pink-500"
                  : "text-[var(--muted-foreground)] hover:text-[var(--muted-foreground)]"
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
              className="w-full px-4 py-2.5 rounded-xl border border-pink-100 bg-pink-50/30 text-sm outline-none focus:border-pink-300 placeholder:text-[var(--muted-foreground)]"
            />
          </div>
        )}

        {/* Search */}
        <div className="px-4 pt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
            <input
              value={memberSearch}
              onChange={e => setMemberSearch(e.target.value)}
              placeholder="Search members..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-pink-100 bg-pink-50/30 text-sm outline-none focus:border-pink-300 placeholder:text-[var(--muted-foreground)]"
            />
          </div>
        </div>

        {/* Selected members chips (group mode) */}
        {activeTab === "group" && selectedMembers.length > 0 && (
          <div className="px-4 pt-2 flex flex-wrap gap-2">
            {selectedMembers.map(m => (
              <span key={m.id} className="inline-flex items-center gap-1 bg-pink-100 text-pink-700 rounded-full px-3 py-1 text-xs font-semibold">
                {m.displayName || m.name || "Member"}
                <button onClick={() => setSelectedMembers(prev => prev.filter(x => x.id !== m.id))}>
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
            <p className="text-center text-sm text-[var(--muted-foreground)] py-8">No members found</p>
          ) : (
            <div className="space-y-1">
              {members.map((member: any) => {
                const isSelected = selectedMembers.some(m => m.id === member.id);
                return (
                  <motion.button
                    key={member.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSelectMember(member)}
                    disabled={createConversation.isPending}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                      isSelected ? "bg-pink-50 border border-pink-200" : "hover:bg-[var(--accent)]"
                    }`}
                  >
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
                      <p className="text-sm font-semibold text-[var(--foreground)] truncate">
                        {member.displayName || member.name || "Member"}
                      </p>
                      {member.location && (
                        <p className="text-xs text-[var(--muted-foreground)] truncate">{member.location}</p>
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
function ConversationList({ conversations, isLoading, onSelect, unreadCounts }: {
  conversations: any[] | undefined;
  isLoading: boolean;
  onSelect: (id: number) => void;
  unreadCounts: Record<number, number>;
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
      <div className="p-4 sm:p-5 border-b border-[var(--border)]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-black text-[var(--foreground)]">Messages</h2>
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
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-pink-100 bg-[var(--input)] text-sm outline-none focus:border-pink-300 focus:ring-1 focus:ring-pink-200/50 placeholder:text-[var(--muted-foreground)]"
          />
        </div>
      </div>

      {/* Conversation Items */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-pink-400" />
            <p className="text-sm text-[var(--muted-foreground)]">Loading chats...</p>
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
            <h3 className="font-display text-lg font-bold text-[var(--muted-foreground)] mb-2">No conversations yet</h3>
            <p className="text-[var(--muted-foreground)] text-sm">Start chatting with community members!</p>
          </div>
        ) : (
          <div>
            {sections.map(section => {
              const items = filtered[section];
              if (!items || items.length === 0) return null;

              return (
                <div key={section}>
                  <div className="px-4 sm:px-5 py-2.5 bg-[var(--muted)] sticky top-0 z-10">
                    <p className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wide">{section}</p>
                  </div>

                  {items.map((conv: any, i: number) => {
                    const unread = unreadCounts[conv.id] || 0;
                    return (
                      <motion.div
                        key={conv.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        whileHover={{ backgroundColor: "rgba(236, 72, 153, 0.04)" }}
                        onClick={() => onSelect(conv.id)}
                        className="flex items-center gap-3 px-4 sm:px-5 py-4 cursor-pointer border-b border-[var(--border)] transition-colors"
                      >
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
                          {conv.type !== "channel" && (
                            <motion.div
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white"
                            />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <p className={`text-sm truncate ${unread > 0 ? "font-bold text-[var(--foreground)]" : "font-semibold text-[var(--foreground)]"}`}>
                                {conv.name || `Chat #${conv.id}`}
                              </p>
                              {conv.type === "channel" && <Users className="h-3 w-3 text-[var(--muted-foreground)] flex-shrink-0" />}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                              <span className="text-[10px] text-[var(--muted-foreground)]">
                                {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: false })}
                              </span>
                              {unread > 0 && (
                                <span className="min-w-[18px] h-[18px] rounded-full bg-pink-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                                  {unread > 99 ? "99+" : unread}
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-[var(--muted-foreground)] truncate">
                            {conv.type === "channel"
                              ? `Channel • ${conv.participantCount || 0} members`
                              : conv.type === "group"
                                ? `Group • ${conv.participantCount || 0} members`
                                : "Direct Message"}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
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
    { refetchInterval: 3000, staleTime: 0 }
  );
  const { data: conversation } = trpc.messages.conversations.useQuery(undefined, {
    staleTime: 15_000,
  });
  const utils = trpc.useUtils();
  const [text, setText] = useState("");
  const [typingUsers, setTypingUsers] = useState<Set<number>>(new Set());
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());
  const [scrolledUp, setScrolledUp] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  const [activeReactionBar, setActiveReactionBar] = useState<number | null>(null);
  const [hoverMsg, setHoverMsg] = useState<number | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [callState, setCallState] = useState<{ isVideo: boolean } | null>(null);
  const [inChatSearch, setInChatSearch] = useState("");
  const [showInChatSearch, setShowInChatSearch] = useState(false);

  // Local reactions state: msgId → { emoji: count }
  const [localReactions, setLocalReactions] = useState<Record<number, Record<string, number>>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const { sendMessage: wsSend, isConnected, subscribe } = useWebSocket();

  const addReaction = trpc.messages.addReaction.useMutation();
  const markRead = trpc.messages.markRead.useMutation();
  const deleteMessage = trpc.messages.deleteMessage.useMutation({
    onSuccess: () => utils.messages.messages.invalidate({ conversationId }),
  });
  const pinMessage = trpc.messages.pinMessage.useMutation();

  // Subscribe to WebSocket messages
  useEffect(() => {
    const unsubscribe = subscribe((msg) => {
      if (msg.type === "new_message" && msg.data?.conversationId === conversationId) {
        refetch();
        // Auto mark read if not scrolled up
        if (!scrolledUp) {
          markRead.mutate({ conversationId });
        }
      } else if (msg.type === "typing_start" && msg.data?.conversationId === conversationId) {
        setTypingUsers(prev => new Set(prev).add(msg.data.userId));
      } else if (msg.type === "typing_stop" && msg.data?.conversationId === conversationId) {
        setTypingUsers(prev => {
          const next = new Set(prev);
          next.delete(msg.data.userId);
          return next;
        });
      } else if (msg.type === "presence_update" && msg.data?.conversationId === conversationId) {
        if (msg.data.status === "online") {
          setOnlineUsers(prev => new Set(prev).add(msg.data.userId));
        } else {
          setOnlineUsers(prev => {
            const next = new Set(prev);
            next.delete(msg.data.userId);
            return next;
          });
        }
      }
    });

    return unsubscribe;
  }, [conversationId, subscribe, refetch, scrolledUp]);

  // Subscribe to conversation on mount + mark as read
  useEffect(() => {
    // Register as watcher so server broadcasts new_message events to us
    wsSend("watch_conversation", { conversationId });
    wsSend("presence_update", { conversationId });
    markRead.mutate({ conversationId });
  }, [conversationId]);

  const sendMsg = trpc.messages.send.useMutation({
    onSuccess: () => {
      setText("");
      setReplyingTo(null);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
      utils.messages.messages.invalidate({ conversationId });
      if (isConnected) {
        wsSend("typing_stop", { conversationId });
      }
    },
  });

  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollHeight, scrollTop, clientHeight } = messagesContainerRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      setScrolledUp(!isAtBottom);
      if (isAtBottom) {
        markRead.mutate({ conversationId });
      }
    }
  };

  useEffect(() => {
    if (!scrolledUp && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [msgs, scrolledUp]);

  const handleSend = () => {
    if (!text.trim()) return;
    sendMsg.mutate({
      conversationId,
      content: text,
      replyToId: replyingTo?.id,
    });
  };

  const handleReact = (msgId: number, emoji: string) => {
    addReaction.mutate({ messageId: msgId, emoji });
    setLocalReactions(prev => {
      const msgReactions = { ...(prev[msgId] || {}) };
      msgReactions[emoji] = (msgReactions[emoji] || 0) + 1;
      return { ...prev, [msgId]: msgReactions };
    });
    setActiveReactionBar(null);
  };

  const handleLongPress = (msgId: number) => {
    setActiveReactionBar(msgId);
    setActiveMenu(null);
  };

  const conv = conversation?.find((c: any) => c.id === conversationId);
  const convName = conv?.name || `Chat #${conversationId}`;

  // Filter messages by in-chat search
  const displayedMsgs = useMemo(() => {
    if (!msgs) return [];
    if (!inChatSearch.trim()) return msgs;
    return msgs.filter((m: any) =>
      m.content?.toLowerCase().includes(inChatSearch.toLowerCase())
    );
  }, [msgs, inChatSearch]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col h-full"
      onClick={() => { setActiveMenu(null); setActiveReactionBar(null); setShowEmojiPicker(false); }}
    >
      {/* Call UI */}
      <AnimatePresence>
        {callState && (
          <CallUI
            conversationId={conversationId}
            convName={convName}
            isVideo={callState.isVideo}
            userId={userId}
            sendMessage={wsSend}
            onClose={() => setCallState(null)}
          />
        )}
      </AnimatePresence>

      {/* Image Fullscreen */}
      <AnimatePresence>
        {fullscreenImage && (
          <ImageFullscreen url={fullscreenImage} onClose={() => setFullscreenImage(null)} />
        )}
      </AnimatePresence>

      {/* Chat Header */}
      <div className="px-4 sm:px-5 py-3 border-b border-pink-50 flex items-center gap-3 glass-strong">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onBack}
          className="p-2 rounded-xl hover:bg-pink-50 text-[var(--muted-foreground)] cursor-pointer"
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
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-[var(--foreground)] text-sm truncate">{convName}</h3>
          <p className="text-[10px] text-emerald-500 font-semibold">
            {conv?.type === "channel" ? `Channel • members` : "Online"}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {/* In-chat search */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => { e.stopPropagation(); setShowInChatSearch(v => !v); }}
            className="p-2 rounded-xl hover:bg-pink-50 text-[var(--muted-foreground)] cursor-pointer"
          >
            <Search className="h-4 w-4" />
          </motion.button>
          {/* Phone call */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => { e.stopPropagation(); setCallState({ isVideo: false }); }}
            className="p-2 rounded-xl hover:bg-pink-50 text-[var(--muted-foreground)] cursor-pointer"
          >
            <Phone className="h-4 w-4" />
          </motion.button>
          {/* Video call */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => { e.stopPropagation(); setCallState({ isVideo: true }); }}
            className="p-2 rounded-xl hover:bg-pink-50 text-[var(--muted-foreground)] cursor-pointer"
          >
            <Video className="h-4 w-4" />
          </motion.button>
          {/* More menu — handled per-message now, so no-op globally */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => { e.stopPropagation(); toast("Right-click or long-press a message for options", { icon: "ℹ️" }); }}
            className="p-2 rounded-xl hover:bg-pink-50 text-[var(--muted-foreground)] cursor-pointer"
          >
            <MoreVertical className="h-4 w-4" />
          </motion.button>
        </div>
      </div>

      {/* In-chat search bar */}
      <AnimatePresence>
        {showInChatSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 py-2 border-b border-pink-50 overflow-hidden"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
              <input
                autoFocus
                value={inChatSearch}
                onChange={e => setInChatSearch(e.target.value)}
                placeholder="Search in chat..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-pink-100 bg-pink-50/30 text-sm outline-none focus:border-pink-300 placeholder:text-[var(--muted-foreground)]"
              />
              {inChatSearch && (
                <button onClick={() => setInChatSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {inChatSearch && (
              <p className="text-xs text-[var(--muted-foreground)] mt-1 ml-1">
                {displayedMsgs.length} result{displayedMsgs.length !== 1 ? "s" : ""}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 bg-gradient-to-b from-pink-50/30 to-transparent"
        onClick={() => { setActiveMenu(null); setActiveReactionBar(null); setShowEmojiPicker(false); }}
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-pink-300" />
            <p className="text-xs text-[var(--muted-foreground)]">Loading messages...</p>
          </div>
        ) : displayedMsgs && displayedMsgs.length > 0 ? (
          <>
            {scrolledUp && (
              <motion.button
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => {
                  setScrolledUp(false);
                  messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
                }}
                className="sticky top-4 left-1/2 -translate-x-1/2 z-20 bg-[var(--card)] border border-[var(--border)] text-pink-500 px-4 py-2 rounded-full text-xs font-semibold shadow-md hover:bg-pink-50 transition-colors"
              >
                New messages ↓
              </motion.button>
            )}

            {displayedMsgs.map((msg: any, i: number) => {
              const isMine = msg.senderId === userId;
              const prevMsg = displayedMsgs[i - 1];
              const nextMsg = displayedMsgs[i + 1];

              // Date divider
              const showDateDivider = !prevMsg || !isSameDay(new Date(msg.createdAt), new Date(prevMsg.createdAt));

              // Time group: show time if >5 min gap or different sender
              const showTime = !prevMsg || (
                new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() > 300000
              );
              const showSenderName = !isMine && (
                !prevMsg || prevMsg.senderId !== msg.senderId || showTime
              );
              const senderInitial = (msg.senderName || "?").charAt(0).toUpperCase();

              // Highlight if in search mode
              const isHighlighted = inChatSearch && msg.content?.toLowerCase().includes(inChatSearch.toLowerCase());

              const msgReactions = localReactions[msg.id] || {};

              const isDeleted = msg.isDeleted;

              return (
                <div key={msg.id}>
                  {showDateDivider && <DateDivider date={new Date(msg.createdAt)} />}

                  {showTime && !showDateDivider && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center text-[10px] text-[var(--muted-foreground)] font-medium my-2"
                    >
                      {format(new Date(msg.createdAt), "h:mm a")}
                    </motion.p>
                  )}

                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: Math.min(i * 0.02, 0.3), type: "spring", stiffness: 300 }}
                    className={`flex items-end gap-2 mb-1 ${isMine ? "justify-end" : "justify-start"}`}
                    onMouseEnter={() => setHoverMsg(msg.id)}
                    onMouseLeave={() => setHoverMsg(null)}
                    onTouchStart={() => {
                      longPressTimerRef.current = setTimeout(() => handleLongPress(msg.id), 500);
                    }}
                    onTouchEnd={() => clearTimeout(longPressTimerRef.current)}
                  >
                    {!isMine && (
                      <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-pink-300 to-purple-400 flex items-center justify-center shadow-sm mb-1">
                        <span className="text-white text-[10px] font-bold">{senderInitial}</span>
                      </div>
                    )}

                    <div className={`max-w-[75%] sm:max-w-[65%] relative group ${isMine ? "order-1" : ""}`}>
                      {showSenderName && (
                        <p className="text-[10px] text-[var(--muted-foreground)] font-semibold mb-1 ml-1">{msg.senderName}</p>
                      )}

                      {/* Reply-to preview */}
                      {msg.replyToId && msgs && (
                        (() => {
                          const parent = (msgs as any[]).find((m: any) => m.id === msg.replyToId);
                          if (!parent) return null;
                          return (
                            <div className={`mb-1 px-3 py-1.5 rounded-xl border-l-4 border-pink-400 bg-pink-50/70 text-xs text-[var(--muted-foreground)] truncate ${isMine ? "bg-purple-50/70 border-purple-400" : ""}`}>
                              <span className="font-semibold">{parent.senderName}:</span>{" "}
                              {parent.isDeleted ? "[deleted]" : parent.content || (parent.attachmentUrl ? "[Image]" : "")}
                            </div>
                          );
                        })()
                      )}

                      {/* Message bubble */}
                      <div
                        onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === msg.id ? null : msg.id); setActiveReactionBar(null); }}
                        className={`px-4 py-3 text-sm leading-relaxed break-words cursor-pointer select-text ${
                          isHighlighted ? "ring-2 ring-yellow-400" : ""
                        } ${
                          isMine
                            ? "bg-gradient-to-br from-pink-500 to-purple-600 text-white rounded-2xl rounded-br-md shadow-lg shadow-pink-200/30"
                            : "glass-strong border border-pink-100/50 text-[var(--foreground)] rounded-2xl rounded-bl-md"
                        }`}
                      >
                        {isDeleted ? (
                          <span className="italic opacity-60">This message was deleted</span>
                        ) : msg.attachmentUrl && msg.attachmentType === "image" ? (
                          <div className="space-y-2">
                            <img
                              src={msg.attachmentUrl}
                              alt="attachment"
                              className="max-w-full rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={(e) => { e.stopPropagation(); setFullscreenImage(msg.attachmentUrl); }}
                            />
                            {msg.content && msg.content !== "[Image]" && <p>{msg.content}</p>}
                          </div>
                        ) : (
                          msg.content
                        )}
                      </div>

                      {/* Reactions display */}
                      {Object.keys(msgReactions).length > 0 && (
                        <div className={`flex flex-wrap gap-1 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>
                          {Object.entries(msgReactions).map(([emoji, count]) => (
                            <button
                              key={emoji}
                              onClick={(e) => { e.stopPropagation(); handleReact(msg.id, emoji); }}
                              className="inline-flex items-center gap-0.5 bg-[var(--card)] border border-[var(--border)] rounded-full px-2 py-0.5 text-xs shadow-sm hover:border-pink-300 transition-colors"
                            >
                              {emoji} <span className="text-[var(--muted-foreground)] font-medium">{count}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Time + read receipt */}
                      <div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>
                        <span className="text-[10px] text-[var(--muted-foreground)]">
                          {format(new Date(msg.createdAt), "h:mm a")}
                        </span>
                        {isMine && !isDeleted && (
                          <CheckCheck className="h-3 w-3 text-pink-300" />
                        )}
                      </div>

                      {/* Hover quick actions */}
                      <AnimatePresence>
                        {hoverMsg === msg.id && !isDeleted && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className={`absolute top-0 ${isMine ? "left-0 -translate-x-full pr-2" : "right-0 translate-x-full pl-2"} flex items-center gap-1`}
                          >
                            <button
                              onClick={(e) => { e.stopPropagation(); setReplyingTo(msg); setActiveMenu(null); }}
                              className="p-1.5 rounded-full bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)] hover:text-pink-500 shadow-sm"
                            >
                              <Reply className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setActiveReactionBar(activeReactionBar === msg.id ? null : msg.id); setActiveMenu(null); }}
                              className="p-1.5 rounded-full bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)] hover:text-pink-500 shadow-sm"
                            >
                              <Smile className="h-3.5 w-3.5" />
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Reaction bar */}
                      <AnimatePresence>
                        {activeReactionBar === msg.id && (
                          <div className={`absolute z-20 ${isMine ? "right-0 bottom-full mb-2" : "left-0 bottom-full mb-2"}`}>
                            <ReactionBar onReact={(emoji) => handleReact(msg.id, emoji)} />
                          </div>
                        )}
                      </AnimatePresence>

                      {/* Message context menu */}
                      <AnimatePresence>
                        {activeMenu === msg.id && (
                          <MessageMenu
                            isMine={isMine}
                            msg={msg}
                            onReply={() => setReplyingTo(msg)}
                            onPin={() => {
                              pinMessage.mutate({ conversationId, messageId: msg.id });
                              toast.success("Message pinned");
                            }}
                            onCopy={() => {
                              navigator.clipboard.writeText(msg.content || "");
                              toast.success("Copied to clipboard");
                            }}
                            onDelete={() => {
                              deleteMessage.mutate({ messageId: msg.id });
                            }}
                            onReport={() => toast("Report submitted", { icon: "📩" })}
                            onClose={() => setActiveMenu(null)}
                          />
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                </div>
              );
            })}

            {typingUsers.size > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-xs text-[var(--muted-foreground)] mt-2"
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
            <p className="text-sm text-[var(--muted-foreground)] font-medium">{inChatSearch ? "No matching messages" : "No messages yet"}</p>
            {!inChatSearch && <p className="text-xs text-[var(--muted-foreground)]">Say hi and start the conversation!</p>}
          </div>
        )}
      </div>

      {/* Reply preview strip */}
      <AnimatePresence>
        {replyingTo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 py-2 border-t border-pink-50 bg-pink-50/50 flex items-center gap-2 overflow-hidden"
          >
            <div className="flex-1 min-w-0 border-l-4 border-pink-400 pl-2">
              <p className="text-[10px] text-pink-500 font-bold">Replying to {replyingTo.senderName}</p>
              <p className="text-xs text-[var(--muted-foreground)] truncate">{replyingTo.content || "[Image]"}</p>
            </div>
            <button onClick={() => setReplyingTo(null)} className="text-[var(--muted-foreground)] p-1">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message Input */}
      <div className="px-4 sm:px-5 py-3 border-t border-pink-50 glass-strong relative">
        {/* Emoji Picker */}
        <AnimatePresence>
          {showEmojiPicker && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-full left-4 mb-2 z-50 shadow-xl rounded-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <Picker
                data={data}
                onEmojiSelect={(emoji: any) => {
                  const native = emoji.native || emoji.skins?.[0]?.native || emoji.id;
                  setText(prev => prev + native);
                  textareaRef.current?.focus();
                }}
                theme="light"
                previewPosition="none"
                skinTonePosition="none"
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-end gap-2">
          <div className="flex gap-1">
            {/* Image upload */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "image/*";
                input.onchange = async (e: any) => {
                  const file = e.target.files[0];
                  if (file) {
                    try {
                      const res = await fetch("/api/upload-photo", {
                        method: "POST",
                        body: file,
                        headers: { "Content-Type": file.type },
                      });
                      const { url } = await res.json();
                      sendMsg.mutate({
                        conversationId,
                        content: "",
                        attachmentUrl: url,
                        attachmentType: "image",
                      });
                    } catch (err) {
                      toast.error("Failed to upload image");
                    }
                  }
                };
                input.click();
              }}
              className="p-2 rounded-xl hover:bg-pink-50 text-[var(--muted-foreground)] cursor-pointer"
            >
              <ImageIcon className="h-5 w-5" />
            </motion.button>

            {/* Emoji picker toggle */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(v => !v); }}
              className={`p-2 rounded-xl hover:bg-pink-50 cursor-pointer transition-colors ${showEmojiPicker ? "text-pink-500 bg-pink-50" : "text-[var(--muted-foreground)]"}`}
            >
              <Smile className="h-5 w-5" />
            </motion.button>
          </div>

          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                if (isConnected) {
                  wsSend("typing_start", { conversationId });
                  clearTimeout(typingTimeoutRef.current);
                  typingTimeoutRef.current = setTimeout(() => {
                    wsSend("typing_stop", { conversationId });
                  }, 2000);
                }
              }}
              placeholder="Type a message..."
              rows={1}
              className="w-full px-4 py-3 rounded-xl border border-pink-100 bg-[var(--input)] text-sm outline-none focus:border-pink-300 focus:ring-1 focus:ring-pink-200/50 placeholder:text-[var(--muted-foreground)] resize-none max-h-30"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && text.trim()) {
                  e.preventDefault();
                  handleSend();
                }
                if (e.key === "Escape" && replyingTo) {
                  setReplyingTo(null);
                }
              }}
            />
          </div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.9 }}>
            <Button
              onClick={handleSend}
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
  const { data: unreadCounts } = trpc.messages.unreadCounts.useQuery(undefined, {
    enabled: isAuthenticated, refetchInterval: 30_000,
  });

  if (!isAuthenticated) {
    return (
      <PageWrapper>
        <div className="container px-4 py-20 text-center max-w-md mx-auto">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}
            className="inline-flex w-20 h-20 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 items-center justify-center mb-6">
            <Shield className="h-10 w-10 text-pink-400" />
          </motion.div>
          <h2 className="font-display text-2xl font-bold text-[var(--foreground)] mb-3">Private Messages</h2>
          <p className="text-[var(--muted-foreground)] text-sm mb-6">Sign in to chat privately with community members.</p>
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
              unreadCounts={unreadCounts || {}}
            />
            <div className="border-l border-[var(--border)]">
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
                    <h3 className="font-display text-lg font-bold text-[var(--muted-foreground)] mb-2">Select a conversation</h3>
                    <p className="text-[var(--muted-foreground)] text-sm">Choose a chat to start messaging</p>
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
                  unreadCounts={unreadCounts || {}}
                />
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </PageWrapper>
  );
}
