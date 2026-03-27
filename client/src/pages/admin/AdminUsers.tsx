import AdminLayout from "./AdminLayout";
import { trpc } from "@/lib/trpc";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Loader2, Search, Shield, User, Mail, Clock, MoreHorizontal,
  ChevronRight, Eye, Lock, Unlock, Trash2, FileText, Image as ImageIcon,
  AlertTriangle, X, Check, Download, Plus, Edit2, Sparkles,
} from "lucide-react";
import { useState, useMemo } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type TabId = "users" | "changeRequests" | "photos";

export default function AdminUsers() {
  const [activeTab, setActiveTab] = useState<TabId>("users");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [actionType, setActionType] = useState<"suspend" | "unsuspend" | "delete" | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [editingRoleUserId, setEditingRoleUserId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  // Queries
  const { data: users, isLoading: usersLoading } = trpc.admin.users.useQuery(undefined, {
    retry: false, staleTime: 15_000, refetchOnWindowFocus: false,
  });

  const { data: pendingProfileRequests } = trpc.changeRequests.pendingProfile.useQuery(undefined, {
    retry: false, staleTime: 15_000, refetchOnWindowFocus: false,
  });

  const { data: pendingGroupRequests } = trpc.changeRequests.pendingGroup.useQuery(undefined, {
    retry: false, staleTime: 15_000, refetchOnWindowFocus: false,
  });

  const { data: pendingPhotos } = trpc.photoModeration.pending.useQuery(undefined, {
    retry: false, staleTime: 15_000, refetchOnWindowFocus: false,
  });

  // Mutations
  const suspendUserMut = trpc.admin.suspendUser.useMutation({
    onSuccess: () => {
      toast.success("User suspended", { icon: "🔒" });
      utils.admin.users.invalidate();
      setSelectedUser(null);
      setActionType(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const unsuspendUserMut = trpc.admin.unsuspendUser.useMutation({
    onSuccess: () => {
      toast.success("User unsuspended", { icon: "🔓" });
      utils.admin.users.invalidate();
      setSelectedUser(null);
      setActionType(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteUserMut = trpc.admin.deleteUser.useMutation({
    onSuccess: () => {
      toast.success("User deleted", { icon: "✓" });
      utils.admin.users.invalidate();
      setSelectedUser(null);
      setActionType(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const reviewProfileReqMut = trpc.changeRequests.reviewProfile.useMutation({
    onSuccess: () => {
      toast.success("Change request reviewed", { icon: "✓" });
      utils.changeRequests.pendingProfile.invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const reviewGroupReqMut = trpc.changeRequests.reviewGroup.useMutation({
    onSuccess: () => {
      toast.success("Change request reviewed", { icon: "✓" });
      utils.changeRequests.pendingGroup.invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const reviewPhotoMut = trpc.photoModeration.review.useMutation({
    onSuccess: () => {
      utils.photoModeration.pending.invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateRoleMut = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => {
      toast.success("Role updated", { icon: "✓" });
      utils.admin.users.invalidate();
      setEditingRoleUserId(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const bulkDeleteMut = trpc.admin.bulkDeleteUsers.useMutation({
    onSuccess: () => {
      toast.success(`${selectedIds.size} users deleted`, { icon: "✓" });
      utils.admin.users.invalidate();
      setSelectedIds(new Set());
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedUsers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedUsers.map((u: any) => u.id)));
    }
  };

  // Filtered users — filter by memberRole (member/angel/admin) or appStatus
  const filtered = useMemo(() => {
    if (!users) return [];
    return users.filter((u: any) => {
      const q = search.toLowerCase();
      const matchSearch = !search || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
      const memberRole = u.profile?.memberRole ?? "member";
      const appStatus = u.profile?.applicationStatus ?? "draft";
      const matchRole = roleFilter === "all"
        || roleFilter === memberRole
        || (roleFilter === "approved" && appStatus === "approved")
        || (roleFilter === "pending" && ["submitted", "under_review"].includes(appStatus));
      return matchSearch && matchRole;
    });
  }, [users, search, roleFilter]);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const adminCount = users?.filter((u: any) => u.profile?.memberRole === "admin").length || 0;
  const angelCount = users?.filter((u: any) => u.profile?.memberRole === "angel").length || 0;
  const memberCount = users?.filter((u: any) => u.profile?.memberRole === "member").length || 0;

  const handleAction = () => {
    if (!selectedUser || !actionType) return;
    if (actionType === "suspend") suspendUserMut.mutate({ userId: selectedUser });
    else if (actionType === "unsuspend") unsuspendUserMut.mutate({ userId: selectedUser });
    else if (actionType === "delete") deleteUserMut.mutate({ userId: selectedUser });
  };

  return (
    <AdminLayout title="User Management">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)} className="w-full">
        <TabsList className="mb-6 bg-white/70 border border-pink-100/50 backdrop-blur-sm rounded-xl">
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" /> Users
          </TabsTrigger>
          <TabsTrigger value="changeRequests" className="gap-2">
            <FileText className="h-4 w-4" /> Change Requests
          </TabsTrigger>
          <TabsTrigger value="photos" className="gap-2">
            <ImageIcon className="h-4 w-4" /> Photos
          </TabsTrigger>
        </TabsList>

        {/* USERS TAB */}
        <TabsContent value="users" className="space-y-6">
          {/* Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total", value: users?.length || 0, gradient: "from-pink-400 to-rose-500" },
              { label: "Members", value: memberCount, gradient: "from-purple-400 to-indigo-500" },
              { label: "Angels", value: angelCount, gradient: "from-fuchsia-400 to-pink-500" },
              { label: "Admins", value: adminCount, gradient: "from-violet-400 to-purple-500" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-pink-100/50 text-center"
              >
                <p className="text-2xl font-black text-gray-800">{stat.value}</p>
                <p className="text-xs text-gray-400 font-medium">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                placeholder="Search by name or email..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-pink-100 bg-white/70 text-sm outline-none focus:border-pink-300 focus:ring-1 focus:ring-pink-200/50 placeholder:text-gray-300"
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
              {[
                { key: "all", label: "All" },
                { key: "approved", label: "Approved" },
                { key: "pending", label: "Pending" },
                { key: "member", label: "Members" },
                { key: "angel", label: "Angels" },
                { key: "admin", label: "Admins" },
              ].map(({ key, label }) => (
                <motion.button
                  key={key}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setRoleFilter(key); setCurrentPage(1); }}
                  className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    roleFilter === key
                      ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md"
                      : "bg-white/70 text-gray-500 border border-pink-100"
                  }`}
                >
                  {label}
                </motion.button>
              ))}
            </div>

            {/* Bulk actions */}
            {selectedIds.size > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2"
              >
                <span className="text-xs text-gray-500 font-medium">{selectedIds.size} selected</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => bulkDeleteMut.mutate({ userIds: Array.from(selectedIds) })}
                  disabled={bulkDeleteMut.isPending}
                  className="rounded-xl border-red-200 text-red-500 hover:bg-red-50 text-xs gap-1"
                >
                  <Trash2 className="h-3 w-3" /> Delete Selected
                </Button>
                <Button size="sm" variant="outline" onClick={() => setSelectedIds(new Set())} className="rounded-xl text-xs">
                  <X className="h-3 w-3" />
                </Button>
              </motion.div>
            )}
          
          </div>

          {/* Users Table/Cards */}
          {usersLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-pink-400" />
              <p className="text-sm text-gray-400">Loading users...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 bg-white/80 backdrop-blur-sm rounded-2xl border border-pink-100/50">
              <Users className="h-12 w-12 text-pink-200 mx-auto mb-4" />
              <p className="text-gray-400 font-medium">{search ? "No users match your search" : "No users yet"}</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block bg-white/80 backdrop-blur-sm rounded-2xl border border-pink-100/50 shadow-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-pink-100/50 bg-pink-50/30">
                      <th className="px-4 py-3.5">
                        <input type="checkbox"
                          checked={selectedIds.size === paginatedUsers.length && paginatedUsers.length > 0}
                          onChange={toggleSelectAll}
                          className="rounded border-pink-200 text-pink-500 cursor-pointer"
                        />
                      </th>
                      <th className="text-left px-5 py-3.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">User</th>
                      <th className="text-left px-5 py-3.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="text-left px-5 py-3.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Phone</th>
                      <th className="text-left px-5 py-3.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="text-left px-5 py-3.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="text-left px-5 py-3.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Joined</th>
                      <th className="px-5 py-3.5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedUsers.map((u: any, i: number) => {
                      const memberRole = u.profile?.memberRole ?? "member";
                      const roleColors: Record<string, string> = {
                        admin: "bg-purple-50 text-purple-600 border-purple-100",
                        angel: "bg-fuchsia-50 text-fuchsia-600 border-fuchsia-100",
                        member: "bg-pink-50 text-pink-600 border-pink-100",
                      };
                      return (
                        <motion.tr
                          key={u.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.02 }}
                          className={`border-b border-pink-50/50 hover:bg-pink-50/30 transition-colors group ${u.isSuspended ? "opacity-50" : ""} ${selectedIds.has(u.id) ? "bg-pink-50/40" : ""}`}
                        >
                          <td className="px-4 py-4">
                            <input type="checkbox" checked={selectedIds.has(u.id)} onChange={() => toggleSelect(u.id)}
                              className="rounded border-pink-200 text-pink-500 cursor-pointer" />
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-300 to-purple-400 flex items-center justify-center shadow-md">
                                <span className="text-xs font-black text-white">{u.name?.charAt(0)?.toUpperCase() || "?"}</span>
                              </div>
                              <div>
                                <span className="text-sm font-bold text-gray-800">{u.name || "Anonymous"}</span>
                                {u.isSuspended && <span className="block text-[10px] text-red-500 font-bold">SUSPENDED</span>}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-500">{u.email || "—"}</td>
                          <td className="px-5 py-4 text-sm text-gray-500">{u.profile?.phone || u.phone || "—"}</td>
                          <td className="px-5 py-4">
                            {editingRoleUserId === u.id ? (
                              <div className="flex items-center gap-1">
                                <select
                                  defaultValue={memberRole}
                                  autoFocus
                                  onChange={e => updateRoleMut.mutate({ userId: u.id, memberRole: e.target.value as any })}
                                  className="text-xs border border-pink-200 rounded-lg px-2 py-1 outline-none focus:border-pink-400 bg-white"
                                >
                                  <option value="member">Member</option>
                                  <option value="angel">Angel</option>
                                  <option value="admin">Admin</option>
                                </select>
                                <button onClick={() => setEditingRoleUserId(null)} className="text-gray-400 hover:text-gray-600">
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setEditingRoleUserId(u.id)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border hover:opacity-80 transition-opacity cursor-pointer ${roleColors[memberRole] ?? roleColors.member}`}
                                title="Click to change role"
                              >
                                {memberRole === "admin" ? <Shield className="h-3 w-3" /> : memberRole === "angel" ? <Sparkles className="h-3 w-3" /> : <User className="h-3 w-3" />}
                                {memberRole.charAt(0).toUpperCase() + memberRole.slice(1)}
                                <Edit2 className="h-2.5 w-2.5 ml-0.5 opacity-50" />
                              </button>
                            )}
                          </td>
                          <td className="px-5 py-4 text-xs">
                            <div className="flex flex-col gap-1">
                              {(() => {
                                const appStatus = u.profile?.applicationStatus ?? null;
                                if (appStatus === "approved") {
                                  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">✓ Member</span>;
                                } else if (appStatus === "submitted" || appStatus === "under_review") {
                                  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">⏳ Pending</span>;
                                } else if (appStatus === "waitlisted") {
                                  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">📋 Waitlisted</span>;
                                } else if (appStatus === "rejected") {
                                  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">✗ Rejected</span>;
                                } else {
                                  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500 border border-gray-200">◌ Incomplete</span>;
                                }
                              })()}
                              {u.emailVerified ? (
                                <span className="text-gray-400">Verified</span>
                              ) : (
                                <span className="text-amber-500">Unverified</span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-xs text-gray-400">{format(new Date(u.createdAt), "MMM d, yyyy")}</td>
                          <td className="px-5 py-4">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              onClick={() => setSelectedUser(u.id)}
                              className="p-1.5 rounded-lg hover:bg-pink-50 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </motion.button>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {/* Mobile bulk select all */}
                <div className="flex items-center justify-between px-1 pb-1 border-b border-pink-50">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === paginatedUsers.length && paginatedUsers.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-pink-200 text-pink-500"
                    />
                    <span className="text-xs text-gray-500 font-medium">
                      {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select all"}
                    </span>
                  </label>
                  {selectedIds.size > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => bulkDeleteMut.mutate({ userIds: Array.from(selectedIds) })}
                      disabled={bulkDeleteMut.isPending}
                      className="rounded-xl border-red-200 text-red-500 hover:bg-red-50 text-xs gap-1 h-7 px-3"
                    >
                      <Trash2 className="h-3 w-3" /> Delete ({selectedIds.size})
                    </Button>
                  )}
                </div>

                {paginatedUsers.map((u: any, i: number) => {
                  const memberRole = u.profile?.memberRole ?? "member";
                  const roleColors: Record<string, string> = {
                    admin: "bg-purple-50 text-purple-600",
                    angel: "bg-fuchsia-50 text-fuchsia-600",
                    member: "bg-pink-50 text-pink-600",
                  };
                  return (
                    <motion.div
                      key={u.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className={`bg-white/80 backdrop-blur-sm rounded-xl p-4 border transition-all ${
                        selectedIds.has(u.id) ? "border-pink-300 bg-pink-50/30" : "border-pink-100/50"
                      } ${u.isSuspended ? "opacity-60" : ""}`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={selectedIds.has(u.id)}
                          onChange={() => toggleSelect(u.id)}
                          className="rounded border-pink-200 text-pink-500 cursor-pointer flex-shrink-0"
                        />
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-pink-300 to-purple-400 flex items-center justify-center shadow-md flex-shrink-0">
                          <span className="text-sm font-black text-white">{u.name?.charAt(0)?.toUpperCase() || "?"}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-800 truncate">{u.name || "Anonymous"}</p>
                          {u.isSuspended && <p className="text-[10px] text-red-600 font-bold">SUSPENDED</p>}
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <button
                              onClick={() => setEditingRoleUserId(editingRoleUserId === u.id ? null : u.id)}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold ${roleColors[memberRole] ?? roleColors.member}`}
                            >
                              {memberRole === "admin" ? <Shield className="h-2.5 w-2.5" /> : memberRole === "angel" ? <Sparkles className="h-2.5 w-2.5" /> : <User className="h-2.5 w-2.5" />}
                              {memberRole.charAt(0).toUpperCase() + memberRole.slice(1)}
                              <Edit2 className="h-2 w-2 opacity-50" />
                            </button>
                            {(() => {
                              const appStatus = u.profile?.applicationStatus ?? null;
                              if (appStatus === "approved") {
                                return <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">✓ Member</span>;
                              } else if (appStatus === "submitted" || appStatus === "under_review") {
                                return <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">⏳ Pending</span>;
                              } else if (appStatus === "waitlisted") {
                                return <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">📋 Waitlisted</span>;
                              } else if (appStatus === "rejected") {
                                return <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">✗ Rejected</span>;
                              } else {
                                return <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500 border border-gray-200">◌ Incomplete</span>;
                              }
                            })()}
                          </div>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          onClick={() => setSelectedUser(u.id)}
                          className="p-2 rounded-lg hover:bg-pink-50 text-gray-300 flex-shrink-0"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </motion.button>
                      </div>

                      {/* Role edit inline on mobile */}
                      {editingRoleUserId === u.id && (
                        <div className="flex items-center gap-2 mb-3 pl-12">
                          <select
                            defaultValue={memberRole}
                            autoFocus
                            onChange={e => updateRoleMut.mutate({ userId: u.id, memberRole: e.target.value as any })}
                            className="flex-1 text-sm border border-pink-200 rounded-xl px-3 py-2 outline-none focus:border-pink-400 bg-white"
                          >
                            <option value="member">Member</option>
                            <option value="angel">Angel</option>
                            <option value="admin">Admin</option>
                          </select>
                          <button onClick={() => setEditingRoleUserId(null)} className="text-gray-400 p-2">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}

                      <div className="space-y-1 text-xs text-gray-400 pl-12">
                        {u.email && <p className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> {u.email}</p>}
                        {(u.profile?.phone || u.phone) && <p className="flex items-center gap-1.5">📱 {u.profile?.phone || u.phone}</p>}
                        <p className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> Joined {format(new Date(u.createdAt), "MMM d, yyyy")}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                    className="rounded-lg"
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600 font-medium">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="rounded-lg"
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* CHANGE REQUESTS TAB */}
        <TabsContent value="changeRequests" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Profile Change Requests */}
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <FileText className="h-5 w-5 text-pink-500" />
                Profile Changes ({pendingProfileRequests?.length || 0})
              </h3>
              {!pendingProfileRequests || pendingProfileRequests.length === 0 ? (
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-8 border border-pink-100/50 text-center">
                  <p className="text-gray-400 text-sm">No pending profile change requests</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingProfileRequests.map((req: any) => (
                    <motion.div
                      key={req.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-pink-100/50 space-y-3"
                    >
                      <div className="text-sm">
                        <p className="font-bold text-gray-800">{req.fieldName}</p>
                        <p className="text-gray-500 text-xs">Current: <span className="font-mono text-gray-700">{req.currentValue || "—"}</span></p>
                        <p className="text-gray-500 text-xs">Requested: <span className="font-mono text-pink-600 font-bold">{req.requestedValue}</span></p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg h-8"
                          onClick={() => reviewProfileReqMut.mutate({ id: req.id, status: "approved" })}
                          disabled={reviewProfileReqMut.isPending}
                        >
                          <Check className="h-3 w-3 mr-1" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-red-200 text-red-600 rounded-lg h-8"
                          onClick={() => reviewProfileReqMut.mutate({ id: req.id, status: "denied" })}
                          disabled={reviewProfileReqMut.isPending}
                        >
                          <X className="h-3 w-3 mr-1" /> Deny
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Group Change Requests */}
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-500" />
                Group Changes ({pendingGroupRequests?.length || 0})
              </h3>
              {!pendingGroupRequests || pendingGroupRequests.length === 0 ? (
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-8 border border-pink-100/50 text-center">
                  <p className="text-gray-400 text-sm">No pending group change requests</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingGroupRequests.map((req: any) => (
                    <motion.div
                      key={req.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-pink-100/50 space-y-3"
                    >
                      <div className="text-sm">
                        <p className="font-bold text-gray-800">Group Change Request</p>
                        {req.reason && <p className="text-gray-500 text-xs">Reason: {req.reason}</p>}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg h-8"
                          onClick={() => reviewGroupReqMut.mutate({ id: req.id, status: "approved" })}
                          disabled={reviewGroupReqMut.isPending}
                        >
                          <Check className="h-3 w-3 mr-1" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-red-200 text-red-600 rounded-lg h-8"
                          onClick={() => reviewGroupReqMut.mutate({ id: req.id, status: "denied" })}
                          disabled={reviewGroupReqMut.isPending}
                        >
                          <X className="h-3 w-3 mr-1" /> Deny
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* PHOTOS TAB */}
        <TabsContent value="photos" className="space-y-6">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-pink-500" />
            Pending Photos ({pendingPhotos?.length || 0})
          </h3>
          {!pendingPhotos || pendingPhotos.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-12 border border-pink-100/50 text-center">
              <ImageIcon className="h-12 w-12 text-pink-200 mx-auto mb-4" />
              <p className="text-gray-400">No photos pending moderation</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {pendingPhotos.map((photo: any, i: number) => (
                <motion.div
                  key={photo.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white/80 backdrop-blur-sm rounded-xl border border-pink-100/50 overflow-hidden shadow-md hover:shadow-lg transition-shadow"
                >
                  <div className="aspect-square bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center">
                    <img
                      src={photo.photoUrl}
                      alt="Pending"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23f0f0f0' width='100' height='100'/%3E%3Ctext x='50' y='50' font-size='12' fill='%23999' text-anchor='middle' dy='.3em'%3EError%3C/text%3E%3C/svg%3E";
                      }}
                    />
                  </div>
                  <div className="p-3 space-y-3">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg h-8 text-xs"
                        onClick={() => reviewPhotoMut.mutate({ photoId: photo.id, status: "approved" })}
                        disabled={reviewPhotoMut.isPending}
                      >
                        <Check className="h-3 w-3 mr-1" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-red-200 text-red-600 rounded-lg h-8 text-xs"
                        onClick={() => reviewPhotoMut.mutate({ photoId: photo.id, status: "rejected" })}
                        disabled={reviewPhotoMut.isPending}
                      >
                        <X className="h-3 w-3 mr-1" /> Reject
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* User Actions Menu Modal */}
      <AnimatePresence>
        {selectedUser && !actionType && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedUser(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-pink-100/50 overflow-hidden"
            >
              <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-6 border-b border-pink-100/50">
                <h3 className="text-lg font-bold text-gray-800">User Actions</h3>
                <p className="text-sm text-gray-500">Select an action for this user</p>
              </div>
              <div className="p-6 space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start border-amber-200 text-amber-600 rounded-xl h-12 text-left gap-3 hover:bg-amber-50"
                  onClick={() => setActionType("suspend")}
                >
                  <Lock className="h-5 w-5" />
                  <div>
                    <p className="font-bold text-sm">Suspend User</p>
                    <p className="text-xs text-amber-500">Prevent login access</p>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start border-emerald-200 text-emerald-600 rounded-xl h-12 text-left gap-3 hover:bg-emerald-50"
                  onClick={() => setActionType("unsuspend")}
                >
                  <Unlock className="h-5 w-5" />
                  <div>
                    <p className="font-bold text-sm">Unsuspend User</p>
                    <p className="text-xs text-emerald-500">Restore access</p>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start border-red-200 text-red-600 rounded-xl h-12 text-left gap-3 hover:bg-red-50"
                  onClick={() => setActionType("delete")}
                >
                  <Trash2 className="h-5 w-5" />
                  <div>
                    <p className="font-bold text-sm">Delete User</p>
                    <p className="text-xs text-red-500">Permanent deletion</p>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="w-full rounded-xl"
                  onClick={() => setSelectedUser(null)}
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!actionType} onOpenChange={() => actionType && setActionType(null)}>
        <AlertDialogContent className="rounded-2xl border-pink-100/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-lg">
              {actionType === "delete" && <AlertTriangle className="h-5 w-5 text-red-600" />}
              {actionType === "suspend" && <Lock className="h-5 w-5 text-amber-600" />}
              {actionType === "unsuspend" && <Unlock className="h-5 w-5 text-emerald-600" />}
              {actionType === "delete" && "Delete User?"}
              {actionType === "suspend" && "Suspend User?"}
              {actionType === "unsuspend" && "Unsuspend User?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              {actionType === "delete" && "This will permanently delete the user and all their data. This cannot be undone."}
              {actionType === "suspend" && "The user will not be able to login or access their account."}
              {actionType === "unsuspend" && "The user will regain access to their account."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end mt-6">
            <AlertDialogCancel className="rounded-xl" onClick={() => setActionType(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className={`rounded-xl ${
                actionType === "delete"
                  ? "bg-red-600 hover:bg-red-700"
                  : actionType === "suspend"
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-emerald-600 hover:bg-emerald-700"
              }`}
              onClick={handleAction}
              disabled={suspendUserMut.isPending || unsuspendUserMut.isPending || deleteUserMut.isPending}
            >
              {actionType === "delete" && "Delete"}
              {actionType === "suspend" && "Suspend"}
              {actionType === "unsuspend" && "Unsuspend"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
