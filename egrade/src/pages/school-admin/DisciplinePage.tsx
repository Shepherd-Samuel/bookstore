import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTeacherScope } from "@/hooks/useTeacherScope";
import { useToast } from "@/hooks/use-toast";
import { sanitizeInput } from "@/lib/sanitize";
import {
  Plus, Loader2, Search, AlertTriangle, Pencil, Trash2,
  Download, RefreshCw, FileText, Calendar, User,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type DisciplineRecord = {
  id: string; incident: string; action_taken: string | null;
  date_reported: string; created_at: string;
  student_id: string; reported_by: string | null; school_id: string;
  student?: { first_name: string; last_name: string; adm_no: string | null };
  reporter?: { first_name: string; last_name: string } | null;
};

type StudentOption = {
  id: string; first_name: string; last_name: string; adm_no: string | null;
};

type SchoolInfo = {
  school_name: string; email: string | null; phone: string | null;
  address: string | null; logo_url: string | null; moto: string | null;
};

const ACTION_TYPES = [
  "Verbal Warning",
  "Written Warning",
  "Parent/Guardian Notified",
  "Suspension (1-3 days)",
  "Suspension (1 week)",
  "Community Service",
  "Guidance & Counselling Referral",
  "Expulsion Recommendation",
  "Other",
];

export default function DisciplinePage() {
  const { profile, effectiveRole } = useAuth();
  const { toast } = useToast();
  const scope = useTeacherScope(profile?.id, profile?.school_id, effectiveRole);
  const [records, setRecords] = useState<DisciplineRecord[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [allStudents, setAllStudents] = useState<(StudentOption & { stream_id: string | null })[]>([]);
  const [school, setSchool] = useState<SchoolInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<DisciplineRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    student_id: "", incident: "", action_taken: "", date_reported: new Date().toISOString().slice(0, 10),
  });

  const schoolId = profile?.school_id;
  const isAdmin = effectiveRole === "school_admin";
  const isTeacher = effectiveRole === "teacher";

  const fetchData = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    const [recRes, studRes, schoolRes] = await Promise.all([
      supabase
        .from("discipline_records")
        .select("*, student:profiles!discipline_records_student_id_fkey(first_name, last_name, adm_no), reporter:profiles!discipline_records_reported_by_fkey(first_name, last_name)")
        .eq("school_id", schoolId)
        .order("date_reported", { ascending: false })
        .limit(300),
      supabase
        .from("profiles")
        .select("id, first_name, last_name, adm_no, stream_id")
        .eq("school_id", schoolId)
        .eq("role", "student")
        .eq("is_active", true)
        .order("first_name"),
      supabase
        .from("schools")
        .select("school_name, email, phone, address, logo_url, moto")
        .eq("id", schoolId)
        .single(),
    ]);
    if (recRes.data) setRecords(recRes.data as any);
    if (studRes.data) {
      setAllStudents(studRes.data as any);
      setStudents(studRes.data);
    }
    if (schoolRes.data) setSchool(schoolRes.data as SchoolInfo);
    setLoading(false);
  }, [schoolId]);

  // Teacher scope: filter students to only those in assigned streams
  const scopedStudents = isTeacher && !scope.loading
    ? allStudents.filter(s => s.stream_id && scope.hasStreamAccess(s.stream_id))
    : allStudents;

  const scopedStudentIds = new Set(scopedStudents.map(s => s.id));
  const scopedRecords = isTeacher
    ? records.filter(r => scopedStudentIds.has(r.student_id))
    : records;

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditing(null);
    setForm({ student_id: "", incident: "", action_taken: "", date_reported: new Date().toISOString().slice(0, 10) });
    setShowModal(true);
  };

  const openEdit = (r: DisciplineRecord) => {
    setEditing(r);
    setForm({
      student_id: r.student_id,
      incident: r.incident,
      action_taken: r.action_taken || "",
      date_reported: r.date_reported,
    });
    setShowModal(true);
  };

  const saveRecord = async () => {
    if (!form.student_id || !form.incident || !schoolId || !profile?.id) {
      toast({ title: "Missing fields", description: "Student and incident are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      student_id: form.student_id,
      incident: sanitizeInput(form.incident, 1000),
      action_taken: form.action_taken ? sanitizeInput(form.action_taken, 1000) : null,
      date_reported: form.date_reported,
      school_id: schoolId,
      reported_by: profile.id,
    };
    const { error } = editing
      ? await supabase.from("discipline_records").update(payload).eq("id", editing.id)
      : await supabase.from("discipline_records").insert(payload);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editing ? "Record Updated" : "Incident Reported" });
      setShowModal(false);
      fetchData();
    }
    setSaving(false);
  };

  const deleteRecord = async (id: string) => {
    if (!confirm("Delete this discipline record?")) return;
    const { error } = await supabase.from("discipline_records").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Deleted" }); fetchData(); }
  };

  const printLetter = (record: DisciplineRecord) => {
    const student = record.student;
    const s = school;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Discipline Letter</title>
<style>
  @page { margin: 2cm; }
  body { font-family: 'Times New Roman', serif; max-width: 700px; margin: 0 auto; padding: 40px; color: #1a1a1a; line-height: 1.7; font-size: 14px; }
  .letterhead { text-align: center; border-bottom: 3px double #004000; padding-bottom: 16px; margin-bottom: 24px; }
  .letterhead img { width: 80px; height: 80px; object-fit: contain; margin-bottom: 8px; }
  .letterhead h1 { color: #004000; margin: 0; font-size: 22px; text-transform: uppercase; letter-spacing: 2px; }
  .letterhead .motto { font-style: italic; color: #666; font-size: 12px; margin: 4px 0; }
  .letterhead .contacts { font-size: 11px; color: #666; margin-top: 4px; }
  .ref-line { display: flex; justify-content: space-between; margin: 20px 0; font-size: 13px; }
  .ref-line span { font-weight: bold; }
  .subject { text-align: center; font-weight: bold; text-decoration: underline; text-transform: uppercase; margin: 24px 0; font-size: 15px; }
  .body p { margin: 12px 0; text-align: justify; }
  .details-table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  .details-table td { padding: 8px 12px; border: 1px solid #ddd; }
  .details-table td:first-child { background: #f8f8f8; font-weight: bold; width: 35%; }
  .signature { margin-top: 48px; }
  .signature .line { border-top: 1px solid #333; width: 200px; margin-top: 40px; }
  .footer { text-align: center; margin-top: 40px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 10px; color: #999; }
  .stamp { color: #cc0000; font-weight: bold; font-size: 12px; text-align: center; margin: 20px 0; padding: 8px; border: 2px solid #cc0000; display: inline-block; }
  @media print { body { padding: 0; } }
</style></head><body>
<div class="letterhead">
  ${s?.logo_url ? `<img src="${s.logo_url}" alt="School Logo" />` : ""}
  <h1>${s?.school_name || "School Name"}</h1>
  ${s?.moto ? `<p class="motto">"${s.moto}"</p>` : ""}
  <p class="contacts">
    ${[s?.address, s?.phone, s?.email].filter(Boolean).join(" | ")}
  </p>
</div>

<div class="ref-line">
  <span>Ref: DISC/${new Date(record.date_reported).getFullYear()}/${record.id.slice(0, 6).toUpperCase()}</span>
  <span>Date: ${new Date(record.date_reported).toLocaleDateString("en-KE", { dateStyle: "long" })}</span>
</div>

<p><strong>To:</strong> The Parent/Guardian of <strong>${student?.first_name || ""} ${student?.last_name || ""}</strong>
${student?.adm_no ? ` (Adm No: ${student.adm_no})` : ""}</p>

<p class="subject">Re: Disciplinary Action Notification</p>

<div class="body">
  <p>Dear Parent/Guardian,</p>
  
  <p>This letter serves to formally notify you of a disciplinary incident involving your child/ward at our institution. 
  In compliance with the Ministry of Education guidelines and the Basic Education Act, 2013, we are required to 
  communicate all disciplinary matters to parents/guardians.</p>

  <table class="details-table">
    <tr><td>Student Name</td><td>${student?.first_name || ""} ${student?.last_name || ""}</td></tr>
    <tr><td>Admission Number</td><td>${student?.adm_no || "N/A"}</td></tr>
    <tr><td>Date of Incident</td><td>${new Date(record.date_reported).toLocaleDateString("en-KE", { dateStyle: "long" })}</td></tr>
    <tr><td>Nature of Incident</td><td>${record.incident}</td></tr>
    <tr><td>Action Taken</td><td>${record.action_taken || "Pending review"}</td></tr>
    <tr><td>Reported By</td><td>${record.reporter ? `${record.reporter.first_name} ${record.reporter.last_name}` : "School Administration"}</td></tr>
  </table>

  <p>We kindly request you to visit the school at your earliest convenience to discuss this matter further 
  with the school administration. Your cooperation in guiding and mentoring your child is highly appreciated.</p>

  <p>As per the Ministry of Education regulations, this record will be maintained in the student's file for 
  the duration of their enrollment at this institution.</p>

  <p>Please do not hesitate to contact the school for any clarification.</p>
</div>

<div class="signature">
  <p>Yours faithfully,</p>
  <div class="line"></div>
  <p style="margin-top:4px;font-weight:bold;">School Principal / Deputy Principal</p>
  <p style="font-size:12px;color:#666;">${s?.school_name || ""}</p>
</div>

<div class="footer">
  <p>This is an official document generated by the eGrade M|S School Management System.</p>
  <p>Generated on ${new Date().toLocaleString("en-KE")} | Ref: DISC/${record.id.slice(0, 8).toUpperCase()}</p>
</div>
</body></html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank");
    if (w) setTimeout(() => w.print(), 600);
  };

  const filtered = scopedRecords.filter(r => {
    const q = search.toLowerCase();
    if (!q) return true;
    const s = r.student;
    return (
      (s && `${s.first_name} ${s.last_name}`.toLowerCase().includes(q)) ||
      (s?.adm_no || "").toLowerCase().includes(q) ||
      r.incident.toLowerCase().includes(q) ||
      (r.action_taken || "").toLowerCase().includes(q)
    );
  });

  const stats = {
    total: scopedRecords.length,
    thisMonth: scopedRecords.filter(r => {
      const d = new Date(r.date_reported);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length,
    pending: scopedRecords.filter(r => !r.action_taken).length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">Discipline Records</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Incident reporting & MoE compliance tracking</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData} className="gap-2"><RefreshCw className="w-4 h-4" /> Refresh</Button>
          <Button onClick={openCreate} className="gap-2 font-bold"><Plus className="w-4 h-4" /> Report Incident</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Records", value: stats.total, icon: FileText, color: "#2563eb" },
          { label: "This Month", value: stats.thisMonth, icon: Calendar, color: "#ff6600" },
          { label: "Pending Action", value: stats.pending, icon: AlertTriangle, color: "#dc2626" },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${s.color}18` }}>
                <s.icon className="w-5 h-5" style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-xl font-black text-foreground">{loading ? "—" : s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by student, incident..." className="pl-9" />
      </div>

      {/* Records Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <AlertTriangle className="w-10 h-10" />
            <p className="font-semibold">{records.length === 0 ? "No discipline records yet" : "No matching records"}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Date", "Student", "Incident", "Action Taken", "Status", "Actions"].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(r.date_reported).toLocaleDateString("en-KE")}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">{r.student?.first_name} {r.student?.last_name}</p>
                      <p className="text-[10px] text-muted-foreground">{r.student?.adm_no || "N/A"}</p>
                    </td>
                    <td className="px-4 py-3 text-foreground max-w-[200px] truncate">{r.incident}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[160px] truncate">{r.action_taken || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.action_taken ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {r.action_taken ? "Resolved" : "Pending"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => printLetter(r)} className="h-7 gap-1 text-xs">
                          <Download className="w-3 h-3" /> PDF
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(r)} className="h-7 w-7 p-0">
                          <Pencil className="w-3 h-3" />
                        </Button>
                        {isAdmin && (
                          <Button size="sm" variant="ghost" onClick={() => deleteRecord(r.id)} className="h-7 w-7 p-0 text-destructive">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-black">{editing ? "Edit Record" : "Report Disciplinary Incident"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold">Student *</Label>
              <Select value={form.student_id} onValueChange={v => setForm(p => ({ ...p, student_id: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select student" /></SelectTrigger>
                <SelectContent>
                  {scopedStudents.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.first_name} {s.last_name} {s.adm_no ? `(${s.adm_no})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Date of Incident</Label>
              <Input type="date" value={form.date_reported} onChange={e => setForm(p => ({ ...p, date_reported: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-semibold">Incident Description *</Label>
              <Textarea
                value={form.incident}
                onChange={e => setForm(p => ({ ...p, incident: e.target.value }))}
                placeholder="Describe the incident in detail..."
                className="mt-1"
                rows={3}
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Action Taken</Label>
              <Select value={form.action_taken} onValueChange={v => setForm(p => ({ ...p, action_taken: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select action (optional)" /></SelectTrigger>
                <SelectContent>
                  {ACTION_TYPES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={saveRecord} disabled={saving} className="font-bold gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
              {editing ? "Update" : "Report Incident"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
