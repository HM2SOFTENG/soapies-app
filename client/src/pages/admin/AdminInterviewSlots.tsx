import AdminLayout from "./AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Trash2, CalendarDays, Clock, CheckCircle2, XCircle,
  User, Loader2, Calendar, Edit2, Check, X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  available: { label: "Available", color: "text-emerald-600 bg-emerald-50 border-emerald-200", icon: CheckCircle2 },
  booked:    { label: "Booked",    color: "text-blue-600 bg-blue-50 border-blue-200",         icon: User },
  completed: { label: "Completed", color: "text-purple-600 bg-purple-50 border-purple-200",   icon: Check },
  cancelled: { label: "Cancelled", color: "text-red-500 bg-red-50 border-red-200",            icon: XCircle },
};

function SlotCard({ slot, onUpdate, onDelete }: { slot: any; onUpdate: (id: number, data: any) => void; onDelete: (id: number) => void }) {
  const cfg = STATUS_CONFIG[slot.status] ?? STATUS_CONFIG.available;
  const Icon = cfg.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white/80 backdrop-blur-sm rounded-2xl border border-pink-100/50 shadow p-4 flex flex-col sm:flex-row sm:items-center gap-3"
    >
      {/* Date/Time */}
      <div className="flex items-center gap-3 flex-1">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center shadow flex-shrink-0">
          <CalendarDays className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-gray-800 text-sm">
            {format(new Date(slot.scheduledAt), "EEE, MMM d yyyy")}
          </p>
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {format(new Date(slot.scheduledAt), "h:mm a")}
            <span className="text-gray-300 mx-1">·</span>
            {slot.duration ?? 30} min
          </p>
          {slot.profileId && (
            <p className="text-xs text-blue-600 mt-0.5 flex items-center gap-1">
              <User className="h-3 w-3" /> Booked by profile #{slot.profileId}
            </p>
          )}
        </div>
      </div>

      {/* Status badge */}
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border ${cfg.color}`}>
        <Icon className="h-3 w-3" /> {cfg.label}
      </span>

      {/* Actions */}
      <div className="flex gap-2 flex-shrink-0">
        {slot.status === "booked" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onUpdate(slot.id, { status: "completed" })}
            className="rounded-xl border-purple-200 text-purple-600 hover:bg-purple-50 text-xs gap-1"
          >
            <Check className="h-3 w-3" /> Done
          </Button>
        )}
        {slot.status === "available" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onUpdate(slot.id, { status: "cancelled" })}
            className="rounded-xl border-gray-200 text-gray-500 hover:bg-gray-50 text-xs gap-1"
          >
            <XCircle className="h-3 w-3" /> Cancel
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={() => onDelete(slot.id)}
          className="rounded-xl border-red-200 text-red-500 hover:bg-red-50 text-xs"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </motion.div>
  );
}

/** Generate preview of slots based on form state */
function generateSlotPreviews(startDate: string, endDate: string, times: string[], duration: number): { scheduledAt: string; label: string }[] {
  if (!startDate || times.length === 0) return [];
  const slots: { scheduledAt: string; label: string }[] = [];
  const start = new Date(startDate + "T00:00:00");
  const end = endDate ? new Date(endDate + "T00:00:00") : start;
  const cur = new Date(start);
  while (cur <= end) {
    for (const t of times) {
      const [h, m] = t.split(":").map(Number);
      const dt = new Date(cur);
      dt.setHours(h, m, 0, 0);
      slots.push({
        scheduledAt: dt.toISOString(),
        label: dt.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
      });
    }
    cur.setDate(cur.getDate() + 1);
  }
  return slots;
}

function AddSlotForm({ onBulkAdd, isPending }: { onBulkAdd: (slots: any[]) => void; isPending: boolean }) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [duration, setDuration] = useState(30);
  const [timeInput, setTimeInput] = useState("10:00");
  const [times, setTimes] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const addTime = () => {
    if (!timeInput) return;
    if (times.includes(timeInput)) { toast.error("Time already added"); return; }
    setTimes(prev => [...prev, timeInput].sort());
    setTimeInput("");
  };

  const removeTime = (t: string) => setTimes(prev => prev.filter(x => x !== t));

  const previews = generateSlotPreviews(startDate, endDate, times, duration);

  const handleCreate = () => {
    if (!startDate || times.length === 0) { toast.error("Select at least one date and one time"); return; }
    if (previews.length === 0) { toast.error("No slots to create"); return; }
    onBulkAdd(previews.map(p => ({ scheduledAt: p.scheduledAt, duration })));
    setStartDate(""); setEndDate(""); setTimes([]);
    setShowPreview(false);
  };

  return (
    <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl border border-pink-100 p-5">
      <h3 className="font-display font-bold text-gray-800 mb-4 flex items-center gap-2">
        <Plus className="h-4 w-4 text-pink-500" /> Create Interview Slots
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Start Date</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            className="w-full px-3 py-2 rounded-xl border border-pink-200 bg-white text-sm outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-200" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">End Date <span className="text-gray-400 font-normal">(optional — for recurring)</span></label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            min={startDate || new Date().toISOString().split("T")[0]}
            className="w-full px-3 py-2 rounded-xl border border-pink-200 bg-white text-sm outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-200" />
        </div>
      </div>

      <div className="mb-4">
        <label className="text-xs font-semibold text-gray-500 mb-1 block">Add Time Slots</label>
        <div className="flex gap-2">
          <input type="time" value={timeInput} onChange={e => setTimeInput(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl border border-pink-200 bg-white text-sm outline-none focus:border-pink-400" />
          <Button type="button" onClick={addTime} size="sm"
            className="rounded-xl bg-pink-500 hover:bg-pink-600 text-white gap-1">
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        </div>
        {times.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {times.map(t => (
              <span key={t} className="flex items-center gap-1 px-3 py-1 bg-white border border-pink-200 rounded-full text-xs font-semibold text-pink-600">
                {t}
                <button onClick={() => removeTime(t)} className="text-pink-400 hover:text-red-500 ml-0.5">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mb-4">
        <label className="text-xs font-semibold text-gray-500 mb-1 block">Duration</label>
        <select value={duration} onChange={e => setDuration(Number(e.target.value))}
          className="w-full sm:w-40 px-3 py-2 rounded-xl border border-pink-200 bg-white text-sm outline-none focus:border-pink-400">
          {[15, 20, 30, 45, 60].map(d => <option key={d} value={d}>{d} minutes</option>)}
        </select>
      </div>

      {previews.length > 0 && (
        <div className="mb-4">
          <button onClick={() => setShowPreview(!showPreview)}
            className="text-xs font-semibold text-pink-600 hover:text-pink-700 flex items-center gap-1 mb-2">
            {showPreview ? "Hide" : "Preview"} {previews.length} slot{previews.length !== 1 ? "s" : ""}
          </button>
          {showPreview && (
            <div className="max-h-40 overflow-y-auto bg-white/80 rounded-xl border border-pink-100 p-3 space-y-1">
              {previews.map((p, i) => (
                <p key={i} className="text-xs text-gray-600 flex items-center gap-1.5">
                  <CalendarDays className="h-3 w-3 text-pink-400 flex-shrink-0" /> {p.label} · {duration}min
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      <Button onClick={handleCreate} disabled={isPending || previews.length === 0}
        className="bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl px-6 gap-2 shadow-lg shadow-pink-200/40 w-full sm:w-auto">
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Create {previews.length > 0 ? `${previews.length} Slot${previews.length !== 1 ? "s" : ""}` : "Slots"}
      </Button>
    </div>
  );
}

export default function AdminInterviewSlots() {
  const { data: slots, isLoading, refetch } = trpc.introCalls.all.useQuery(undefined, {
    staleTime: 10_000, refetchOnWindowFocus: false,
  });

  const create = trpc.introCalls.create.useMutation({
    onSuccess: () => { toast.success("Slot added!"); refetch(); },
    onError: (e: any) => toast.error(e.message),
  });

  const bulkCreate = trpc.introCalls.bulkCreate.useMutation({
    onSuccess: (data) => { toast.success(`${data.created} slot${data.created !== 1 ? "s" : ""} created! 🗓️`); refetch(); },
    onError: (e: any) => toast.error(e.message),
  });
  const update = trpc.introCalls.update.useMutation({
    onSuccess: () => { toast.success("Slot updated"); refetch(); },
    onError: (e: any) => toast.error(e.message),
  });
  const remove = trpc.introCalls.delete.useMutation({
    onSuccess: () => { toast.success("Slot removed"); refetch(); },
    onError: (e: any) => toast.error(e.message),
  });

  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = (slots ?? []).filter(s => statusFilter === "all" || s.status === statusFilter);
  const counts = {
    all: (slots ?? []).length,
    available: (slots ?? []).filter(s => s.status === "available").length,
    booked: (slots ?? []).filter(s => s.status === "booked").length,
    completed: (slots ?? []).filter(s => s.status === "completed").length,
  };

  return (
    <AdminLayout title="Interview Slots">
      {/* Add Slot Form */}
      <div className="mb-6">
        <AddSlotForm
          onBulkAdd={(slots) => bulkCreate.mutate({ slots })}
          isPending={bulkCreate.isPending}
        />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto scrollbar-hide pb-1">
        {(["all", "available", "booked", "completed"] as const).map(f => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              statusFilter === f
                ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white border-transparent shadow"
                : "bg-white/80 text-gray-500 border-pink-100 hover:border-pink-300"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
              statusFilter === f ? "bg-white/30" : "bg-pink-50 text-pink-600"
            }`}>
              {counts[f as keyof typeof counts] ?? (slots ?? []).length}
            </span>
          </button>
        ))}
      </div>

      {/* Slot list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-pink-400" />
          <span className="text-sm text-gray-400">Loading slots...</span>
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16 bg-white/80 rounded-2xl border border-pink-100/50"
        >
          <Calendar className="h-10 w-10 text-pink-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No slots yet</p>
          <p className="text-gray-400 text-sm mt-1">Add available times above for applicants to book</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map(slot => (
              <SlotCard
                key={slot.id}
                slot={slot}
                onUpdate={(id, data) => update.mutate({ id, ...data })}
                onDelete={(id) => remove.mutate({ id })}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </AdminLayout>
  );
}
