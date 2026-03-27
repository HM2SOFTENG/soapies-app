import AdminLayout from "./AdminLayout";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, Check, X, Users, DollarSign, ClipboardList, Search,
  ChevronRight, Sparkles, AlertCircle, MapPin, Calendar, Zap,
  RefreshCw, Eye, XCircle, Clock, TrendingUp, FlaskConical, ExternalLink,
  Plus
} from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

// ─── TABS ───────────────────────────────────────────────────────────────
type TabType = "reservations" | "checkin" | "staff" | "finances" | "testResults";

// ─── WRISTBAND BADGE ────────────────────────────────────────────────────
function WristbandBadge({ color, size = "sm" }: { color?: string | null; size?: "sm" | "lg" }) {
  if (!color) return <span className="text-gray-400">—</span>;
  const config: Record<string, { emoji: string; label: string; bg: string; text: string }> = {
    rainbow: { emoji: "🌈", label: "Rainbow", bg: "bg-purple-100", text: "text-purple-800" },
    purple: { emoji: "💜", label: "Purple", bg: "bg-purple-100", text: "text-purple-700" },
    blue: { emoji: "💙", label: "Blue", bg: "bg-blue-100", text: "text-blue-700" },
    pink: { emoji: "🩷", label: "Pink", bg: "bg-pink-100", text: "text-pink-700" },
  };
  const c = config[color];
  if (!c) return <span className="text-gray-400">—</span>;
  return (
    <span className={`inline-flex items-center gap-1 px-${size === "lg" ? "3" : "2"} py-${size === "lg" ? "1.5" : "0.5"} rounded-full text-${size === "lg" ? "sm" : "xs"} font-bold ${c.bg} ${c.text}`}>
      {c.emoji} {c.label}
    </span>
  );
}

