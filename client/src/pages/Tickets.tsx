import PageWrapper from "@/components/PageWrapper";
import { trpc } from "@/lib/trpc";
import { motion } from "framer-motion";
import { Ticket, Calendar, MapPin, CheckCircle2, Clock, Loader2, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

// ─── TICKET STATUS BADGE ──────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    confirmed: { label: "Confirmed ✓", cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
    checked_in: { label: "Checked In 🎉", cls: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
  };
  const cfg = map[status] ?? { label: status, cls: "bg-white/10 text-white/60 border-white/10" };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

// ─── TICKET TYPE BADGE ────────────────────────────────────────────────────────
function TicketTypeBadge({ type }: { type: string | null }) {
  if (!type) return null;
  const label = type
    .replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
  return (
    <span className="text-xs font-medium px-2 py-0.5 rounded-full border bg-pink-500/20 text-pink-300 border-pink-500/30">
      {label}
    </span>
  );
}

// ─── TICKET CARD ──────────────────────────────────────────────────────────────
interface TicketCardProps {
  ticket: {
    reservationId: number;
    status: string;
    ticketType: string | null;
    checkedInAt: Date | null;
    eventName: string;
    eventDate: Date;
    venue: string | null;
    qrCode: string | null;
    isUsed: boolean | null;
  };
  index: number;
}

function TicketCard({ ticket, index }: TicketCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-lg shadow-black/20"
    >
      {/* Top accent strip */}
      <div className="h-1 w-full bg-gradient-to-r from-[#f000bc] via-purple-500 to-pink-400" />

      <div className="p-4 space-y-4">
        {/* Event name + status */}
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-white font-bold text-lg leading-tight flex-1">{ticket.eventName}</h2>
          <StatusBadge status={ticket.status} />
        </div>

        {/* Meta */}
        <div className="space-y-1.5 text-sm text-white/60">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-pink-400 shrink-0" />
            <span>{format(new Date(ticket.eventDate), "EEE, MMM d yyyy · h:mm a")}</span>
          </div>
          {ticket.venue && (
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-pink-400 shrink-0" />
              <span>{ticket.venue}</span>
            </div>
          )}
        </div>

        {/* Badges row */}
        <div className="flex flex-wrap gap-2 items-center">
          <TicketTypeBadge type={ticket.ticketType} />
          {ticket.checkedInAt && (
            <span className="text-xs text-white/40 flex items-center gap-1">
              <CheckCircle2 size={12} className="text-emerald-400" />
              Checked in {format(new Date(ticket.checkedInAt), "h:mm a")}
            </span>
          )}
          {!ticket.checkedInAt && ticket.status === "confirmed" && (
            <span className="text-xs text-white/40 flex items-center gap-1">
              <Clock size={12} />
              Awaiting check-in
            </span>
          )}
        </div>

        {/* QR Code */}
        {ticket.qrCode ? (
          <div className="flex flex-col items-center gap-2 pt-2">
            <p className="text-xs text-white/40 uppercase tracking-wider font-semibold">Scan at the door</p>
            <div className="rounded-xl overflow-hidden border-4 border-white/10 bg-white p-1 shadow-xl shadow-black/30">
              <img
                src={ticket.qrCode}
                alt="Ticket QR Code"
                className="w-48 h-48 object-contain"
              />
            </div>
            {ticket.isUsed && (
              <span className="text-xs text-red-400 font-semibold">⚠ Already scanned</span>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 py-3 rounded-xl border border-white/5 bg-white/5">
            <Loader2 size={14} className="text-white/30 animate-spin" />
            <span className="text-xs text-white/30">QR code generating…</span>
          </div>
        )}
      </div>

      {/* Dashed tear line */}
      <div className="mx-4 border-t border-dashed border-white/10" />
      <div className="px-4 py-2 text-xs text-white/20 font-mono">
        #{String(ticket.reservationId).padStart(6, "0")}
      </div>
    </motion.div>
  );
}

// ─── EMPTY STATE ─────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-20 gap-5 text-center px-6"
    >
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#f000bc]/20 to-purple-600/20 border border-white/10 flex items-center justify-center">
        <Ticket size={36} className="text-pink-400" />
      </div>
      <div className="space-y-1">
        <p className="text-white text-lg font-semibold">No tickets yet</p>
        <p className="text-white/40 text-sm">Your confirmed tickets will appear here once a payment is verified.</p>
      </div>
      <Link href="/events">
        <motion.button
          whileTap={{ scale: 0.95 }}
          className="mt-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-[#f000bc] to-purple-600 text-white font-semibold text-sm shadow-lg shadow-pink-900/30"
        >
          <Sparkles size={14} className="inline mr-1.5 -mt-0.5" />
          Browse Events
        </motion.button>
      </Link>
    </motion.div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function Tickets() {
  const { data: tickets, isLoading, error } = trpc.reservations.myTickets.useQuery();

  return (
    <PageWrapper>
      <div
        className="min-h-screen pb-24 pt-4 px-4"
        style={{ background: "linear-gradient(160deg, #0d0014 0%, #180028 50%, #0a0018 100%)" }}
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f000bc] to-purple-600 flex items-center justify-center shadow-lg shadow-pink-900/30">
              <Ticket size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-white text-2xl font-bold tracking-tight">My Tickets</h1>
              <p className="text-white/40 text-xs">Show this at the door</p>
            </div>
          </div>
        </motion.div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20 gap-3 text-white/40">
            <Loader2 size={20} className="animate-spin" />
            <span>Loading your tickets…</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-300 text-sm">
            Failed to load tickets. Please try again.
          </div>
        )}

        {/* Tickets list */}
        {!isLoading && !error && tickets && tickets.length > 0 && (
          <div className="space-y-4 max-w-md mx-auto">
            {tickets.map((ticket, i) => (
              <TicketCard
                key={ticket.reservationId}
                ticket={{
                  ...ticket,
                  qrCode: ticket.qrCode ?? null,
                  isUsed: ticket.isUsed ?? null,
                  checkedInAt: ticket.checkedInAt ? new Date(ticket.checkedInAt) : null,
                  eventDate: new Date(ticket.eventDate),
                }}
                index={i}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && tickets && tickets.length === 0 && <EmptyState />}
      </div>
    </PageWrapper>

}
