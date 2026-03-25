import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "./AdminLayout";
import { motion } from "framer-motion";
import { Megaphone, Plus, Power, Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function AdminAnnouncements() {
  const utils = trpc.useUtils();
  const { data: announcements, isLoading } = trpc.announcements.list.useQuery();
  const createMutation = trpc.announcements.create.useMutation({
    onSuccess: () => { utils.announcements.list.invalidate(); resetForm(); toast.success("Announcement created!"); },
    onError: (e) => toast.error(e.message),
  });
  const deactivateMutation = trpc.announcements.deactivate.useMutation({
    onSuccess: () => { utils.announcements.list.invalidate(); toast.success("Announcement deactivated"); },
    onError: (e) => toast.error(e.message),
  });

  const [form, setForm] = useState({
    title: "",
    content: "",
    targetAudience: "all",
    expiresAt: "",
    dismissible: true,
    isActive: true,
  });
  const [showForm, setShowForm] = useState(false);

  const resetForm = () => {
    setForm({ title: "", content: "", targetAudience: "all", expiresAt: "", dismissible: true, isActive: true });
    setShowForm(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setForm(f => ({ ...f, [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) { toast.error("Title and content are required"); return; }
    createMutation.mutate({
      title: form.title,
      content: form.content,
      targetAudience: form.targetAudience,
      expiresAt: form.expiresAt || undefined,
      dismissible: form.dismissible,
      isActive: form.isActive,
    });
  };

  const getStatus = (a: any) => {
    if (!a.isActive) return { label: "Inactive", color: "bg-gray-100 text-gray-500" };
    if (a.expiresAt && new Date(a.expiresAt) < new Date()) return { label: "Expired", color: "bg-red-50 text-red-500" };
    return { label: "Active", color: "bg-green-50 text-green-600" };
  };

  return (
    <AdminLayout title="Announcements">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-md">
              <Megaphone className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-display text-xl font-black text-gray-800">Announcements</h2>
              <p className="text-sm text-gray-400">Manage site-wide announcements</p>
            </div>
          </div>
          <Button
            onClick={() => setShowForm(v => !v)}
            className="bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl gap-2"
          >
            <Plus className="h-4 w-4" /> New Announcement
          </Button>
        </div>

        {/* Create form */}
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-pink-100/50 shadow-sm p-6"
          >
            <h3 className="font-semibold text-gray-800 mb-4">Create Announcement</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Title</label>
                <Input name="title" value={form.title} onChange={handleChange} placeholder="Announcement title" className="rounded-xl" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Content</label>
                <textarea
                  name="content"
                  value={form.content}
                  onChange={handleChange}
                  placeholder="Announcement content..."
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-100 px-3 py-2 text-sm resize-none outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Target Audience</label>
                  <select
                    name="targetAudience"
                    value={form.targetAudience}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-200 focus:border-pink-400 px-3 py-2 text-sm outline-none bg-white"
                  >
                    <option value="all">All</option>
                    <option value="members">Members</option>
                    <option value="angels">Angels</option>
                    <option value="admins">Admins</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Expires At (optional)</label>
                  <Input name="expiresAt" type="datetime-local" value={form.expiresAt} onChange={handleChange} className="rounded-xl" />
                </div>
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    name="dismissible"
                    checked={form.dismissible}
                    onChange={handleChange}
                    className="rounded"
                  />
                  Dismissible
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={form.isActive}
                    onChange={handleChange}
                    className="rounded"
                  />
                  Active immediately
                </label>
              </div>
              <div className="flex gap-3">
                <Button type="submit" disabled={createMutation.isPending} className="bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl gap-2">
                  {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Create
                </Button>
                <Button type="button" variant="outline" onClick={resetForm} className="rounded-xl">Cancel</Button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Announcements list */}
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 text-pink-400 animate-spin" /></div>
        ) : (
          <div className="space-y-3">
            {(!announcements || announcements.length === 0) ? (
              <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-pink-100/50">
                No announcements yet
              </div>
            ) : (
              announcements.map((a, i) => {
                const status = getStatus(a);
                return (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-white rounded-2xl border border-pink-100/50 shadow-sm p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-800">{a.title}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${status.color}`}>
                            {status.label}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-600 font-medium">
                            {a.targetAudience ?? "all"}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 line-clamp-2">{a.content}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                          <span>Created: {new Date(a.createdAt).toLocaleDateString()}</span>
                          {a.expiresAt && <span>Expires: {new Date(a.expiresAt).toLocaleDateString()}</span>}
                          <span>{a.dismissible ? "Dismissible" : "Non-dismissible"}</span>
                        </div>
                      </div>
                      {a.isActive && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deactivateMutation.mutate({ id: a.id })}
                          className="rounded-xl gap-1.5 text-red-500 border-red-200 hover:bg-red-50 flex-shrink-0"
                          disabled={deactivateMutation.isPending}
                        >
                          <Power className="h-3.5 w-3.5" /> Deactivate
                        </Button>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
