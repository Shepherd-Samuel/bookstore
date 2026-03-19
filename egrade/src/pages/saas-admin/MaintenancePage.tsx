import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Settings, Shield, Zap, Clock, Save, Loader2, RefreshCw,
  AlertTriangle, CheckCircle2, Power,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type MaintenanceSettings = {
  enabled: boolean;
  message: string;
  estimated_end: string | null;
  affected_roles: string[];
};

type AutoSuspendSettings = {
  enabled: boolean;
  grace_period_days: number;
  notify_days_before: number;
};

export default function MaintenancePage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [runningAutoSuspend, setRunningAutoSuspend] = useState(false);
  const [autoSuspendResult, setAutoSuspendResult] = useState<number | null>(null);

  const [maintenance, setMaintenance] = useState<MaintenanceSettings>({
    enabled: false,
    message: "eGrade M|S is currently under scheduled maintenance. We will be back shortly.",
    estimated_end: null,
    affected_roles: ["teacher", "parent", "student"],
  });

  const [autoSuspend, setAutoSuspend] = useState<AutoSuspendSettings>({
    enabled: true,
    grace_period_days: 3,
    notify_days_before: 7,
  });

  const loadSettings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("system_settings")
      .select("key, value");

    if (data) {
      data.forEach(row => {
        if (row.key === "maintenance_mode") {
          setMaintenance(row.value as MaintenanceSettings);
        } else if (row.key === "auto_suspension") {
          setAutoSuspend(row.value as AutoSuspendSettings);
        }
      });
    }
    setLoading(false);
  };

  useEffect(() => { loadSettings(); }, []);

  const saveMaintenance = async () => {
    setSaving("maintenance");
    const { error } = await supabase
      .from("system_settings")
      .update({ value: maintenance as any, updated_at: new Date().toISOString() })
      .eq("key", "maintenance_mode");

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: maintenance.enabled ? "🔧 Maintenance Mode ON" : "✅ Maintenance Mode OFF", description: "Settings saved successfully." });
    }
    setSaving(null);
  };

  const saveAutoSuspend = async () => {
    setSaving("autosuspend");
    const { error } = await supabase
      .from("system_settings")
      .update({ value: autoSuspend as any, updated_at: new Date().toISOString() })
      .eq("key", "auto_suspension");

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Auto-Suspension Settings Saved" });
    }
    setSaving(null);
  };

  const runAutoSuspend = async () => {
    setRunningAutoSuspend(true);
    setAutoSuspendResult(null);
    const { data, error } = await supabase.rpc("auto_suspend_expired_schools");
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      const count = data as number;
      setAutoSuspendResult(count);
      toast({ title: "Auto-Suspension Run", description: `${count} school(s) suspended.` });
    }
    setRunningAutoSuspend(false);
  };

  const toggleRole = (role: string) => {
    setMaintenance(prev => ({
      ...prev,
      affected_roles: prev.affected_roles.includes(role)
        ? prev.affected_roles.filter(r => r !== role)
        : [...prev.affected_roles, role],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">System Configuration</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Maintenance mode, auto-suspension, and system settings</p>
        </div>
        <Button variant="outline" onClick={loadSettings} className="gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {/* Maintenance Mode Card */}
      <div className="stat-card space-y-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${maintenance.enabled ? "bg-red-100" : "bg-primary-subtle"}`}>
              <Settings className={`w-5 h-5 ${maintenance.enabled ? "text-red-600 animate-spin" : "text-primary"}`} />
            </div>
            <div>
              <h2 className="font-black text-foreground">Maintenance Mode</h2>
              <p className="text-xs text-muted-foreground">Take the system offline for non-admin users</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${maintenance.enabled ? "bg-red-100 text-red-700 animate-pulse" : "bg-green-100 text-green-700"}`}>
              {maintenance.enabled ? "🔧 MAINTENANCE" : "✅ ONLINE"}
            </span>
            <Switch
              checked={maintenance.enabled}
              onCheckedChange={v => setMaintenance(p => ({ ...p, enabled: v }))}
            />
          </div>
        </div>

        {maintenance.enabled && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
            <p className="text-xs text-red-700 font-medium">
              Maintenance mode is <strong>ACTIVE</strong>. Affected users will see a maintenance message and cannot access the system.
            </p>
          </div>
        )}

        <div>
          <Label className="text-xs font-semibold">Maintenance Message</Label>
          <Textarea
            value={maintenance.message}
            onChange={e => setMaintenance(p => ({ ...p, message: e.target.value }))}
            className="mt-1.5 min-h-[80px]"
            placeholder="System is under maintenance..."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-semibold">Estimated End Time</Label>
            <Input
              type="datetime-local"
              value={maintenance.estimated_end || ""}
              onChange={e => setMaintenance(p => ({ ...p, estimated_end: e.target.value || null }))}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold mb-2 block">Affected Roles</Label>
            <div className="flex flex-wrap gap-2">
              {["teacher", "parent", "student", "school_admin"].map(role => (
                <button
                  key={role}
                  onClick={() => toggleRole(role)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                    maintenance.affected_roles.includes(role)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-muted-foreground border-border hover:border-primary/30"
                  }`}
                >
                  {role.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-border flex justify-end">
          <Button onClick={saveMaintenance} disabled={saving === "maintenance"} className="font-bold gap-2">
            {saving === "maintenance" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Maintenance Settings
          </Button>
        </div>
      </div>

      {/* Auto-Suspension Card */}
      <div className="stat-card space-y-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-accent-subtle">
              <Zap className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="font-black text-foreground">Auto-Suspension</h2>
              <p className="text-xs text-muted-foreground">Automatically suspend schools with expired subscriptions</p>
            </div>
          </div>
          <Switch
            checked={autoSuspend.enabled}
            onCheckedChange={v => setAutoSuspend(p => ({ ...p, enabled: v }))}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-semibold">Grace Period (days after expiry)</Label>
            <Input
              type="number"
              min={0}
              max={30}
              value={autoSuspend.grace_period_days}
              onChange={e => setAutoSuspend(p => ({ ...p, grace_period_days: Number(e.target.value) }))}
              className="mt-1.5"
            />
            <p className="text-[10px] text-muted-foreground mt-1">Schools remain active for this many days after subscription expires</p>
          </div>
          <div>
            <Label className="text-xs font-semibold">Notify Days Before Expiry</Label>
            <Input
              type="number"
              min={1}
              max={30}
              value={autoSuspend.notify_days_before}
              onChange={e => setAutoSuspend(p => ({ ...p, notify_days_before: Number(e.target.value) }))}
              className="mt-1.5"
            />
            <p className="text-[10px] text-muted-foreground mt-1">Send renewal reminders this many days before expiry</p>
          </div>
        </div>

        {/* Manual run */}
        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-foreground text-sm">Run Auto-Suspension Now</p>
              <p className="text-xs text-muted-foreground mt-0.5">Immediately check and suspend all schools with expired subscriptions</p>
            </div>
            <Button variant="outline" onClick={runAutoSuspend} disabled={runningAutoSuspend} className="gap-2 text-sm font-bold">
              {runningAutoSuspend ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
              Run Now
            </Button>
          </div>
          {autoSuspendResult !== null && (
            <div className={`mt-3 flex items-center gap-2 text-sm font-semibold ${autoSuspendResult > 0 ? "text-red-600" : "text-green-600"}`}>
              <CheckCircle2 className="w-4 h-4" />
              {autoSuspendResult > 0 ? `${autoSuspendResult} school(s) suspended.` : "No schools needed suspension."}
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-border flex justify-end">
          <Button onClick={saveAutoSuspend} disabled={saving === "autosuspend"} className="font-bold gap-2">
            {saving === "autosuspend" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Auto-Suspension Settings
          </Button>
        </div>
      </div>

      {/* System Info */}
      <div className="stat-card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary-subtle">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <h2 className="font-bold text-foreground">System Status</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Database", status: "Healthy", color: "green" },
            { label: "Auth Service", status: "Online", color: "green" },
            { label: "Storage", status: "Online", color: "green" },
            { label: "Edge Functions", status: "Active", color: "green" },
          ].map(s => (
            <div key={s.label} className="text-center p-3 rounded-lg bg-muted/50">
              <div className={`w-2 h-2 rounded-full mx-auto mb-2 bg-${s.color}-500 animate-pulse`} />
              <p className="text-xs font-semibold text-foreground">{s.label}</p>
              <p className={`text-[10px] font-bold text-${s.color}-600 mt-0.5`}>{s.status}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
