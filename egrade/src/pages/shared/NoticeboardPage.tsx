import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { sanitizeInput } from "@/lib/sanitize";
import {
  Bell, Plus, Pencil, Trash2, Loader2, Search, RefreshCw,
  Calendar, Users, AlertTriangle, Megaphone,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type Notice = {
  id: string; title: string; content: string; target_role: string | null;
  expiry_date: string | null; is_active: boolean; created_at: string;
  posted_by: string | null; school_id: string;
  poster?: { first_name: string; last_name: string } | null;
};

const TARGET_ROLES = [
  { value: "ALL", label: "Everyone" },
  { value: "teacher", label: "Teachers Only" },
  { value: "student", label: "Students Only" },
  { value: "parent", label: "Parents Only" },
  { value: "school_admin", label: "Admins Only" },
];

export default function NoticeboardPage() {
  const { profile, effectiveRole } = useAuth();
  const { toast } = useToast();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Notice | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", target_role: "ALL", expiry_date: "", is_active: true });

  const schoolId = profile?.school_id;
  const isAdmin = effectiveRole === "school_admin";

  const fetchNotices = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    const { data } = await supabase
      .from("noticeboard")
      .select("*, poster:profiles!noticeboard_posted_by_fkey(first_name, last_name)")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false });
    if (data) setNotices(data as any);
    setLoading(false);
  }, [schoolId]);

  useEffect(() => { fetchNotices(); }, [fetchNotices]);

  // Realtime subscription
  useEffect(() => {
    if (!schoolId) return;
    const channel = supabase
      .channel("noticeboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "noticeboard", filter: `school_id=eq.${schoolId}` }, () => {
        fetchNotices();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [schoolId, fetchNotices]);

  const openCreate = () => { setEditing(null); setForm({ title: "", content: "", target_role: "ALL", expiry_date: "", is_active: true }); setShowModal(true); };
  const openEdit = (n: Notice) => {
    setEditing(n);
    setForm({ title: n.title, content: n.content, target_role: n.target_role || "ALL", expiry_date: n.expiry_date || "", is_active: n.is_active });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.content || !schoolId) {
      toast({ title: "Missing fields", description: "Title and content are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      title: sanitizeInput(form.title, 200),
      content: sanitizeInput(form.content, 5000),
      target_role: form.target_role,
      expiry_date: form.expiry_date || null,
      is_active: form.is_active,
      school_id: schoolId,
      posted_by: profile?.id || null,
    };
    const { error } = editing
      ? await supabase.from("noticeboard").update(payload).eq("id", editing.id)
      : await supabase.from("noticeboard").insert(payload);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { toast({ title: editing ? "Notice Updated" : "Notice Posted!" }); setShowModal(false); fetchNotices(); }
    setSaving(false);
  };

  const handleDelete = async (n: Notice) => {
    if (!confirm(`Delete notice "${n.title}"?`)) return;
    const { error } = await supabase.from("noticeboard").delete().eq("id", n.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Notice Deleted" }); setNotices(prev => prev.filter(x => x.id !== n.id)); }
  };

  const filtered = notices.filter(n => {
    const q = search.toLowerCase();
    if (!q) return true;
    return n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
  });

  // For non-admins, only show active notices targeted at their role or ALL
  const visibleNotices = isAdmin ? filtered : filtered.filter(n => {
    if (!n.is_active) return false;
    if (n.expiry_date && new Date(n.expiry_date) < new Date()) return false;
    return n.target_role === "ALL" || n.target_role === effectiveRole;
  });

  const isExpired = (n: Notice) => n.expiry_date && new Date(n.expiry_date) < new Date();
  const isRecent = (n: Notice) => (Date.now() - new Date(n.created_at).getTime()) < 24 * 60 * 60 * 1000;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">Noticeboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{visibleNotices.length} {isAdmin ? "total" : "active"} notices</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchNotices} className="gap-2"><RefreshCw className="w-4 h-4" /> Refresh</Button>
          {isAdmin && <Button onClick={openCreate} className="gap-2 font-bold"><Plus className="w-4 h-4" /> Post Notice</Button>}
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notices..." className="pl-9" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : visibleNotices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <Bell className="w-10 h-10" /><p className="font-semibold">No notices yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleNotices.map(n => (
            <div key={n.id} className={`stat-card relative ${!n.is_active ? "opacity-60" : ""} ${isExpired(n) ? "border-destructive/30" : ""}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isRecent(n) ? "bg-accent/15" : "bg-primary/10"}`}>
                    {isRecent(n) ? <Megaphone className="w-5 h-5 text-accent" /> : <Bell className="w-5 h-5 text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-bold text-foreground">{n.title}</h3>
                      {isRecent(n) && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent text-accent-foreground animate-pulse">NEW</span>}
                      {isExpired(n) && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">EXPIRED</span>}
                      {!n.is_active && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">INACTIVE</span>}
                    </div>
                    <p className="text-sm text-foreground/80 whitespace-pre-wrap">{n.content}</p>
                    <div className="flex items-center gap-3 mt-3 flex-wrap">
                      <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {new Date(n.created_at).toLocaleDateString("en-KE", { dateStyle: "medium" })}
                      </span>
                      <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                        <Users className="w-3 h-3" /> {TARGET_ROLES.find(r => r.value === n.target_role)?.label || "Everyone"}
                      </span>
                      {n.expiry_date && (
                        <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Expires: {new Date(n.expiry_date).toLocaleDateString("en-KE")}
                        </span>
                      )}
                      {n.poster && (
                        <span className="text-[10px] font-semibold text-muted-foreground">
                          By: {n.poster.first_name} {n.poster.last_name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(n)} className="h-7 w-7 p-0"><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(n)} className="h-7 w-7 p-0 text-destructive hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="font-black">{editing ? "Edit Notice" : "Post New Notice"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold">Title *</Label>
              <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Term 1 Exam Schedule" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-semibold">Content *</Label>
              <Textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} placeholder="Write the notice content here..." rows={5} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Target Audience</Label>
                <Select value={form.target_role} onValueChange={v => setForm(p => ({ ...p, target_role: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TARGET_ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Expiry Date</Label>
                <Input type="date" value={form.expiry_date} onChange={e => setForm(p => ({ ...p, expiry_date: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <p className="text-sm font-semibold text-foreground">Active</p>
                <p className="text-xs text-muted-foreground">Visible to target audience</p>
              </div>
              <Switch checked={form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="font-bold gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
              {editing ? "Update" : "Post Notice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
