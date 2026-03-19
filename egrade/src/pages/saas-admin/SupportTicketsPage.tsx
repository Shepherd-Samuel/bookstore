import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  LifeBuoy, Loader2, MessageSquare, Clock, CheckCircle2, AlertCircle, Send, Filter,
} from "lucide-react";

const STATUS_OPTIONS = [
  { value: "open", label: "Open", icon: AlertCircle, color: "text-yellow-600 bg-yellow-100" },
  { value: "in_progress", label: "In Progress", icon: Clock, color: "text-blue-600 bg-blue-100" },
  { value: "resolved", label: "Resolved", icon: CheckCircle2, color: "text-green-600 bg-green-100" },
  { value: "closed", label: "Closed", icon: CheckCircle2, color: "text-muted-foreground bg-muted" },
];

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "general", label: "General Inquiry" },
  { value: "technical", label: "Technical Issue" },
  { value: "billing", label: "Billing & Subscription" },
  { value: "feature", label: "Feature Request" },
  { value: "bug", label: "Bug Report" },
];

export default function SupportTicketsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");
  const [responseStatus, setResponseStatus] = useState("resolved");
  const [saving, setSaving] = useState(false);

  const fetchTickets = async () => {
    let query = supabase
      .from("support_tickets")
      .select("*, school:schools(school_name)")
      .order("created_at", { ascending: false });

    if (filterStatus !== "all") query = query.eq("status", filterStatus);
    if (filterCategory !== "all") query = query.eq("category", filterCategory);

    const { data } = await query;
    setTickets(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchTickets();
  }, [filterStatus, filterCategory]);

  const handleRespond = async (ticketId: string) => {
    if (!responseText.trim()) {
      toast({ title: "Response required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("support_tickets")
      .update({
        admin_response: responseText.trim(),
        status: responseStatus,
        responded_by: user?.id,
        responded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticketId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Response Sent" });
      setRespondingId(null);
      setResponseText("");
      fetchTickets();
    }
    setSaving(false);
  };

  const statusCounts = {
    open: tickets.filter(t => t.status === "open").length,
    in_progress: tickets.filter(t => t.status === "in_progress").length,
    resolved: tickets.filter(t => t.status === "resolved").length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
          <LifeBuoy className="w-6 h-6 text-primary" /> Support Tickets
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">Manage and respond to user support requests</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Open", count: statusCounts.open, color: "text-yellow-600", bg: "bg-yellow-100" },
          { label: "In Progress", count: statusCounts.in_progress, color: "text-blue-600", bg: "bg-blue-100" },
          { label: "Resolved", count: statusCounts.resolved, color: "text-green-600", bg: "bg-green-100" },
        ].map(s => (
          <div key={s.label} className="stat-card text-center">
            <p className={`text-2xl font-black ${s.color}`}>{s.count}</p>
            <p className="text-xs font-semibold text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUS_OPTIONS.map(s => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tickets List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="stat-card text-center py-12">
          <MessageSquare className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No tickets found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tickets.map((t: any) => {
            const statusConf = STATUS_OPTIONS.find(s => s.value === t.status) || STATUS_OPTIONS[0];
            const StatusIcon = statusConf.icon;
            return (
              <div key={t.id} className="stat-card space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground">{t.subject}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t.school?.school_name || "Platform User"} · {CATEGORIES.find(c => c.value === t.category)?.label} · {new Date(t.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${statusConf.color}`}>
                    <StatusIcon className="w-3 h-3" /> {statusConf.label}
                  </span>
                </div>
                <p className="text-xs text-foreground/80 whitespace-pre-wrap">{t.message}</p>

                {t.admin_response && (
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <p className="text-[10px] font-bold text-primary mb-1">Your Response</p>
                    <p className="text-xs text-foreground">{t.admin_response}</p>
                    {t.responded_at && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(t.responded_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </div>
                )}

                {respondingId === t.id ? (
                  <div className="space-y-3 pt-2 border-t border-border">
                    <Textarea
                      value={responseText}
                      onChange={e => setResponseText(e.target.value)}
                      placeholder="Type your response..."
                      className="min-h-[80px]"
                      maxLength={2000}
                    />
                    <div className="flex items-center gap-3">
                      <Select value={responseStatus} onValueChange={setResponseStatus}>
                        <SelectTrigger className="w-[150px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map(s => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button onClick={() => handleRespond(t.id)} disabled={saving} size="sm" className="gap-2 font-bold">
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        Send Response
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setRespondingId(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" className="gap-2 font-bold" onClick={() => { setRespondingId(t.id); setResponseText(t.admin_response || ""); }}>
                    <MessageSquare className="w-3.5 h-3.5" /> {t.admin_response ? "Update Response" : "Respond"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
