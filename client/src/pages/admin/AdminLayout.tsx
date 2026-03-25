import { useAuth } from "@/_core/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Calendar, Users, FileText, Settings, ArrowLeft,
  Menu, X, Shield, LogOut, Loader2, Sparkles, ChevronRight, Zap,
  Share2, CalendarCheck, ScrollText, Megaphone, FlaskConical, CreditCard
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663460303717/FfTbhpP94ZvscRd7twWNT6/soapies-logo_cf3c72b2.png";

const sidebarLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, color: "from-pink-400 to-rose-500" },
  { href: "/admin/events", label: "Events", icon: Calendar, color: "from-purple-400 to-indigo-500" },
  { href: "/admin/users", label: "Users", icon: Users, color: "from-fuchsia-400 to-pink-500" },
  { href: "/admin/applications", label: "Applications", icon: FileText, color: "from-violet-400 to-purple-500" },
  { href: "/admin/referrals", label: "Referrals", icon: Share2, color: "from-emerald-400 to-teal-500" },
  { href: "/admin/interview-slots", label: "Interview Slots", icon: CalendarCheck, color: "from-blue-400 to-cyan-500" },
  { href: "/admin/announcements", label: "Announcements", icon: Megaphone, color: "from-amber-400 to-orange-500" },
  { href: "/admin/test-results", label: "Test Results", icon: FlaskConical, color: "from-cyan-400 to-blue-500" },
  { href: "/admin/reservations", label: "Reservations", icon: CreditCard, color: "from-green-400 to-emerald-500" },
  { href: "/admin/audit", label: "Audit Log", icon: ScrollText, color: "from-orange-400 to-amber-500" },
  { href: "/admin/settings", label: "Settings", icon: Settings, color: "from-rose-400 to-pink-500" },
];

