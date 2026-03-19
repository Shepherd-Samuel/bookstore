import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  LifeBuoy, Send, Loader2, MessageSquare, Clock, CheckCircle2, AlertCircle,
  FileText, Shield,
} from "lucide-react";

const CATEGORIES = [
  { value: "general", label: "General Inquiry" },
  { value: "technical", label: "Technical Issue" },
  { value: "billing", label: "Billing & Subscription" },
  { value: "feature", label: "Feature Request" },
  { value: "bug", label: "Bug Report" },
];

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  open: { icon: AlertCircle, color: "text-yellow-600 bg-yellow-100", label: "Open" },
  in_progress: { icon: Clock, color: "text-blue-600 bg-blue-100", label: "In Progress" },
  resolved: { icon: CheckCircle2, color: "text-green-600 bg-green-100", label: "Resolved" },
  closed: { icon: CheckCircle2, color: "text-muted-foreground bg-muted", label: "Closed" },
};

export default function SupportPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("general");
  const [submitting, setSubmitting] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTickets = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setTickets(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchTickets();
  }, [user]);

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      toast({ title: "Missing fields", description: "Please fill in subject and message.", variant: "destructive" });
      return;
    }
    if (!user) return;
    setSubmitting(true);
    const { error } = await supabase.from("support_tickets").insert({
      user_id: user.id,
      school_id: profile?.school_id || null,
      subject: subject.trim(),
      message: message.trim(),
      category,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Ticket Submitted", description: "Our support team will respond shortly." });
      setSubject("");
      setMessage("");
      setCategory("general");
      fetchTickets();
    }
    setSubmitting(false);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
          <LifeBuoy className="w-6 h-6 text-primary" /> Support Center
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Submit a support request or view your existing tickets
        </p>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <a href="/terms" target="_blank" className="stat-card flex items-center gap-3 hover:border-primary/30 transition-colors cursor-pointer">
          <FileText className="w-5 h-5 text-primary" />
          <div>
            <p className="text-sm font-semibold text-foreground">Terms of Service</p>
            <p className="text-xs text-muted-foreground">View our terms and conditions</p>
          </div>
        </a>
        <a href="/privacy" target="_blank" className="stat-card flex items-center gap-3 hover:border-primary/30 transition-colors cursor-pointer">
          <Shield className="w-5 h-5 text-primary" />
          <div>
            <p className="text-sm font-semibold text-foreground">Privacy Policy</p>
            <p className="text-xs text-muted-foreground">Learn how we protect your data</p>
          </div>
        </a>
      </div>

      {/* New Ticket Form */}
      <div className="stat-card space-y-4">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <Send className="w-4 h-4 text-primary" /> Submit New Ticket
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-semibold">Subject</Label>
            <Input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Brief description of your issue"
              className="mt-1"
              maxLength={200}
            />
          </div>
          <div>
            <Label className="text-xs font-semibold">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label className="text-xs font-semibold">Message</Label>
          <Textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Describe your issue or request in detail..."
            className="mt-1 min-h-[120px]"
            maxLength={2000}
          />
        </div>
        <Button onClick={handleSubmit} disabled={submitting} className="font-bold gap-2">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Submit Ticket
        </Button>
      </div>

      {/* My Tickets */}
      <div className="stat-card space-y-4">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" /> My Tickets
        </h3>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : tickets.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No support tickets yet.</p>
        ) : (
          <div className="space-y-3">
            {tickets.map((t: any) => {
              const statusConf = STATUS_CONFIG[t.status] || STATUS_CONFIG.open;
              const StatusIcon = statusConf.icon;
              return (
                <div key={t.id} className="p-4 rounded-xl border border-border hover:border-primary/20 transition-colors space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{t.subject}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {CATEGORIES.find(c => c.value === t.category)?.label || t.category} · {new Date(t.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${statusConf.color}`}>
                      <StatusIcon className="w-3 h-3" /> {statusConf.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{t.message}</p>
                  {t.admin_response && (
                    <div className="mt-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
                      <p className="text-[10px] font-bold text-primary mb-1">Support Response</p>
                      <p className="text-xs text-foreground">{t.admin_response}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
