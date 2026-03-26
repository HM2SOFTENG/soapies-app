import AdminLayout from "./AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { motion } from "framer-motion";
import {
  Settings, Loader2, Globe, Bell, Shield, Database,
  Mail, MessageSquare, Smartphone, Zap, Clock,
  Save, AlertCircle, Activity,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

const SETTING_CATEGORIES = [
  { key: "general", label: "General", icon: Globe, gradient: "from-pink-400 to-rose-500" },
  { key: "registration", label: "Registration", icon: Zap, gradient: "from-purple-400 to-indigo-500" },
  { key: "events", label: "Events", icon: Database, gradient: "from-fuchsia-400 to-pink-500" },
  { key: "notifications", label: "Notifications", icon: Bell, gradient: "from-violet-400 to-purple-500" },
  { key: "moderation", label: "Moderation", icon: Shield, gradient: "from-rose-400 to-pink-500" },
  { key: "audit", label: "Audit Log", icon: Activity, gradient: "from-indigo-400 to-purple-500" },
];

const SETTINGS_CONFIG: Record<string, Array<{
  key: string;
  label: string;
  desc?: string;
  type: "text" | "toggle" | "number";
  icon?: typeof Settings;
}>> = {
  general: [
    { key: "appName", label: "App Name", desc: "Display name of the application", type: "text" },
    { key: "welcomeMessage", label: "Welcome Message", desc: "Message shown to new users", type: "text" },
    { key: "appDescription", label: "App Description", desc: "Short description of the app", type: "text" },
    { key: "defaultCommunity", label: "Default Community", desc: "Default community for new members", type: "text" },
  ],
  registration: [
    { key: "emailVerificationRequired", label: "Require Email Verification", type: "toggle" },
    { key: "phoneVerificationRequired", label: "Require Phone Verification", type: "toggle" },
    { key: "autoApprove", label: "Auto-Approve New Members", type: "toggle" },
    { key: "inviteCodeRequired", label: "Require Invite Code", type: "toggle" },
  ],
  events: [
    { key: "defaultEventCapacity", label: "Default Event Capacity", type: "number" },
    { key: "defaultEventPrice", label: "Default Event Price ($)", type: "number" },
    { key: "requireTestResults", label: "Require Test Results", type: "toggle" },
    { key: "requireWaiverSignature", label: "Require Waiver Signature", type: "toggle" },
  ],
  notifications: [
    { key: "emailNotificationsEnabled", label: "Email Notifications", type: "toggle" },
    { key: "smsNotificationsEnabled", label: "SMS Notifications", type: "toggle" },
    { key: "pushNotificationsEnabled", label: "Push Notifications", type: "toggle" },
    { key: "quietHoursStart", label: "Quiet Hours Start (HH:MM)", type: "text" },
    { key: "quietHoursEnd", label: "Quiet Hours End (HH:MM)", type: "text" },
  ],
  moderation: [
    { key: "autoModeratePhotos", label: "Auto-Moderate Photos", desc: "Automatically check photos on upload", type: "toggle" },
    { key: "requirePhotoApproval", label: "Require Photo Approval", desc: "All photos need admin approval", type: "toggle" },
    { key: "maxPostsPerDay", label: "Max Posts Per Day", type: "number" },
    { key: "maxMessagesPerDay", label: "Max Messages Per Day", type: "number" },
  ],
};

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState("general");
  const [editValues, setEditValues] = useState<Record<string, any>>({});
  const [saveLoading, setSaveLoading] = useState<string | null>(null);

  const utils = trpc.useUtils();

  // Queries
  const { data: settings, isLoading } = trpc.admin.settings.useQuery(undefined, {
    retry: false, staleTime: 15_000, refetchOnWindowFocus: false,
  });

  const { data: auditLogs } = trpc.admin.auditLogs.useQuery(undefined, {
    retry: false, staleTime: 30_000, refetchOnWindowFocus: false,
  });

  // Mutations
  const updateSetting = trpc.admin.updateSetting.useMutation({
    onSuccess: () => {
      toast.success("Setting saved!", { icon: "✅" });
      utils.admin.settings.invalidate();
      setSaveLoading(null);
    },
    onError: (e: any) => {
      toast.error(e.message);
      setSaveLoading(null);
    },
  });

  useEffect(() => {
    if (settings) {
      const vals: Record<string, any> = {};
      settings.forEach((s: any) => {
        vals[s.key] = s.value;
      });
      setEditValues(vals);
    }
  }, [settings]);

  const handleSave = (key: string) => {
    setSaveLoading(key);
    const value = editValues[key] ?? "";
    updateSetting.mutate({ key, value: String(value) });
  };

  const getSetting = (key: string) => {
    return editValues[key] ?? "";
  };

  const categoryConfig = SETTINGS_CONFIG[activeTab] || [];

  return (
    <AdminLayout title="Settings">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Tab List */}
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 bg-white/70 border border-pink-100/50 backdrop-blur-sm rounded-xl mb-6 p-1">
          {SETTING_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <TabsTrigger
                key={cat.key}
                value={cat.key}
                className="gap-1.5 text-xs md:text-sm rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md"
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{cat.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-pink-400" />
            <p className="text-sm text-gray-400">Loading settings...</p>
          </div>
        ) : (
          <>
            {/* Content Tabs */}
            {SETTING_CATEGORIES.slice(0, 5).map((cat) => (
              <TabsContent key={cat.key} value={cat.key} className="space-y-4 mt-6">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-4 rounded-xl bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-100/50"
                >
                  <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    {SETTING_CATEGORIES.find(c => c.key === cat.key)?.icon &&
                      (() => {
                        const Icon = SETTING_CATEGORIES.find(c => c.key === cat.key)!.icon;
                        return <Icon className="h-5 w-5 text-pink-500" />;
                      })()
                    }
                    {cat.label} Settings
                  </h3>
                </motion.div>

                <div className="space-y-3">
                  {categoryConfig.map((setting, i) => (
                    <motion.div
                      key={setting.key}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-pink-100/50 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <label className="block text-sm font-bold text-gray-800">{setting.label}</label>
                          {setting.desc && (
                            <p className="text-xs text-gray-500 mt-1">{setting.desc}</p>
                          )}
                        </div>
                      </div>

                      {setting.type === "toggle" ? (
                        <div className="flex items-center gap-4 pt-2">
                          <Switch
                            checked={getSetting(setting.key) === "true" || getSetting(setting.key) === true}
                            onCheckedChange={(checked) => {
                              setEditValues(prev => ({
                                ...prev,
                                [setting.key]: checked,
                              }));
                              setSaveLoading(setting.key);
                              updateSetting.mutate({
                                key: setting.key,
                                value: String(checked),
                              });
                            }}
                            disabled={updateSetting.isPending}
                          />
                          <span className="text-sm text-gray-500">
                            {getSetting(setting.key) === "true" || getSetting(setting.key) === true ? "Enabled" : "Disabled"}
                          </span>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <input
                            type={setting.type === "number" ? "number" : "text"}
                            value={getSetting(setting.key)}
                            onChange={(e) => setEditValues(prev => ({
                              ...prev,
                              [setting.key]: e.target.value,
                            }))}
                            placeholder={`Enter ${setting.label.toLowerCase()}...`}
                            className="flex-1 px-4 py-2.5 rounded-lg border border-pink-100 bg-white text-sm outline-none focus:border-pink-300 focus:ring-1 focus:ring-pink-200/50"
                          />
                          {(editValues[setting.key] !== undefined &&
                            String(editValues[setting.key]) !== (settings?.find((s: any) => s.key === setting.key)?.value ?? "")) && (
                            <Button
                              size="sm"
                              className="bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg px-6"
                              onClick={() => handleSave(setting.key)}
                              disabled={saveLoading === setting.key}
                            >
                              <Save className="h-4 w-4" />
                              {saveLoading === setting.key ? "Saving..." : "Save"}
                            </Button>
                          )}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </TabsContent>
            ))}

            {/* Audit Log Tab */}
            <TabsContent value="audit" className="space-y-4 mt-6">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-4 rounded-xl bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-100/50"
              >
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-pink-500" />
                  Admin Activity Log ({auditLogs?.length || 0})
                </h3>
              </motion.div>

              {!auditLogs || auditLogs.length === 0 ? (
                <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-xl border border-pink-100/50">
                  <AlertCircle className="h-12 w-12 text-pink-200 mx-auto mb-4" />
                  <p className="text-gray-400">No activity logged yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {auditLogs.map((log: any, i: number) => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-pink-100/50"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-800 text-sm capitalize">
                            {log.action?.replace(/_/g, " ")}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            By: {log.adminName || "Admin"}
                            {log.targetType && ` • ${log.targetType.toUpperCase()} #${log.targetId}`}
                          </p>
                          {log.notes && (
                            <p className="text-xs text-gray-600 mt-2 italic">{log.notes}</p>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {format(new Date(log.createdAt), "MMM d, HH:mm")}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>
          </>
        )}
      </Tabs>
    </AdminLayout>
  );
}