// ─── RESERVATIONS TAB ───────────────────────────────────────────────────
function ReservationsTab({ eventId }: { eventId: number }) {
  const [search, setSearch] = useState("");
  const utils = trpc.useUtils();
  const { data: reservations, isLoading } = trpc.reservations.byEvent.useQuery(
    { eventId },
    { retry: false }
  );
  const updateStatus = trpc.reservations.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Reservation updated");
      utils.reservations.byEvent.invalidate({ eventId });
    },
  });

  const filtered = useMemo(() => {
    if (!reservations) return [];
    return (reservations as any[]).filter((r: any) => {
      if (!search) return true;
      const name = r.displayName || r.profile?.displayName || r.user?.name || "";
      return name.toLowerCase().includes(search.toLowerCase());
    });
  }, [reservations, search]);

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-50 border-yellow-200",
    confirmed: "bg-green-50 border-green-200",
    checked_in: "bg-blue-50 border-blue-200",
    cancelled: "bg-red-50 border-red-200",
    no_show: "bg-gray-50 border-gray-200",
  };

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by guest name..."
          className="pl-12 rounded-xl border-pink-100"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
            <Loader2 className="h-8 w-8 text-pink-400" />
          </motion.div>
        </div>
      ) : !filtered || filtered.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No reservations found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r: any, i: number) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`p-5 rounded-2xl border ${statusColors[r.status] || statusColors.pending}`}
            >
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800">{r.displayName || r.profile?.displayName || r.user?.name || "Unknown"}</p>
                  <p className="text-xs text-gray-500">{r.user?.email}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-sm text-gray-600">{r.ticketType} × {r.quantity}</span>
                    <WristbandBadge color={r.wristbandColor} />
                  </div>
                  {r.partnerUserId && (
                    <p className="text-xs text-purple-600 mt-1 font-medium">👥 Couple ticket</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">{format(new Date(r.createdAt), "MMM d, yyyy h:mm a")}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-gray-800">${parseFloat(r.totalAmount || "0").toFixed(2)}</p>
                  <span className={`text-xs font-bold uppercase px-2 py-1 rounded-full ${
                    r.paymentStatus === "paid" ? "bg-green-200 text-green-800" :
                    r.paymentStatus === "failed" ? "bg-red-200 text-red-800" :
                    "bg-yellow-200 text-yellow-800"
                  }`}>{r.paymentStatus}</span>
                  <br />
                  <span className={`text-xs font-bold uppercase px-2 py-1 rounded-full mt-1 inline-block ${
                    r.status === "confirmed" ? "bg-green-200 text-green-800" :
                    r.status === "checked_in" ? "bg-blue-200 text-blue-800" :
                    r.status === "cancelled" ? "bg-red-200 text-red-800" :
                    r.status === "no_show" ? "bg-gray-200 text-gray-800" :
                    "bg-yellow-200 text-yellow-800"
                  }`}>{r.status}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-4 flex-wrap">
                {r.status !== "confirmed" && r.status !== "checked_in" && (
                  <Button
                    onClick={() => updateStatus.mutate({ id: r.id, status: "confirmed" })}
                    size="sm"
                    disabled={updateStatus.isPending}
                    className="bg-green-500 text-white rounded-lg text-xs gap-1"
                  >
                    {updateStatus.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                    Confirm
                  </Button>
                )}
                {r.status !== "checked_in" && r.status !== "cancelled" && (
                  <Button
                    onClick={() => updateStatus.mutate({ id: r.id, status: "checked_in" })}
                    size="sm"
                    disabled={updateStatus.isPending}
                    className="bg-blue-500 text-white rounded-lg text-xs gap-1"
                  >
                    {updateStatus.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
                    Check In
                  </Button>
                )}
                {r.status !== "cancelled" && (
                  <Button
                    onClick={() => updateStatus.mutate({ id: r.id, status: "cancelled" })}
                    size="sm"
                    disabled={updateStatus.isPending}
                    variant="outline"
                    className="border-red-200 text-red-600 rounded-lg text-xs gap-1 hover:bg-red-50"
                  >
                    {updateStatus.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                    Cancel
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── CHECK-IN TAB ───────────────────────────────────────────────────────
// ─── GUEST DETAIL MODAL ─────────────────────────────────────────────────────
function GuestModal({ guest, onCheckIn, onClose, isLoading }: {
  guest: any; onCheckIn: () => void; onClose: () => void; isLoading: boolean;
}) {
  const name = guest.displayName || guest.profile?.displayName || guest.user?.name || "Guest";
  const avatarUrl = guest.profile?.avatarUrl;
  const isCheckedIn = guest.status === "checked_in";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          onClick={e => e.stopPropagation()}
          className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl"
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-10 h-1 rounded-full bg-gray-200" />
          </div>

          {/* Header gradient */}
          <div className="bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-5 relative">
            <button onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white">
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="w-16 h-16 rounded-2xl bg-white/20 flex-shrink-0 overflow-hidden border-2 border-white/40">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-2xl font-black text-white">{name.charAt(0).toUpperCase()}</span>
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-display text-xl font-black text-white">{name}</h3>
                {guest.profile?.memberRole && (
                  <span className="text-white/70 text-xs font-semibold capitalize">{guest.profile.memberRole}</span>
                )}
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="px-6 py-5 space-y-4">
            {/* Wristband — prominent */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100">
              <span className="text-sm font-bold text-gray-600">Wristband</span>
              {guest.wristbandColor ? (
                <WristbandBadge color={guest.wristbandColor} size="lg" />
              ) : (
                <span className="text-gray-400 text-sm">Not assigned</span>
              )}
            </div>

            {/* Ticket details */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-pink-50 border border-pink-100">
                <p className="text-[10px] font-bold text-pink-500 uppercase mb-1">Ticket</p>
                <p className="text-sm font-bold text-gray-800 capitalize">{(guest.ticketType || "—").replace("_", " ")}</p>
              </div>
              <div className="p-3 rounded-xl bg-purple-50 border border-purple-100">
                <p className="text-[10px] font-bold text-purple-500 uppercase mb-1">Payment</p>
                <p className="text-sm font-bold text-gray-800 capitalize">{guest.paymentStatus || "—"}</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
                <p className="text-[10px] font-bold text-blue-500 uppercase mb-1">Orientation</p>
                <p className="text-sm font-bold text-gray-800 capitalize">{guest.orientationSignal || "—"}</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                <p className="text-[10px] font-bold text-emerald-500 uppercase mb-1">Amount</p>
                <p className="text-sm font-bold text-gray-800">${parseFloat(guest.totalAmount || "0").toFixed(2)}</p>
              </div>
            </div>

            {/* Partner */}
            {guest.partnerUserId && (
              <div className="p-3 rounded-xl bg-fuchsia-50 border border-fuchsia-100">
                <p className="text-[10px] font-bold text-fuchsia-500 uppercase mb-1">Couple Partner</p>
                <p className="text-sm font-bold text-gray-800">{guest.partnerName || `User #${guest.partnerUserId}`}</p>
              </div>
            )}

            {/* Test result */}
            {guest.testResultSubmitted && (
              <div className={`p-3 rounded-xl border ${guest.testResultApproved ? "bg-blue-50 border-blue-200" : "bg-amber-50 border-amber-200"}`}>
                <p className={`text-[10px] font-bold uppercase mb-1 ${guest.testResultApproved ? "text-blue-600" : "text-amber-600"}`}>Test Result</p>
                <p className="text-sm font-bold text-gray-800">{guest.testResultApproved ? "✅ Approved" : "⏳ Pending review"}</p>
              </div>
            )}

            {/* Check In Button */}
            {!isCheckedIn ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={onCheckIn}
                disabled={isLoading}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-display font-bold text-lg shadow-lg shadow-emerald-200/50 flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                Check In Guest
              </motion.button>
            ) : (
              <div className="w-full py-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
                <p className="text-emerald-600 font-bold flex items-center justify-center gap-2">
                  <Check className="h-5 w-5" /> Already Checked In
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function CheckInTab({ eventId }: { eventId: number }) {
  const [search, setSearch] = useState("");
  const [selectedGuest, setSelectedGuest] = useState<any | null>(null);
  const [recentCheckIns, setRecentCheckIns] = useState<any[]>([]);
  const [qrMode, setQrMode] = useState(false);
  const [qrInput, setQrInput] = useState("");

  // Camera state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<any>(null);
  const scanningRef = useRef(false);

  const { data: reservations, refetch } = trpc.reservations.byEvent.useQuery({ eventId });

  const checkInByQR = trpc.reservations.checkInByQR.useMutation({
    onSuccess: (data) => {
      toast.success(`✅ ${data.guestName || 'Guest'} checked in via QR!`);
      setQrInput("");
      refetch();
    },
    onError: (e) => {
      if (e.message.includes("Already")) {
        toast.warning("⚠️ " + e.message);
      } else {
        toast.error("❌ " + e.message);
      }
      setQrInput("");
    },
  });

  const stopCamera = () => {
    scanningRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const scanLoop = async () => {
    if (!scanningRef.current || !videoRef.current || !detectorRef.current) return;
    try {
      const barcodes = await detectorRef.current.detect(videoRef.current);
      if (barcodes.length > 0) {
        const code = barcodes[0].rawValue;
        stopCamera();
        checkInByQR.mutate({ qrCode: code, eventId });
        return;
      }
    } catch {}
    if (scanningRef.current) requestAnimationFrame(scanLoop);
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!('BarcodeDetector' in window)) {
        setCameraError("Camera scanning not supported on this browser. Use the text input below.");
        return;
      }
      // @ts-ignore
      detectorRef.current = new BarcodeDetector({ formats: ['qr_code'] });
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
      scanningRef.current = true;
      scanLoop();
    } catch {
      setCameraError("Camera access denied. Use the text input below.");
    }
  };

  useEffect(() => {
    return () => { stopCamera(); };
  }, []);

  const handleQRSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (qrInput.trim()) {
      checkInByQR.mutate({ qrCode: qrInput.trim(), eventId });
    }
  };
  const updateStatus = trpc.reservations.updateStatus.useMutation({
    onSuccess: (_, variables) => {
      const res = reservations?.find((r: any) => r.id === variables.id);
      if (res) setRecentCheckIns(prev => [{ ...res, checkedInAt: new Date() }, ...prev.slice(0, 9)]);
      toast.success("✅ Guest checked in!");
      setSelectedGuest(null);
      refetch();
    },
  });

  const checkedInCount = useMemo(() => {
    if (!reservations) return 0;
    return (reservations as any[]).filter((r: any) => r.status === "checked_in").length;
  }, [reservations]);

  // All non-cancelled reservations for the full list
  const allGuests = useMemo(() => {
    if (!reservations) return [];
    return (reservations as any[]).filter((r: any) => r.status !== "cancelled");
  }, [reservations]);

  const filtered = useMemo(() => {
    if (!search) return allGuests;
    return allGuests.filter((r: any) => {
      const name = r.displayName || r.profile?.displayName || r.user?.name || "";
      return name.toLowerCase().includes(search.toLowerCase());
    });
  }, [search, allGuests]);

  return (
    <div className="space-y-5">
      {/* Live Count */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-blue-600 uppercase">Checked In</p>
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-3xl font-black text-blue-700">{checkedInCount}</span>
            <span className="text-blue-500 text-sm">/ {allGuests.length}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setQrMode(!qrMode)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${qrMode ? 'bg-purple-500 text-white' : 'bg-purple-100 text-purple-600 hover:bg-purple-200'}`}
          >
            📷 QR Mode
          </motion.button>
          <motion.button onClick={() => refetch()} whileTap={{ scale: 0.9 }}
            className="p-2 rounded-xl bg-blue-100 text-blue-600 hover:bg-blue-200">
            <RefreshCw className="h-4 w-4" />
          </motion.button>
        </div>
      </div>

      {/* QR Check-In */}
      {qrMode && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-purple-50 border border-purple-200 space-y-3"
        >
          <p className="text-xs font-bold text-purple-600 uppercase">QR Check-In Mode</p>

          {/* Camera view */}
          {cameraActive ? (
            <div className="relative rounded-xl overflow-hidden bg-black aspect-square max-w-xs mx-auto">
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              {/* Scan target overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 border-2 border-white/60 rounded-xl relative">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-purple-400 rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-purple-400 rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-purple-400 rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-purple-400 rounded-br-lg" />
                </div>
              </div>
              <button onClick={stopCamera} className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-lg text-white text-xs">✕ Stop</button>
            </div>
          ) : (
            <div className="space-y-2">
              <Button
                onClick={startCamera}
                disabled={checkInByQR.isPending}
                className="w-full bg-purple-500 text-white rounded-xl gap-2"
              >
                📷 Open Camera Scanner
              </Button>
              {cameraError && <p className="text-xs text-red-500">{cameraError}</p>}
            </div>
          )}

          {/* Text fallback */}
          <div>
            <p className="text-xs text-gray-500 mb-2">Or type/paste QR code:</p>
            <div className="flex gap-2">
              <Input
                value={qrInput}
                onChange={e => setQrInput(e.target.value)}
                placeholder="Paste QR code value..."
                className="flex-1 rounded-xl border-purple-200 text-sm"
                onKeyDown={e => {
                  if (e.key === 'Enter' && qrInput.trim()) {
                    checkInByQR.mutate({ qrCode: qrInput.trim(), eventId });
                  }
                }}
              />
              <Button
                onClick={() => qrInput.trim() && checkInByQR.mutate({ qrCode: qrInput.trim(), eventId })}
                disabled={!qrInput.trim() || checkInByQR.isPending}
                className="bg-purple-500 text-white rounded-xl text-xs"
              >
                {checkInByQR.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Go'}
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search guest name..." className="pl-11 rounded-xl border-pink-100" autoComplete="off" />
      </div>

      {/* Full guest list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">No guests found</p>
        ) : (
          filtered.map((r: any, i: number) => {
            const name = r.displayName || r.profile?.displayName || r.user?.name || "Guest";
            const isCheckedIn = r.status === "checked_in";
            return (
              <motion.button
                key={r.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => setSelectedGuest(r)}
                className={`w-full p-4 rounded-2xl border text-left transition-all ${
                  isCheckedIn ? "bg-emerald-50 border-emerald-200" : "bg-white border-pink-100 hover:border-pink-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className={`w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden ${isCheckedIn ? "bg-emerald-200" : "bg-gradient-to-br from-pink-300 to-purple-400"}`}>
                    {r.profile?.avatarUrl ? (
                      <img src={r.profile.avatarUrl} alt={name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-black text-white">{name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-gray-800 text-sm truncate">{name}</p>
                      {isCheckedIn && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full">✓ IN</span>}
                    </div>
                    <p className="text-xs text-gray-500 capitalize">{(r.ticketType || "—").replace("_", " ")} · {r.paymentStatus}</p>
                  </div>
                  {/* Wristband */}
                  <div className="flex-shrink-0">
                    <WristbandBadge color={r.wristbandColor} />
                  </div>
                </div>
              </motion.button>
            );
          })
        )}
      </div>

      {/* Recent Check Ins */}
      {recentCheckIns.length > 0 && (
        <div className="pt-4 border-t border-gray-100">
          <h3 className="font-bold text-gray-700 text-sm mb-3">Recent Check-Ins This Session</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {recentCheckIns.map((r: any, i: number) => (
              <motion.div
                key={`${r.id}-${i}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-green-50 border border-green-100"
              >
                <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{r.displayName || r.profile?.displayName || r.user?.name}</p>
                  <p className="text-xs text-gray-500">{format(new Date(r.checkedInAt || Date.now()), "h:mm a")}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Guest Detail Modal */}
      {selectedGuest && (
        <GuestModal
          guest={selectedGuest}
          onClose={() => setSelectedGuest(null)}
          onCheckIn={() => updateStatus.mutate({ id: selectedGuest.id, status: "checked_in" })}
          isLoading={updateStatus.isPending}
        />
      )}
    </div>
  );
}

// ─── STAFF TAB ──────────────────────────────────────────────────────────
function StaffTab({ eventId }: { eventId: number }) {
  const utils = trpc.useUtils();
  const { data: operators } = trpc.operators.list.useQuery({ eventId });
  const { data: shifts } = trpc.shifts.list.useQuery({ eventId });
  const { data: checklist } = trpc.checklist.list.useQuery({ eventId });
  const { data: reservations } = trpc.reservations.byEvent.useQuery({ eventId });
  const volunteers = useMemo(() => {
    if (!reservations) return [];
    return (reservations as any[]).filter((r: any) => r.ticketType === 'volunteer' && r.status !== 'cancelled');
  }, [reservations]);
  const removeOperator = trpc.operators.remove.useMutation({
    onSuccess: () => {
      toast.success("Operator removed");
      utils.operators.list.invalidate({ eventId });
    },
  });
  const updateChecklistItem = trpc.checklist.update.useMutation({
    onSuccess: () => {
      toast.success("Checklist updated");
      utils.checklist.list.invalidate({ eventId });
    },
  });

  // Staff user picker state
  const [staffSearch, setStaffSearch] = useState("");
  const [showUserPicker, setShowUserPicker] = useState(false);
  const assignOperator = trpc.operators.assign.useMutation({
    onSuccess: () => {
      toast.success("Staff member assigned!");
      utils.operators.list.invalidate({ eventId });
      setStaffSearch("");
      setShowUserPicker(false);
    },
    onError: (e: any) => toast.error(e.message || "Failed to assign"),
  });
  const { data: allUsers } = trpc.admin.users.useQuery(undefined, {
    enabled: showUserPicker,
  });
  const filteredUsers = useMemo(() => {
    if (!allUsers || !staffSearch) return (allUsers as any[]) ?? [];
    return (allUsers as any[]).filter((u: any) =>
      (u.name || u.email || "").toLowerCase().includes(staffSearch.toLowerCase())
    );
  }, [allUsers, staffSearch]);

  return (
    <div className="space-y-8">
      {/* Assign Staff */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-2">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-lg font-bold text-gray-800 flex items-center gap-2">
            <Users className="h-5 w-5 text-pink-500" /> Assign Staff
          </h3>
          <Button
            size="sm"
            onClick={() => setShowUserPicker(!showUserPicker)}
            className="bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl text-xs gap-1"
          >
            <Plus className="h-3.5 w-3.5" /> Add Staff
          </Button>
        </div>
        <AnimatePresence>
          {showUserPicker && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 rounded-2xl bg-pink-50 border border-pink-200 space-y-3 mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    value={staffSearch}
                    onChange={e => setStaffSearch(e.target.value)}
                    placeholder="Search members by name or email..."
                    className="pl-9 rounded-xl border-pink-200"
                    autoFocus
                  />
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {!allUsers ? (
                    <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-pink-400" /></div>
                  ) : filteredUsers.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">{staffSearch ? "No members found" : "Start typing to search"}</p>
                  ) : (
                    filteredUsers.slice(0, 20).map((u: any) => (
                      <motion.button
                        key={u.id}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => assignOperator.mutate({ eventId, userId: u.id, role: "Staff" })}
                        disabled={assignOperator.isPending}
                        className="w-full flex items-center justify-between p-3 rounded-xl bg-white border border-pink-100 hover:border-pink-300 text-left transition-all"
                      >
                        <div>
                          <p className="font-semibold text-sm text-gray-800">{u.name || "Unknown"}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </div>
                        <span className="text-xs text-pink-500 font-bold">+ Assign</span>
                      </motion.button>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Event Operators */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h3 className="font-display text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-pink-500" /> Event Operators
        </h3>
        {!operators || operators.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No operators assigned</p>
        ) : (
          <div className="space-y-2">
            {operators.map((op: any, i: number) => (
              <motion.div
                key={op.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between p-4 rounded-xl bg-white border border-pink-100"
              >
                <div>
                  <p className="font-semibold text-gray-800">{op.user?.name}</p>
                  <p className="text-xs text-gray-500">{op.role || "Operator"}</p>
                </div>
                <Button
                  onClick={() => removeOperator.mutate({ id: op.id })}
                  disabled={removeOperator.isPending}
                  size="sm"
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50"
                >
                  <X className="h-3 w-3" />
                </Button>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Volunteer Ticket Holders */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <h3 className="font-display text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5 text-pink-500" /> Volunteer Ticket Holders ({volunteers.length})
        </h3>
        {volunteers.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">No volunteer tickets purchased yet</p>
        ) : (
          <div className="space-y-2">
            {volunteers.map((v: any) => (
              <div key={v.id} className="flex items-center justify-between p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                <div>
                  <p className="font-semibold text-gray-800">{v.displayName || v.profile?.displayName || v.user?.name || 'Unknown'}</p>
                  <p className="text-xs text-gray-500">{v.user?.email}</p>
                </div>
                <span className="text-xs font-bold px-2 py-1 rounded-full bg-emerald-200 text-emerald-800 capitalize">{v.status}</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Shifts */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <h3 className="font-display text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-pink-500" /> Volunteer Shifts
        </h3>
        {!shifts || shifts.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No shifts created</p>
        ) : (
          <div className="space-y-2">
            {shifts.map((shift: any, i: number) => (
              <motion.div
                key={shift.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-4 rounded-xl bg-white border border-pink-100"
              >
                <p className="font-semibold text-gray-800">{shift.name}</p>
                <p className="text-xs text-gray-500">{format(new Date(shift.startTime), "h:mm a")} - {format(new Date(shift.endTime), "h:mm a")}</p>
                <p className="text-xs text-gray-600 mt-1">{shift.description}</p>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Setup Checklist */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <h3 className="font-display text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-pink-500" /> Setup Checklist
        </h3>
        {!checklist || checklist.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No checklist items</p>
        ) : (
          <div className="space-y-2">
            {checklist.map((item: any, i: number) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`flex items-center gap-3 p-4 rounded-xl border ${
                  item.isCompleted
                    ? "bg-green-50 border-green-200"
                    : "bg-white border-pink-100 hover:border-pink-300"
                }`}
              >
                <button
                  onClick={() => updateChecklistItem.mutate({ id: item.id, isCompleted: !item.isCompleted })}
                  className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    item.isCompleted
                      ? "bg-green-500 border-green-500"
                      : "border-gray-300 hover:border-pink-500"
                  }`}
                >
                  {item.isCompleted && <Check className="h-4 w-4 text-white" />}
                </button>
                <span className={`flex-1 ${item.isCompleted ? "line-through text-gray-400" : "text-gray-800 font-medium"}`}>
                  {item.task}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── FINANCES TAB ───────────────────────────────────────────────────────
function FinancesTab({ eventId }: { eventId: number }) {
  const { data: reservations } = trpc.reservations.byEvent.useQuery({ eventId });

  const stats = useMemo(() => {
    if (!reservations) return { total: 0, confirmed: 0, count: 0 };
    return {
      total: reservations.reduce((sum, r: any) => sum + parseFloat(r.totalAmount || "0"), 0),
      confirmed: reservations.filter((r: any) => r.status === "confirmed" || r.status === "checked_in").reduce((sum, r: any) => sum + parseFloat(r.totalAmount || "0"), 0),
      count: reservations.filter((r: any) => r.status === "confirmed" || r.status === "checked_in").length,
    };
  }, [reservations]);

  return (
    <div className="space-y-6">
      {/* Revenue Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200"
        >
          <p className="text-sm font-bold text-green-600 uppercase mb-2">Total Revenue</p>
          <div className="text-3xl font-black text-green-700">${stats.total.toFixed(2)}</div>
          <p className="text-xs text-green-600 mt-1">All reservations</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200"
        >
          <p className="text-sm font-bold text-blue-600 uppercase mb-2">Confirmed Revenue</p>
          <div className="text-3xl font-black text-blue-700">${stats.confirmed.toFixed(2)}</div>
          <p className="text-xs text-blue-600 mt-1">{stats.count} confirmed guests</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200"
        >
          <p className="text-sm font-bold text-purple-600 uppercase mb-2">Average Per Guest</p>
          <div className="text-3xl font-black text-purple-700">
            ${stats.count > 0 ? (stats.confirmed / stats.count).toFixed(2) : "0.00"}
          </div>
          <p className="text-xs text-purple-600 mt-1">Per confirmed reservation</p>
        </motion.div>
      </div>

      {/* Revenue Breakdown */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <h3 className="font-bold text-gray-800 mb-4">Reservation Breakdown</h3>
        <div className="space-y-2">
          {reservations && reservations.length > 0 ? (
            ["confirmed", "checked_in", "pending", "cancelled"].map((status) => {
              const items = reservations.filter((r: any) => r.status === status);
              const amount = items.reduce((sum, r: any) => sum + parseFloat(r.totalAmount || "0"), 0);
              return (
                <motion.div
                  key={status}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-between p-4 rounded-xl bg-white border border-gray-100"
                >
                  <div>
                    <p className="font-semibold text-gray-800 capitalize">{status}</p>
                    <p className="text-xs text-gray-500">{items.length} reservations</p>
                  </div>
                  <p className="font-bold text-gray-800">${amount.toFixed(2)}</p>
                </motion.div>
              );
            })
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">No reservations</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── TEST RESULTS TAB ───────────────────────────────────────────────────
function TestResultsTab({ eventId }: { eventId: number }) {
  const utils = trpc.useUtils();
  const { data: submissions, isLoading } = trpc.testResults.pending.useQuery({ eventId });
  const reviewMutation = trpc.testResults.review.useMutation({
    onSuccess: () => {
      toast.success("Review submitted");
      utils.testResults.pending.invalidate();
      utils.reservations.byEvent.invalidate({ eventId });
    },
    onError: (e: any) => toast.error(e.message || "Failed to review"),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 text-pink-400 animate-spin" />
      </div>
    );
  }

  if (!submissions || submissions.length === 0) {
    return (
      <div className="text-center py-12">
        <FlaskConical className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">No pending test results</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {submissions.map((s: any, i: number) => (
        <motion.div
          key={s.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="p-5 rounded-2xl border bg-cyan-50 border-cyan-200"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-800">{s.user?.name || "Unknown"}</p>
              <p className="text-xs text-gray-500">{s.user?.email}</p>
              <p className="text-xs text-gray-500 mt-1">
                Submitted: {format(new Date(s.submittedAt), "MMM d, yyyy h:mm a")}
              </p>
              <a
                href={s.resultUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-sm font-semibold text-blue-600 hover:text-blue-800"
              >
                <ExternalLink className="h-3 w-3" /> View Result
              </a>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => reviewMutation.mutate({ id: s.id, status: "approved" })}
                disabled={reviewMutation.isPending}
                size="sm"
                className="bg-green-500 text-white rounded-lg text-xs gap-1"
              >
                {reviewMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                Approve 💙
              </Button>
              <Button
                onClick={() => reviewMutation.mutate({ id: s.id, status: "rejected" })}
                disabled={reviewMutation.isPending}
                size="sm"
                variant="outline"
                className="border-red-200 text-red-600 rounded-lg text-xs gap-1 hover:bg-red-50"
              >
                {reviewMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                Reject
              </Button>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────
export default function AdminEventOps() {
  const { id } = useParams<{ id: string }>();
  const eventId = parseInt(id || "0");
  const [activeTab, setActiveTab] = useState<TabType>("reservations");

  const { data: event, isLoading } = trpc.events.byId.useQuery(
    { id: eventId },
    { retry: false }
  );

  const tabs: { id: TabType; label: string; icon: any }[] = [
    { id: "reservations", label: "Reservations", icon: Users },
    { id: "checkin", label: "Check-In", icon: Eye },
    { id: "testResults", label: "Test Results", icon: FlaskConical },
    { id: "staff", label: "Staff", icon: Sparkles },
    { id: "finances", label: "Finances", icon: DollarSign },
  ];

  if (isLoading) {
    return (
      <AdminLayout title="Event Operations">
        <div className="flex justify-center py-20">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
            <Loader2 className="h-10 w-10 text-pink-400" />
          </motion.div>
        </div>
      </AdminLayout>
    );
  }

  if (!event) {
    return (
      <AdminLayout title="Event Operations">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="font-display text-xl font-bold text-gray-800 mb-2">Event Not Found</h2>
        </motion.div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={`${event.title} - Operations`}>
      {/* Event Header */}
      <div className="mb-5">
        <h1 className="font-display text-xl sm:text-2xl font-bold text-gray-800 mb-2">{event.title}</h1>
        <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500">
          {event.startDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-pink-500 flex-shrink-0" />
              {format(new Date(event.startDate), "MMM d, yyyy")}
            </span>
          )}
          {event.venue && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-pink-500 flex-shrink-0" />
              {event.venue}
            </span>
          )}
          {event.capacity && (
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-pink-500 flex-shrink-0" />
              {event.capacity} capacity
            </span>
          )}
        </div>
      </div>

      {/* Tabs — scrollable on mobile */}
      <div className="mb-6 -mx-4 sm:mx-0">
        <div className="flex gap-1 border-b border-gray-200 overflow-x-auto scrollbar-hide px-4 sm:px-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <motion.button
                key={tab.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-3 font-semibold text-xs sm:text-sm whitespace-nowrap transition-all border-b-2 flex-shrink-0 ${
                  activeTab === tab.id
                    ? "border-pink-500 text-pink-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                {tab.label}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "reservations" && <ReservationsTab eventId={eventId} />}
          {activeTab === "checkin" && <CheckInTab eventId={eventId} />}
          {activeTab === "testResults" && <TestResultsTab eventId={eventId} />}
          {activeTab === "staff" && <StaffTab eventId={eventId} />}
          {activeTab === "finances" && <FinancesTab eventId={eventId} />}
        </motion.div>
      </AnimatePresence>
    </AdminLayout>
  );
}