export default function AdminLayout({ children, title }: { children: React.ReactNode; title: string }) {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-pink-50 via-white to-purple-50 gap-4">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
          <Loader2 className="h-10 w-10 text-pink-400" />
        </motion.div>
        <p className="text-sm text-gray-400 font-medium">Loading admin panel...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-white to-purple-50">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center px-6">
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-flex w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-100 to-purple-100 items-center justify-center mb-6"
          >
            <Shield className="h-10 w-10 text-pink-400" />
          </motion.div>
          <h2 className="font-display text-2xl font-bold text-gray-700 mb-3">Admin Access Required</h2>
          <p className="text-gray-400 text-sm mb-6">Please sign in with an admin account to continue.</p>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button onClick={() => window.location.href = getLoginUrl()}
              className="bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl px-8 py-3 shadow-xl gap-2">
              <Sparkles className="h-4 w-4" /> Sign In
            </Button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-white to-purple-50">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center px-6">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-flex w-20 h-20 rounded-2xl bg-red-50 items-center justify-center mb-6"
          >
            <Shield className="h-10 w-10 text-red-400" />
          </motion.div>
          <h2 className="font-display text-2xl font-bold text-gray-700 mb-3">Access Denied</h2>
          <p className="text-gray-400 text-sm mb-6">You don't have admin privileges.</p>
          <Link href="/">
            <Button variant="outline" className="rounded-xl gap-2">
              <ArrowLeft className="h-4 w-4" /> Go Home
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  const initials = user?.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "AD";

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50/50 via-white to-purple-50/50 flex">
      {/* ─── Desktop Sidebar ──────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-72 fixed inset-y-0 left-0 z-40">
        <div className="flex flex-col h-full m-3 rounded-2xl bg-white/80 backdrop-blur-xl border border-pink-100/50 shadow-xl shadow-pink-50/30 overflow-hidden">
          {/* Logo */}
          <div className="p-5 border-b border-pink-50">
            <Link href="/" className="flex items-center gap-3 no-underline">
              <motion.img
                whileHover={{ rotate: 5, scale: 1.1 }}
                src={LOGO_URL}
                alt="Soapies"
                className="h-9"
              />
              <div>
                <span className="font-display font-black text-gray-800 text-lg">Soapies</span>
                <span className="flex items-center gap-1 text-[10px] text-pink-500 font-black uppercase tracking-widest">
                  <Zap className="h-2.5 w-2.5" /> Admin Panel
                </span>
              </div>
            </Link>
          </div>

          {/* Nav Links */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {sidebarLinks.map((link, i) => {
              const isActive = location === link.href;
              return (
                <Link key={link.href} href={link.href}>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    whileHover={{ x: 4 }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                      isActive
                        ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-200/40"
                        : "text-gray-500 hover:bg-pink-50/80 hover:text-pink-600"
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg ${isActive ? "bg-white/20" : `bg-gradient-to-br ${link.color} shadow-sm`}`}>
                      <link.icon className={`h-4 w-4 ${isActive ? "text-white" : "text-white"}`} />
                    </div>
                    <span className="flex-1">{link.label}</span>
                    {isActive && <ChevronRight className="h-4 w-4 text-white/60" />}
                  </motion.div>
                </Link>
              );
            })}
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-pink-50">
            <div className="flex items-center gap-3 px-3 py-2 mb-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center shadow-md">
                <span className="text-xs font-black text-white">{initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800 truncate">{user?.name}</p>
                <p className="text-[10px] text-pink-500 font-semibold">Administrator</p>
              </div>
            </div>
            <div className="space-y-0.5">
              <Link href="/">
                <motion.div whileHover={{ x: 4 }} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-pink-600 cursor-pointer rounded-lg hover:bg-pink-50/50 transition-colors">
                  <ArrowLeft className="h-4 w-4" /> Back to Site
                </motion.div>
              </Link>
              <motion.button
                whileHover={{ x: 4 }}
                onClick={() => { logout(); setLocation("/"); }}
                className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-600 w-full rounded-lg hover:bg-red-50/50 transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" /> Sign Out
              </motion.button>
            </div>
          </div>
        </div>
      </aside>

      {/* ─── Mobile Header ────────────────────────────────────────── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-pink-100/50 h-16 flex items-center justify-between px-4 shadow-sm">
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-xl hover:bg-pink-50 cursor-pointer"
          >
            {mobileOpen ? <X className="h-5 w-5 text-gray-600" /> : <Menu className="h-5 w-5 text-gray-600" />}
          </motion.button>
          <span className="font-display font-bold text-gray-800">{title}</span>
        </div>
        <img src={LOGO_URL} alt="Soapies" className="h-8" />
      </div>

      {/* ─── Mobile Sidebar Overlay ───────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="lg:hidden fixed inset-y-0 left-0 w-72 bg-white/95 backdrop-blur-xl z-50 shadow-2xl"
            >
              <div className="p-5 border-b border-pink-50 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-3 no-underline" onClick={() => setMobileOpen(false)}>
                  <img src={LOGO_URL} alt="Soapies" className="h-8" />
                  <div>
                    <span className="font-display font-black text-gray-800">Soapies</span>
                    <span className="block text-[10px] text-pink-500 font-black uppercase tracking-widest">Admin</span>
                  </div>
                </Link>
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setMobileOpen(false)} className="p-2 rounded-xl hover:bg-pink-50 cursor-pointer">
                  <X className="h-5 w-5 text-gray-400" />
                </motion.button>
              </div>
              <nav className="p-3 space-y-1">
                {sidebarLinks.map((link, i) => {
                  const isActive = location === link.href;
                  return (
                    <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}>
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold cursor-pointer ${
                          isActive
                            ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg"
                            : "text-gray-500 hover:bg-pink-50"
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg ${isActive ? "bg-white/20" : `bg-gradient-to-br ${link.color}`}`}>
                          <link.icon className="h-4 w-4 text-white" />
                        </div>
                        {link.label}
                      </motion.div>
                    </Link>
                  );
                })}
              </nav>
              <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-pink-50">
                <Link href="/" onClick={() => setMobileOpen(false)}>
                  <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-pink-600 cursor-pointer">
                    <ArrowLeft className="h-4 w-4" /> Back to Site
                  </div>
                </Link>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ─── Main Content ─────────────────────────────────────────── */}
      <main className="flex-1 lg:ml-72 pt-16 lg:pt-0">
        {/* Desktop Header */}
        <div className="hidden lg:flex items-center h-16 px-8 border-b border-pink-100/30 bg-white/50 backdrop-blur-sm">
          <h1 className="font-display text-xl font-black text-gray-800">{title}</h1>
        </div>
        <div className="p-4 md:p-6 lg:p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
