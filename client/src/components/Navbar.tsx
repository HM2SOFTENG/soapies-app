import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu, X, User, LogOut, LayoutDashboard, Shield, Bell,
  Calendar, MessageCircle, Users, Sparkles, ChevronRight,
  Check, CheckCheck, Clock, PartyPopper, UserCheck, AlertCircle
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState, useEffect, useRef } from "react";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663460303717/FfTbhpP94ZvscRd7twWNT6/soapies-logo_cf3c72b2.png";

const NAV_LINKS = [
  { href: "/events", label: "Events", icon: Calendar },
  { href: "/wall", label: "Community", icon: Users },
  { href: "/messages", label: "Messages", icon: MessageCircle },
];

function getNotificationIcon(type: string) {
  switch (type) {
    case "application_approved": return <PartyPopper className="h-4 w-4 text-green-500" />;
    case "application_rejected": return <AlertCircle className="h-4 w-4 text-red-500" />;
    case "application_waitlisted": return <Clock className="h-4 w-4 text-amber-500" />;
    case "event_reminder": return <Calendar className="h-4 w-4 text-pink-500" />;
    case "message": return <MessageCircle className="h-4 w-4 text-blue-500" />;
    default: return <Bell className="h-4 w-4 text-purple-500" />;
  }
}

function timeAgo(date: Date | string): string {
  const now = new Date();
  const d = new Date(date);
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
}

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  const { data: notifList } = trpc.notifications.list.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const { data: unreadCount = 0 } = trpc.notifications.unreadCount.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });

  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { setMobileOpen(false); setNotifOpen(false); }, [location]);

  // Close notification dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    if (notifOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [notifOpen]);

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  const recentNotifs = (notifList || []).slice(0, 8);

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 30 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "glass-strong shadow-lg shadow-pink-100/20"
            : "bg-white/40 backdrop-blur-md"
        }`}
      >
        <div className="container flex items-center justify-between h-16 sm:h-18">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 no-underline group">
            <motion.div
              whileHover={{ rotate: [0, -5, 5, 0], scale: 1.05 }}
              transition={{ duration: 0.5 }}
              className="relative"
            >
              <img src={LOGO_URL} alt="Soapies" className="h-10 w-10 rounded-xl object-contain" />
              <motion.div
                className="absolute -inset-1 rounded-xl bg-gradient-to-br from-pink-400/20 to-purple-400/20 -z-10"
                animate={{ opacity: [0, 0.5, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
            </motion.div>
            <span className="font-display text-xl font-black text-gradient hidden sm:block">
              Soapies
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const isActive = location === link.href || location.startsWith(link.href + "/");
              return (
                <Link key={link.href} href={link.href}>
                  <motion.div
                    whileHover={{ y: -2 }}
                    whileTap={{ y: 0 }}
                    className={`relative px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
                      isActive
                        ? "text-pink-600"
                        : "text-gray-600 hover:text-pink-500"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <link.icon className="h-4 w-4" />
                      {link.label}
                    </span>
                    {isActive && (
                      <motion.div
                        layoutId="nav-active"
                        className="absolute inset-0 rounded-xl bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-100/50 -z-10"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                  </motion.div>
                </Link>
              );
            })}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                {/* Notification Bell with Dropdown */}
                <div ref={notifRef} className="relative">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setNotifOpen(!notifOpen)}
                    className="relative p-2.5 rounded-xl hover:bg-pink-50 transition-colors"
                  >
                    <Bell className={`h-5 w-5 transition-colors ${notifOpen ? "text-pink-600" : "text-gray-600"}`} />
                    {unreadCount > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 text-white text-[10px] font-bold flex items-center justify-center shadow-lg"
                      >
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </motion.span>
                    )}
                  </motion.button>

                  {/* Notification Dropdown */}
                  <AnimatePresence>
                    {notifOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        className="absolute right-0 top-full mt-2 w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl bg-white/95 backdrop-blur-xl border border-pink-100/50 shadow-2xl shadow-pink-100/30 overflow-hidden z-50"
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                          <div className="flex items-center gap-2">
                            <h3 className="font-display font-bold text-gray-800">Notifications</h3>
                            {unreadCount > 0 && (
                              <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white text-[10px] font-bold">
                                {unreadCount}
                              </span>
                            )}
                          </div>
                          {unreadCount > 0 && (
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => markAllRead.mutate()}
                              className="flex items-center gap-1 text-xs font-semibold text-pink-500 hover:text-pink-600 transition-colors"
                            >
                              <CheckCheck className="h-3.5 w-3.5" />
                              Mark all read
                            </motion.button>
                          )}
                        </div>

                        {/* Notification List */}
                        <div className="max-h-[400px] overflow-y-auto">
                          {recentNotifs.length === 0 ? (
                            <div className="py-12 text-center">
                              <motion.div
                                animate={{ y: [0, -5, 0] }}
                                transition={{ duration: 2, repeat: Infinity }}
                              >
                                <Bell className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                              </motion.div>
                              <p className="text-sm text-gray-400 font-medium">No notifications yet</p>
                              <p className="text-xs text-gray-300 mt-1">We'll notify you when something happens</p>
                            </div>
                          ) : (
                            recentNotifs.map((n: any, i: number) => (
                              <motion.div
                                key={n.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.03 }}
                                onClick={() => {
                                  if (!n.isRead) markRead.mutate({ id: n.id });
                                }}
                                className={`flex gap-3 px-5 py-3.5 cursor-pointer transition-all hover:bg-pink-50/50 border-b border-gray-50 last:border-0 ${
                                  !n.isRead ? "bg-gradient-to-r from-pink-50/50 to-transparent" : ""
                                }`}
                              >
                                <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                  !n.isRead
                                    ? "bg-gradient-to-br from-pink-100 to-purple-100"
                                    : "bg-gray-50"
                                }`}>
                                  {getNotificationIcon(n.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className={`text-sm leading-snug ${!n.isRead ? "font-semibold text-gray-800" : "text-gray-600"}`}>
                                      {n.title}
                                    </p>
                                    {!n.isRead && (
                                      <div className="w-2 h-2 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex-shrink-0 mt-1.5" />
                                    )}
                                  </div>
                                  {n.body && (
                                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{n.body}</p>
                                  )}
                                  <p className="text-[10px] text-gray-300 mt-1 flex items-center gap-1">
                                    <Clock className="h-2.5 w-2.5" />
                                    {timeAgo(n.createdAt)}
                                  </p>
                                </div>
                              </motion.div>
                            ))
                          )}
                        </div>

                        {/* Footer */}
                        {recentNotifs.length > 0 && (
                          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
                            <button
                              onClick={() => { setNotifOpen(false); setLocation("/dashboard"); }}
                              className="w-full text-center text-xs font-semibold text-pink-500 hover:text-pink-600 transition-colors"
                            >
                              View all notifications
                            </button>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* User avatar */}
                <div className="hidden md:flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    onClick={() => setLocation("/dashboard")}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass-pink hover:shadow-md transition-all"
                  >
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                      {user?.name?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                    <span className="text-sm font-semibold text-gray-700 max-w-[100px] truncate">
                      {user?.name?.split(" ")[0] || "User"}
                    </span>
                  </motion.button>

                  {user?.role === "admin" && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setLocation("/admin")}
                      className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-md hover:shadow-lg transition-all"
                    >
                      <Shield className="h-4 w-4" />
                    </motion.button>
                  )}
                </div>
              </>
            ) : (
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  onClick={() => window.location.href = getLoginUrl()}
                  className="btn-premium rounded-xl px-5 py-2 text-sm gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Join Now</span>
                </Button>
              </motion.div>
            )}

            {/* Mobile hamburger */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2.5 rounded-xl hover:bg-pink-50 transition-colors"
            >
              <AnimatePresence mode="wait">
                {mobileOpen ? (
                  <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                    <X className="h-5 w-5 text-gray-700" />
                  </motion.div>
                ) : (
                  <motion.div key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
                    <Menu className="h-5 w-5 text-gray-700" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </motion.nav>

      {/* ─── MOBILE MENU ──────────────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden"
            />
            <motion.div
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed top-0 right-0 bottom-0 w-[85%] max-w-sm z-50 bg-white/95 backdrop-blur-xl shadow-2xl md:hidden overflow-y-auto"
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2">
                    <img src={LOGO_URL} alt="Soapies" className="h-8 w-8 rounded-lg" />
                    <span className="font-display text-lg font-black text-gradient">Soapies</span>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setMobileOpen(false)}
                    className="p-2 rounded-xl bg-gray-100"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </motion.button>
                </div>

                {/* User card */}
                {isAuthenticated && user && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-6 p-4 rounded-2xl bg-gradient-to-br from-pink-50 to-purple-50 border border-pink-100/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white text-lg font-bold shadow-md">
                        {user.name?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                      <div>
                        <p className="font-display font-bold text-gray-800">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Notification summary in mobile */}
                {isAuthenticated && unreadCount > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="mb-4 p-3 rounded-xl bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-100/50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center">
                          <Bell className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{unreadCount} new notification{unreadCount !== 1 ? "s" : ""}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => markAllRead.mutate()}
                        className="text-xs font-semibold text-pink-500"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Nav links */}
                <div className="space-y-1.5">
                  {NAV_LINKS.map((link, i) => {
                    const isActive = location === link.href;
                    return (
                      <motion.div
                        key={link.href}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 * i }}
                      >
                        <Link href={link.href}>
                          <div
                            className={`flex items-center justify-between p-3.5 rounded-xl transition-all ${
                              isActive
                                ? "bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-100/50"
                                : "hover:bg-gray-50"
                            }`}
                          >
                            <span className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                                isActive
                                  ? "bg-gradient-to-br from-pink-400 to-purple-500 text-white shadow-md"
                                  : "bg-gray-100 text-gray-500"
                              }`}>
                                <link.icon className="h-4 w-4" />
                              </div>
                              <span className={`font-semibold text-sm ${isActive ? "text-pink-600" : "text-gray-700"}`}>
                                {link.label}
                              </span>
                            </span>
                            <ChevronRight className={`h-4 w-4 ${isActive ? "text-pink-400" : "text-gray-300"}`} />
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })}

                  {isAuthenticated && (
                    <>
                      <div className="my-3 border-t border-gray-100" />
                      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                        <Link href="/dashboard">
                          <div className="flex items-center justify-between p-3.5 rounded-xl hover:bg-gray-50 transition-all">
                            <span className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center">
                                <LayoutDashboard className="h-4 w-4" />
                              </div>
                              <span className="font-semibold text-sm text-gray-700">Dashboard</span>
                            </span>
                            <ChevronRight className="h-4 w-4 text-gray-300" />
                          </div>
                        </Link>
                      </motion.div>
                      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}>
                        <Link href="/profile">
                          <div className="flex items-center justify-between p-3.5 rounded-xl hover:bg-gray-50 transition-all">
                            <span className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center">
                                <User className="h-4 w-4" />
                              </div>
                              <span className="font-semibold text-sm text-gray-700">Profile</span>
                            </span>
                            <ChevronRight className="h-4 w-4 text-gray-300" />
                          </div>
                        </Link>
                      </motion.div>
                      {user?.role === "admin" && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                          <Link href="/admin">
                            <div className="flex items-center justify-between p-3.5 rounded-xl hover:bg-gray-50 transition-all">
                              <span className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center shadow-md">
                                  <Shield className="h-4 w-4" />
                                </div>
                                <span className="font-semibold text-sm text-gray-700">Admin Panel</span>
                              </span>
                              <ChevronRight className="h-4 w-4 text-gray-300" />
                            </div>
                          </Link>
                        </motion.div>
                      )}
                    </>
                  )}
                </div>

                {/* Bottom actions */}
                <div className="mt-8 space-y-3">
                  {isAuthenticated ? (
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={handleLogout}
                      className="w-full flex items-center justify-center gap-2 p-3.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all"
                    >
                      <LogOut className="h-4 w-4" /> Sign Out
                    </motion.button>
                  ) : (
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={() => window.location.href = getLoginUrl()}
                      className="w-full btn-premium p-3.5 rounded-xl text-sm flex items-center justify-center gap-2"
                    >
                      <Sparkles className="h-4 w-4" /> Join Soapies
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
