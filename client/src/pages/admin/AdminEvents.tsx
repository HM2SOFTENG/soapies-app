import AdminLayout from "./AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Calendar, Loader2, Edit, Trash2, X, MapPin, Users,
  Clock, DollarSign, Eye, Search, Filter, Sparkles, MoreVertical, Settings
} from "lucide-react";
import { useState, useMemo } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { format } from "date-fns";

export default function AdminEvents() {
  const { data: events, isLoading } = trpc.events.all.useQuery(undefined, {
    retry: false, staleTime: 15_000, refetchOnWindowFocus: false,
  });
  const utils = trpc.useUtils();
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const toggleSelect = (id: number) => setSelectedIds(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
  });
  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((e: any) => e.id)));
  };
  const [form, setForm] = useState({
    title: "", description: "", venue: "", address: "", startDate: "", endDate: "",
    capacity: "", priceSingleFemale: "", priceSingleMale: "", priceCouple: "", eventType: "party",
  });

  const createEvent = trpc.events.create.useMutation({
    onSuccess: () => {
      toast.success("Event created!", { icon: "🎉" });
      utils.events.all.invalidate();
      setShowCreate(false);
      setForm({ title: "", description: "", venue: "", address: "", startDate: "", endDate: "", capacity: "", priceSingleFemale: "", priceSingleMale: "", priceCouple: "", eventType: "party" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteEvent = trpc.events.delete.useMutation({
    onSuccess: () => { toast.success("Event deleted"); utils.events.all.invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  const bulkDelete = trpc.events.bulkDelete.useMutation({
    onSuccess: () => { toast.success(`${selectedIds.size} events deleted`); utils.events.all.invalidate(); setSelectedIds(new Set()); },
    onError: (e: any) => toast.error(e.message),
  });

  const bulkPublish = trpc.events.bulkUpdateStatus.useMutation({
    onSuccess: () => { toast.success(`${selectedIds.size} events published`); utils.events.all.invalidate(); setSelectedIds(new Set()); },
    onError: (e: any) => toast.error(e.message),
  });

  const bulkDraft = trpc.events.bulkUpdateStatus.useMutation({
    onSuccess: () => { toast.success(`${selectedIds.size} events set to draft`); utils.events.all.invalidate(); setSelectedIds(new Set()); },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    if (!events) return [];
    return events.filter((e: any) => {
      const matchSearch = !search || e.title.toLowerCase().includes(search.toLowerCase());
      const matchType = filterType === "all" || e.eventType === filterType;
      return matchSearch && matchType;
    });
  }, [events, search, filterType]);

  const eventTypes = ["all", "party", "social", "retreat", "festival", "other"];

  return (
    <AdminLayout title="Events Management">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <p className="text-gray-400 text-sm">Manage all {events?.length || 0} community events</p>
        </div>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            onClick={() => setShowCreate(!showCreate)}
            className="bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl gap-2 shadow-lg shadow-pink-200/30"
          >
            {showCreate ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showCreate ? "Cancel" : "Create Event"}
          </Button>
        </motion.div>
      </div>

      {/* Create Form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-8"
          >
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-pink-100/50 shadow-xl">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-display text-lg font-bold text-gray-800">New Event</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Title *</label>
                  <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Event title" className="rounded-xl border-pink-100 focus:border-pink-300" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Description</label>
                  <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Event description" rows={3} className="w-full px-4 py-3 rounded-xl border border-pink-100 text-sm outline-none focus:border-pink-300 focus:ring-1 focus:ring-pink-200/50 bg-white/50" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Venue</label>
                  <Input value={form.venue} onChange={e => setForm(p => ({ ...p, venue: e.target.value }))} placeholder="Venue name" className="rounded-xl border-pink-100" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Address</label>
                  <Input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="Full address" className="rounded-xl border-pink-100" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Start Date</label>
                  <Input type="datetime-local" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} className="rounded-xl border-pink-100" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">End Date</label>
                  <Input type="datetime-local" value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} className="rounded-xl border-pink-100" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Capacity</label>
                  <Input type="number" value={form.capacity} onChange={e => setForm(p => ({ ...p, capacity: e.target.value }))} placeholder="100" className="rounded-xl border-pink-100" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Event Type</label>
                  <select value={form.eventType} onChange={e => setForm(p => ({ ...p, eventType: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-pink-100 text-sm outline-none focus:border-pink-300 bg-white/50">
                    <option value="party">Party</option>
                    <option value="social">Social</option>
                    <option value="retreat">Retreat</option>
                    <option value="festival">Festival</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Price (Female)</label>
                  <Input type="number" value={form.priceSingleFemale} onChange={e => setForm(p => ({ ...p, priceSingleFemale: e.target.value }))} placeholder="40" className="rounded-xl border-pink-100" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Price (Male)</label>
                  <Input type="number" value={form.priceSingleMale} onChange={e => setForm(p => ({ ...p, priceSingleMale: e.target.value }))} placeholder="145" className="rounded-xl border-pink-100" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Price (Couple)</label>
                  <Input type="number" value={form.priceCouple} onChange={e => setForm(p => ({ ...p, priceCouple: e.target.value }))} placeholder="130" className="rounded-xl border-pink-100" />
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    onClick={() => createEvent.mutate({
                      title: form.title,
                      description: form.description || undefined,
                      venue: form.venue || undefined,
                      address: form.address || undefined,
                      startDate: form.startDate ? new Date(form.startDate).toISOString() : "",
                      endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
                      capacity: form.capacity ? parseInt(form.capacity) : undefined,
                      priceSingleFemale: form.priceSingleFemale || undefined,
                      priceSingleMale: form.priceSingleMale || undefined,
                      priceCouple: form.priceCouple || undefined,
                      eventType: form.eventType as any,
                    })}
                    disabled={!form.title || createEvent.isPending}
                    className="bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl px-8 gap-2 shadow-lg shadow-pink-200/30"
                  >
                    {createEvent.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Create Event
                  </Button>
                </motion.div>
                <Button variant="outline" onClick={() => setShowCreate(false)} className="rounded-xl border-pink-200">Cancel</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search events..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-pink-100 bg-white/70 text-sm outline-none focus:border-pink-300 focus:ring-1 focus:ring-pink-200/50 placeholder:text-gray-300"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {eventTypes.map(type => (
            <motion.button
              key={type}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setFilterType(type)}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                filterType === type
                  ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md"
                  : "bg-white/70 text-gray-500 border border-pink-100 hover:border-pink-200"
              }`}
            >
              {type === "all" ? "All" : type.charAt(0).toUpperCase() + type.slice(1)}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Bulk Action Toolbar */}
      {filtered.length > 0 && (
        <div className="flex items-center gap-3 mb-4 px-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedIds.size === filtered.length && filtered.length > 0}
              onChange={toggleSelectAll}
              className="rounded border-pink-200 text-pink-500"
            />
            <span className="text-xs text-gray-500 font-medium">
              {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select all"}
            </span>
          </label>
          {selectedIds.size > 0 && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2">
              <Button size="sm" onClick={() => bulkPublish.mutate({ ids: Array.from(selectedIds), status: "published" })}
                disabled={bulkPublish.isPending}
                className="rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white text-xs gap-1 h-7 px-3">
                <Eye className="h-3 w-3" /> Publish
              </Button>
              <Button size="sm" variant="outline" onClick={() => bulkDraft.mutate({ ids: Array.from(selectedIds), status: "draft" })}
                disabled={bulkDraft.isPending}
                className="rounded-xl border-gray-200 text-gray-500 text-xs gap-1 h-7 px-3">
                Set Draft
              </Button>
              <Button size="sm" variant="outline" onClick={() => bulkDelete.mutate({ ids: Array.from(selectedIds) })}
                disabled={bulkDelete.isPending}
                className="rounded-xl border-red-200 text-red-500 hover:bg-red-50 text-xs gap-1 h-7 px-3">
                <Trash2 className="h-3 w-3" /> Delete
              </Button>
              <button onClick={() => setSelectedIds(new Set())} className="text-gray-400 hover:text-gray-600 ml-1">
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          )}
        </div>
      )}

      {/* Events List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-pink-400" />
          <p className="text-sm text-gray-400">Loading events...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white/80 backdrop-blur-sm rounded-2xl border border-pink-100/50">
          <Calendar className="h-12 w-12 text-pink-200 mx-auto mb-4" />
          <p className="text-gray-400 font-medium">
            {search || filterType !== "all" ? "No events match your filter" : "No events yet. Create your first event!"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((event: any, i: number) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              whileHover={{ y: -2 }}
              className={`bg-white/80 backdrop-blur-sm rounded-2xl p-5 border shadow-md hover:shadow-lg transition-all group ${selectedIds.has(event.id) ? "border-pink-300 bg-pink-50/30" : "border-pink-100/50"}`}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {/* Checkbox */}
                <input type="checkbox" checked={selectedIds.has(event.id)} onChange={() => toggleSelect(event.id)}
                  className="mt-1 rounded border-pink-200 text-pink-500 cursor-pointer flex-shrink-0" />
                {/* Date Badge */}
                <div className="hidden sm:flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-pink-50 to-purple-50 border border-pink-100/50 shrink-0">
                  {event.startDate ? (
                    <>
                      <span className="text-[10px] font-bold text-pink-500 uppercase">{format(new Date(event.startDate), "MMM")}</span>
                      <span className="text-xl font-black text-gray-800">{format(new Date(event.startDate), "d")}</span>
                    </>
                  ) : (
                    <Calendar className="h-6 w-6 text-pink-300" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <h3 className="font-display font-bold text-gray-800 truncate">{event.title}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      event.status === "published" ? "bg-emerald-50 text-emerald-600" :
                      event.status === "draft" ? "bg-gray-100 text-gray-500" :
                      "bg-amber-50 text-amber-600"
                    }`}>{event.status}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                    {event.startDate && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {format(new Date(event.startDate), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                    )}
                    {event.venue && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {event.venue}
                      </span>
                    )}
                    {event.capacity && (
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" /> {event.capacity} capacity
                      </span>
                    )}
                    {(event.priceSingleFemale || event.priceCouple) && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        ${event.priceSingleFemale || 0} / ${event.priceCouple || 0} / ${event.priceSingleMale || 0}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <Link href={`/admin/events/${event.id}`}>
                    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                      <Button size="sm" className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl gap-1 h-9">
                        <Settings className="h-3 w-3" /> Manage
                      </Button>
                    </motion.div>
                  </Link>
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <Button size="sm" variant="outline" className="rounded-xl border-pink-200 text-pink-600 gap-1 h-9" onClick={() => toast.info("Edit feature coming soon")}>
                      <Edit className="h-3 w-3" /> Edit
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <Button size="sm" variant="outline" className="rounded-xl border-red-200 text-red-500 gap-1 h-9" onClick={() => deleteEvent.mutate({ id: event.id })}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
