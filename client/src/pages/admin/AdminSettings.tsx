import AdminLayout from "./AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import {
  Settings, Save, Loader2, Plus, Palette, Bell, Shield,
  Globe, Database, Key, Sparkles
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const settingCategories = [
  { key: "general", label: "General", icon: Globe, gradient: "from-pink-400 to-rose-500" },
  { key: "appearance", label: "Appearance", icon: Palette, gradient: "from-purple-400 to-indigo-500" },
  { key: "notifications", label: "Notifications", icon: Bell, gradient: "from-fuchsia-400 to-pink-500" },
  { key: "security", label: "Security", icon: Shield, gradient: "from-violet-400 to-purple-500" },
];

export default function AdminSettings() {
  const { data: settings, isLoading } = trpc.admin.settings.useQuery(undefined, {
    retry: false, staleTime: 15_000, refetchOnWindowFocus: false,
  });
  const utils = trpc.useUtils();
  const updateSetting = trpc.admin.updateSetting.useMutation({
    onSuccess: () => { toast.success("Setting saved!", { icon: "✅" }); utils.admin.settings.invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [activeTab, setActiveTab] = useState("general");

  useEffect(() => {
    if (settings) {
      const vals: Record<string, string> = {};
      settings.forEach((s: any) => { vals[s.settingKey] = s.settingValue; });
      setEditValues(vals);
    }
  }, [settings]);

  const handleSave = (key: string) => {
    updateSetting.mutate({ key, value: editValues[key] || "" });
  };

  const handleAddNew = () => {
    if (!newKey.trim()) return;
    updateSetting.mutate({ key: newKey, value: newValue });
    setNewKey("");
    setNewValue("");
  };

  return (
    <AdminLayout title="Settings">
      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-1 px-1">
        {settingCategories.map((cat, i) => (
          <motion.button
            key={cat.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab(cat.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === cat.key
                ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-200/30"
                : "bg-white/70 text-gray-500 border border-pink-100 hover:border-pink-200"
            }`}
          >
            <cat.icon className="h-4 w-4" />
            {cat.label}
          </motion.button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-pink-400" />
          <p className="text-sm text-gray-400">Loading settings...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Current Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-pink-100/50 shadow-lg"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600">
                <Settings className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-gray-800">Platform Settings</h3>
                <p className="text-xs text-gray-400">Configure your community platform</p>
              </div>
            </div>

            {settings && settings.length > 0 ? (
              <div className="space-y-4">
                {settings.map((setting: any, i: number) => (
                  <motion.div
                    key={setting.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex flex-col sm:flex-row gap-3 items-start sm:items-end p-4 rounded-xl bg-pink-50/30 border border-pink-100/30 hover:border-pink-200/50 transition-colors"
                  >
                    <div className="flex-1 w-full">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Key className="h-3 w-3 text-pink-400" />
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{setting.settingKey}</label>
                      </div>
                      <Input
                        value={editValues[setting.settingKey] || ""}
                        onChange={e => setEditValues(prev => ({ ...prev, [setting.settingKey]: e.target.value }))}
                        className="rounded-xl border-pink-100 bg-white/70 focus:border-pink-300"
                      />
                    </div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        onClick={() => handleSave(setting.settingKey)}
                        disabled={updateSetting.isPending}
                        size="sm"
                        className="bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl gap-1.5 shadow-md"
                      >
                        {updateSetting.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                        Save
                      </Button>
                    </motion.div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="inline-flex w-14 h-14 rounded-2xl bg-pink-50 items-center justify-center mb-3"
                >
                  <Database className="h-7 w-7 text-pink-300" />
                </motion.div>
                <p className="text-gray-400 text-sm font-medium">No settings configured yet</p>
                <p className="text-gray-300 text-xs">Add your first setting below</p>
              </div>
            )}
          </motion.div>

          {/* Add New Setting */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-pink-100/50 shadow-lg"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600">
                <Plus className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-gray-800">Add New Setting</h3>
                <p className="text-xs text-gray-400">Create a new configuration key-value pair</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Key</label>
                <Input
                  value={newKey}
                  onChange={e => setNewKey(e.target.value)}
                  placeholder="e.g. site_name"
                  className="rounded-xl border-pink-100 bg-white/70"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Value</label>
                <Input
                  value={newValue}
                  onChange={e => setNewValue(e.target.value)}
                  placeholder="e.g. Soapies"
                  className="rounded-xl border-pink-100 bg-white/70"
                />
              </div>
              <div className="flex items-end">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    onClick={handleAddNew}
                    disabled={!newKey.trim() || updateSetting.isPending}
                    className="bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl gap-1.5 whitespace-nowrap shadow-lg shadow-pink-200/30"
                  >
                    {updateSetting.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Add Setting
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AdminLayout>
  );
}
