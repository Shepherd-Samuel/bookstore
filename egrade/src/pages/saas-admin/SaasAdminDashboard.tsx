import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { School, Package, Users, AlertTriangle, TrendingUp, CheckCircle2, XCircle, RefreshCw, ArrowRight, Zap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type Stats = {
  totalSchools: number;
  activeSchools: number;
  suspendedSchools: number;
  totalPlans: number;
  unresolvedErrors: number;
  recentSchools: Array<{ id: string; school_name: string; registration_date: string; is_active: boolean; subscription?: { plan?: { name: string } } }>;
};

export default function SaasAdminDashboard() {
  const { toast } = useToast();
  const [stats, setStats] = useState<Stats>({ totalSchools: 0, activeSchools: 0, suspendedSchools: 0, totalPlans: 0, unresolvedErrors: 0, recentSchools: [] });
  const [loading, setLoading] = useState(true);
  const [suspending, setSuspending] = useState(false);

  const load = async () => {
    setLoading(true);
    const [schoolsRes, plansRes, errorsRes, recentRes] = await Promise.all([
      supabase.from("schools").select("id, is_active"),
      supabase.from("plans").select("id", { count: "exact" }).eq("is_active", true),
      supabase.from("error_logs").select("id", { count: "exact" }).eq("status", "new"),
      supabase.from("schools").select("id, school_name, registration_date, is_active, school_subscriptions(status, plans(name))").order("registration_date", { ascending: false }).limit(5),
    ]);

    const schools = schoolsRes.data || [];
    setStats({
      totalSchools: schools.length,
      activeSchools: schools.filter(s => s.is_active).length,
      suspendedSchools: schools.filter(s => !s.is_active).length,
      totalPlans: plansRes.count || 0,
      unresolvedErrors: errorsRes.count || 0,
      recentSchools: (recentRes.data || []).map((s: any) => ({
        ...s,
        subscription: s.school_subscriptions?.[0] ? { plan: s.school_subscriptions[0].plans } : undefined,
      })),
    });
    setLoading(false);
  };

  const runAutoSuspend = async () => {
    setSuspending(true);
    const { data, error } = await supabase.rpc("auto_suspend_expired_schools");
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Auto-Suspension Complete", description: `${data} school(s) suspended.` });
      load();
    }
    setSuspending(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">SaaS Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">eGrade M|S · Platform Overview</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
          <Button onClick={runAutoSuspend} disabled={suspending} className="gap-2 font-bold">
            {suspending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Run Auto-Suspend
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Schools", value: loading ? "—" : stats.totalSchools, icon: School, color: "#004000" },
          { label: "Active Schools", value: loading ? "—" : stats.activeSchools, icon: CheckCircle2, color: "#16a34a" },
          { label: "Suspended", value: loading ? "—" : stats.suspendedSchools, icon: XCircle, color: "#dc2626" },
          { label: "Unresolved Errors", value: loading ? "—" : stats.unresolvedErrors, icon: AlertTriangle, color: "#ff6600" },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${s.color}18` }}>
                <s.icon className="w-5 h-5" style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-2xl font-black text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Schools */}
      <div className="stat-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-foreground">Recently Registered Schools</h3>
          <button className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
            View all <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
        ) : stats.recentSchools.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground text-sm">No schools yet. Create the first one!</p>
        ) : (
          <div className="space-y-3">
            {stats.recentSchools.map(s => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-xl border border-border hover:border-primary/20 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-primary-subtle">
                    <School className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{s.school_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.subscription?.plan?.name || "No plan"} · {new Date(s.registration_date).toLocaleDateString("en-KE")}
                    </p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {s.is_active ? "Active" : "Suspended"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="stat-card">
        <h3 className="font-bold text-foreground mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: School, label: "New School", color: "#004000" },
            { icon: Package, label: "Manage Plans", color: "#ff6600" },
            { icon: AlertTriangle, label: "Error Logs", color: "#dc2626" },
            { icon: Zap, label: "System Config", color: "#7c3aed" },
          ].map(a => (
            <button key={a.label} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-primary/20 hover:shadow-card transition-all">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${a.color}15` }}>
                <a.icon className="w-5 h-5" style={{ color: a.color }} />
              </div>
              <span className="text-xs font-semibold text-foreground text-center leading-tight">{a.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
