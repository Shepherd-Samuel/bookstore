import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, RefreshCw, Loader2, Bug, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type ErrorLog = {
  id: string;
  error_type: string;
  error_message: string;
  error_stack: string | null;
  page_url: string | null;
  severity: string;
  status: string;
  created_at: string;
  school_id: string | null;
  user_id: string | null;
};

const SEVERITY_STYLES: Record<string, string> = {
  error: "bg-red-100 text-red-700",
  warning: "bg-yellow-100 text-yellow-700",
  info: "bg-blue-100 text-blue-700",
};

export default function ErrorLogsPage() {
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    let query = supabase
      .from("error_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (severityFilter !== "all") query = query.eq("severity", severityFilter);
    if (statusFilter !== "all") query = query.eq("status", statusFilter);

    const { data } = await query;
    if (data) setLogs(data as ErrorLog[]);
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, [severityFilter, statusFilter]);

  const markResolved = async (id: string) => {
    await supabase.from("error_logs").update({ status: "resolved" }).eq("id", id);
    setLogs(prev => prev.map(l => l.id === id ? { ...l, status: "resolved" } : l));
  };

  const filtered = logs.filter(l =>
    l.error_message.toLowerCase().includes(search.toLowerCase()) ||
    l.error_type.toLowerCase().includes(search.toLowerCase()) ||
    (l.page_url || "").toLowerCase().includes(search.toLowerCase())
  );

  const counts = {
    total: logs.length,
    error: logs.filter(l => l.severity === "error").length,
    new: logs.filter(l => l.status === "new").length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">Error Logs</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {counts.total} total · <span className="text-red-600 font-semibold">{counts.error} errors</span> · <span className="text-accent font-semibold">{counts.new} unresolved</span>
          </p>
        </div>
        <Button variant="outline" onClick={fetchLogs} className="gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Logs", value: counts.total, color: "#004000", icon: Bug },
          { label: "Errors", value: counts.error, color: "#dc2626", icon: AlertTriangle },
          { label: "Unresolved", value: counts.new, color: "#ff6600", icon: AlertTriangle },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${s.color}15` }}>
                <s.icon className="w-4 h-4" style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-xl font-black text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search error messages..."
          className="max-w-xs"
        />
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="info">Info</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="new">Unresolved</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Logs table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
            <p className="font-semibold">No errors found</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map(log => (
              <div key={log.id} className="p-4 hover:bg-muted/20 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${SEVERITY_STYLES[log.severity] || "bg-gray-100 text-gray-600"}`}>
                      {log.severity.toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-foreground">{log.error_type}</span>
                        {log.status === "resolved" && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Resolved</span>
                        )}
                      </div>
                      <p className="text-sm text-foreground mt-0.5 truncate">{log.error_message}</p>
                      {log.page_url && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 font-mono truncate">{log.page_url}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(log.created_at).toLocaleString("en-KE")}
                      </p>
                      {expanded === log.id && log.error_stack && (
                        <pre className="mt-3 p-3 rounded-lg bg-muted text-xs text-muted-foreground overflow-x-auto font-mono whitespace-pre-wrap">
                          {log.error_stack}
                        </pre>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {log.error_stack && (
                      <Button size="sm" variant="ghost" onClick={() => setExpanded(expanded === log.id ? null : log.id)} className="text-xs h-7">
                        {expanded === log.id ? "Hide" : "Stack"}
                      </Button>
                    )}
                    {log.status === "new" && (
                      <Button size="sm" variant="outline" onClick={() => markResolved(log.id)} className="text-xs h-7 gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Resolve
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
