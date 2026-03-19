import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { sanitizeInput } from "@/lib/sanitize";
import {
  Plus, Search, Loader2, Users, Download, UserPlus, FileText,
  AlertTriangle, CheckCircle2, GraduationCap, Upload, X, FileUp,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

type Student = {
  id: string; first_name: string; last_name: string; adm_no: string | null;
  gender: string | null; dob: string | null; phone: string | null;
  is_active: boolean; class_id: string | null; stream_id: string | null;
  created_at: string;
};
type ClassRow = { id: string; name: string; level: string };
type StreamRow = { id: string; name: string; class_id: string };

type CsvRow = {
  first_name: string; last_name: string; adm_no: string;
  dob: string; gender: string; phone: string;
  class_name: string; stream_name: string;
  _error?: string; _status?: "pending" | "success" | "error";
};

const emptyForm = {
  email: "", first_name: "", last_name: "", phone: "", gender: "",
  dob: "", adm_no: "", class_id: "", stream_id: "",
  upi: "", birth_cert_no: "",
};

const CSV_TEMPLATE_HEADERS = "first_name,last_name,adm_no,dob,gender,phone,class_name,stream_name";
const CSV_TEMPLATE_SAMPLE = `John,Doe,JSS/001/2026,2012-05-15,male,0712345678,Grade 7,East
Jane,Smith,JSS/002/2026,2011-11-20,female,,Grade 7,West`;

function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headerLine = lines[0].toLowerCase();
  const headers = headerLine.split(",").map(h => h.trim().replace(/"/g, ""));
  
  const colMap: Record<string, number> = {};
  const expectedCols = ["first_name", "last_name", "adm_no", "dob", "gender", "phone", "class_name", "stream_name"];
  expectedCols.forEach(col => {
    const idx = headers.indexOf(col);
    if (idx !== -1) colMap[col] = idx;
  });

  return lines.slice(1).map(line => {
    const vals = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
    const row: CsvRow = {
      first_name: vals[colMap["first_name"]] || "",
      last_name: vals[colMap["last_name"]] || "",
      adm_no: vals[colMap["adm_no"]] || "",
      dob: vals[colMap["dob"]] || "",
      gender: vals[colMap["gender"]] || "",
      phone: vals[colMap["phone"]] || "",
      class_name: vals[colMap["class_name"]] || "",
      stream_name: vals[colMap["stream_name"]] || "",
      _status: "pending",
    };
    // Validate
    if (!row.first_name) row._error = "Missing first name";
    else if (!row.adm_no) row._error = "Missing admission number";
    else if (!row.dob) row._error = "Missing date of birth";
    return row;
  });
}

export default function StudentEnrollmentPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [streams, setStreams] = useState<StreamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [showEnroll, setShowEnroll] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [createdCreds, setCreatedCreds] = useState<{ email: string; password: string } | null>(null);

  // Bulk import state
  const [showBulk, setShowBulk] = useState(false);
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkResults, setBulkResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const schoolId = profile?.school_id;

  const fetchData = async () => {
    if (!schoolId) return;
    setLoading(true);
    const [studentsRes, classesRes, streamsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("school_id", schoolId).eq("role", "student").order("created_at", { ascending: false }),
      supabase.from("classes").select("id, name, level").eq("school_id", schoolId).eq("is_active", true),
      supabase.from("streams").select("id, name, class_id").eq("school_id", schoolId).eq("is_active", true),
    ]);
    if (studentsRes.data) setStudents(studentsRes.data as Student[]);
    if (classesRes.data) setClasses(classesRes.data);
    if (streamsRes.data) setStreams(streamsRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [schoolId]);

  const classesForStream = form.class_id ? streams.filter(s => s.class_id === form.class_id) : [];

  const handleEnroll = async () => {
    if (!form.email || !form.first_name) {
      toast({ title: "Missing fields", description: "Email and first name are required.", variant: "destructive" });
      return;
    }
    setEnrolling(true);
    const { data, error } = await supabase.functions.invoke("register-school-member", {
      body: {
        action: "register",
        email: sanitizeInput(form.email, 255),
        first_name: sanitizeInput(form.first_name, 100),
        last_name: sanitizeInput(form.last_name, 100),
        role: "student",
        phone: form.phone ? sanitizeInput(form.phone, 20) : undefined,
        gender: form.gender,
        dob: form.dob,
        adm_no: form.adm_no ? sanitizeInput(form.adm_no, 50) : undefined,
        class_id: form.class_id || undefined,
        stream_id: form.stream_id || undefined,
      },
    });
    if (error || data?.error) {
      toast({ title: "Enrollment Failed", description: data?.error || error?.message, variant: "destructive" });
    } else {
      setCreatedCreds({ email: data.email, password: data.temp_password });
      setShowEnroll(false);
      setForm(emptyForm);
      fetchData();
      toast({ title: "Student Enrolled!", description: `${form.first_name} ${form.last_name} enrolled successfully.` });
    }
    setEnrolling(false);
  };

  const exportNEMIS = () => {
    const headers = ["Adm No", "First Name", "Last Name", "Gender", "Date of Birth", "Class", "Stream", "Status"];
    const rows = filteredStudents.map(s => {
      const cls = classes.find(c => c.id === s.class_id)?.name || "";
      const strm = streams.find(st => st.id === s.stream_id)?.name || "";
      return [s.adm_no || "", s.first_name, s.last_name, s.gender || "", s.dob || "", cls, strm, s.is_active ? "Active" : "Inactive"];
    });
    const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `NEMIS_Students_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV Exported", description: `${filteredStudents.length} students exported.` });
  };

  const downloadTemplate = () => {
    const csv = `${CSV_TEMPLATE_HEADERS}\n${CSV_TEMPLATE_SAMPLE}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "student_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      toast({ title: "Invalid file", description: "Please select a CSV file.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCsv(text);
      if (rows.length === 0) {
        toast({ title: "Empty CSV", description: "No valid data rows found in the file.", variant: "destructive" });
        return;
      }
      setCsvRows(rows);
      setBulkResults(null);
      setBulkProgress(0);
    };
    reader.readAsText(file);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const resolveClassAndStream = (row: CsvRow): { class_id?: string; stream_id?: string } => {
    const result: { class_id?: string; stream_id?: string } = {};
    if (row.class_name) {
      const cls = classes.find(c => c.name.toLowerCase() === row.class_name.toLowerCase());
      if (cls) {
        result.class_id = cls.id;
        if (row.stream_name) {
          const strm = streams.find(s => s.class_id === cls.id && s.name.toLowerCase() === row.stream_name.toLowerCase());
          if (strm) result.stream_id = strm.id;
        }
      }
    }
    return result;
  };

  const handleBulkImport = async () => {
    const validRows = csvRows.filter(r => !r._error);
    if (validRows.length === 0) {
      toast({ title: "No valid rows", description: "Fix errors before importing.", variant: "destructive" });
      return;
    }

    setBulkImporting(true);
    setBulkProgress(0);
    let success = 0;
    let failed = 0;
    const errors: string[] = [];
    const updatedRows = [...csvRows];

    for (let i = 0; i < csvRows.length; i++) {
      const row = csvRows[i];
      if (row._error) {
        updatedRows[i] = { ...row, _status: "error" };
        failed++;
        errors.push(`Row ${i + 1}: ${row._error}`);
        continue;
      }

      const loginEmail = `${row.adm_no.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}@students.egrade.ke`;
      const { class_id, stream_id } = resolveClassAndStream(row);

      const { data, error } = await supabase.functions.invoke("register-school-member", {
        body: {
          action: "register",
          email: loginEmail,
          first_name: row.first_name,
          last_name: row.last_name,
          role: "student",
          phone: row.phone || "",
          gender: row.gender || "",
          dob: row.dob,
          adm_no: row.adm_no,
          class_id: class_id || undefined,
          stream_id: stream_id || undefined,
        },
      });

      if (error || data?.error) {
        failed++;
        const errMsg = data?.error || error?.message || "Unknown error";
        errors.push(`${row.first_name} ${row.last_name} (${row.adm_no}): ${errMsg}`);
        updatedRows[i] = { ...row, _status: "error", _error: errMsg };
      } else {
        success++;
        updatedRows[i] = { ...row, _status: "success" };
      }

      setBulkProgress(Math.round(((i + 1) / csvRows.length) * 100));
      setCsvRows([...updatedRows]);
    }

    setBulkResults({ success, failed, errors });
    setBulkImporting(false);
    if (success > 0) fetchData();
    toast({
      title: "Bulk Import Complete",
      description: `${success} registered, ${failed} failed.`,
      variant: failed > 0 ? "destructive" : "default",
    });
  };

  const filteredStudents = students.filter(s => {
    const matchClass = classFilter === "all" || s.class_id === classFilter;
    const matchSearch = `${s.first_name} ${s.last_name} ${s.adm_no || ""}`.toLowerCase().includes(search.toLowerCase());
    return matchClass && matchSearch;
  });

  const validCount = csvRows.filter(r => !r._error).length;
  const errorCount = csvRows.filter(r => !!r._error).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">Student Enrollment</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {students.length} students enrolled · NEMIS-Ready
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportNEMIS} className="font-bold gap-2">
            <Download className="w-4 h-4" /> NEMIS Export
          </Button>
          <Button variant="outline" onClick={() => { setCsvRows([]); setBulkResults(null); setBulkProgress(0); setShowBulk(true); }} className="font-bold gap-2">
            <Upload className="w-4 h-4" /> Bulk Import
          </Button>
          <Button onClick={() => { setForm(emptyForm); setShowEnroll(true); }} className="font-bold gap-2">
            <UserPlus className="w-4 h-4" /> Enroll Student
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or adm no..." className="pl-9" />
        </div>
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Classes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Users className="w-10 h-10" />
            <p className="font-semibold">No students found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-border">
                  {["Adm No", "Name", "Gender", "DOB", "Class", "Stream", "Status"].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredStudents.map(s => {
                  const cls = classes.find(c => c.id === s.class_id);
                  const strm = streams.find(st => st.id === s.stream_id);
                  return (
                    <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs">{s.adm_no || "—"}</td>
                      <td className="px-4 py-3 font-semibold text-foreground">{s.first_name} {s.last_name}</td>
                      <td className="px-4 py-3 text-muted-foreground capitalize">{s.gender || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{s.dob || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{cls?.name || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{strm?.name || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {s.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Enrollment Dialog */}
      <Dialog open={showEnroll} onOpenChange={setShowEnroll}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-black">Enroll New Student (NEMIS-Ready)</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="space-y-3">
              <p className="text-xs font-bold text-primary uppercase tracking-wider">Student Details</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">First Name *</Label>
                  <Input value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Last Name</Label>
                  <Input value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} className="mt-1" />
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold">Email *</Label>
                <Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="student@school.ac.ke" className="mt-1" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-semibold">Admission No.</Label>
                  <Input value={form.adm_no} onChange={e => setForm(p => ({ ...p, adm_no: e.target.value }))} placeholder="JSS/001/2026" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-semibold">UPI</Label>
                  <Input value={form.upi} onChange={e => setForm(p => ({ ...p, upi: e.target.value }))} placeholder="Unique Personal ID" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Birth Cert No.</Label>
                  <Input value={form.birth_cert_no} onChange={e => setForm(p => ({ ...p, birth_cert_no: e.target.value }))} className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-semibold">Date of Birth</Label>
                  <Input type="date" value={form.dob} onChange={e => setForm(p => ({ ...p, dob: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Gender</Label>
                  <Select value={form.gender} onValueChange={v => setForm(p => ({ ...p, gender: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-semibold">Phone</Label>
                  <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">Class</Label>
                  <Select value={form.class_id} onValueChange={v => setForm(p => ({ ...p, class_id: v, stream_id: "" }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select class" /></SelectTrigger>
                    <SelectContent>
                      {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-semibold">Stream</Label>
                  <Select value={form.stream_id} onValueChange={v => setForm(p => ({ ...p, stream_id: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select stream" /></SelectTrigger>
                    <SelectContent>
                      {classesForStream.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-dashed border-accent/40 p-3 bg-accent/5">
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <AlertTriangle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <span>The student's <strong>date of birth</strong> (YYYY-MM-DD) will be their initial password.</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEnroll(false)}>Cancel</Button>
            <Button onClick={handleEnroll} disabled={enrolling} className="font-bold gap-2">
              {enrolling ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Enroll Student
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Dialog */}
      <Dialog open={showBulk} onOpenChange={v => { if (!bulkImporting) setShowBulk(v); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-black flex items-center gap-2">
              <Upload className="w-5 h-5" /> Bulk Student Import
            </DialogTitle>
            <DialogDescription>
              Upload a CSV file to register multiple students at once. Each student gets an auto-generated login email from their admission number.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Instructions & template */}
            <div className="rounded-xl border border-dashed border-primary/30 p-4 bg-primary/5 space-y-3">
              <p className="text-xs font-bold text-primary uppercase tracking-wider">CSV Format</p>
              <p className="text-xs text-muted-foreground">
                Required columns: <span className="font-mono font-semibold">first_name, adm_no, dob</span><br />
                Optional columns: <span className="font-mono">last_name, gender, phone, class_name, stream_name</span>
              </p>
              <div className="bg-card rounded-lg border border-border p-3 font-mono text-[11px] text-muted-foreground overflow-x-auto whitespace-pre">
{CSV_TEMPLATE_HEADERS}
{CSV_TEMPLATE_SAMPLE}
              </div>
              <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-1 text-xs font-bold">
                <Download className="w-3 h-3" /> Download Template
              </Button>
            </div>

            {/* File upload */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={bulkImporting}
                className="w-full h-20 border-dashed border-2 gap-3 text-muted-foreground hover:text-foreground"
              >
                <FileUp className="w-6 h-6" />
                <span className="font-semibold">Click to select CSV file</span>
              </Button>
            </div>

            {/* Preview table */}
            {csvRows.length > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-foreground">
                    Preview: {csvRows.length} rows
                    {errorCount > 0 && <span className="text-destructive ml-2">({errorCount} with errors)</span>}
                  </p>
                  <Button variant="ghost" size="sm" onClick={() => setCsvRows([])} className="gap-1 text-xs">
                    <X className="w-3 h-3" /> Clear
                  </Button>
                </div>

                <div className="bg-card rounded-xl border border-border overflow-hidden max-h-64 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-muted">
                      <tr className="border-b border-border">
                        {["#", "First Name", "Last Name", "Adm No", "DOB", "Gender", "Class", "Stream", "Status"].map(h => (
                          <th key={h} className="text-left font-semibold text-muted-foreground px-3 py-2">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {csvRows.map((row, i) => (
                        <tr key={i} className={row._error ? "bg-destructive/5" : row._status === "success" ? "bg-green-50" : ""}>
                          <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                          <td className="px-3 py-2 font-medium">{row.first_name || <span className="text-destructive">—</span>}</td>
                          <td className="px-3 py-2">{row.last_name || "—"}</td>
                          <td className="px-3 py-2 font-mono">{row.adm_no || <span className="text-destructive">—</span>}</td>
                          <td className="px-3 py-2">{row.dob || <span className="text-destructive">—</span>}</td>
                          <td className="px-3 py-2 capitalize">{row.gender || "—"}</td>
                          <td className="px-3 py-2">{row.class_name || "—"}</td>
                          <td className="px-3 py-2">{row.stream_name || "—"}</td>
                          <td className="px-3 py-2">
                            {row._error ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">{row._error}</span>
                            ) : row._status === "success" ? (
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                            ) : row._status === "error" ? (
                              <AlertTriangle className="w-4 h-4 text-destructive" />
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Pending</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Progress */}
            {bulkImporting && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Importing students...</span>
                  <span>{bulkProgress}%</span>
                </div>
                <Progress value={bulkProgress} className="h-2" />
              </div>
            )}

            {/* Results */}
            {bulkResults && (
              <div className={`rounded-xl border p-4 ${bulkResults.failed > 0 ? "border-destructive/30 bg-destructive/5" : "border-green-200 bg-green-50"}`}>
                <p className="text-sm font-bold mb-2">
                  Import Complete: {bulkResults.success} succeeded, {bulkResults.failed} failed
                </p>
                {bulkResults.errors.length > 0 && (
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {bulkResults.errors.map((err, i) => (
                      <p key={i} className="text-xs text-destructive">{err}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulk(false)} disabled={bulkImporting}>Close</Button>
            {csvRows.length > 0 && !bulkResults && (
              <Button
                onClick={handleBulkImport}
                disabled={bulkImporting || validCount === 0}
                className="font-bold gap-2"
              >
                {bulkImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Import {validCount} Students
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credentials Modal */}
      <Dialog open={!!createdCreds} onOpenChange={() => setCreatedCreds(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-black flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" /> Student Enrolled
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <p className="text-sm font-bold text-green-800 mb-3">Login Credentials</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-mono font-semibold text-foreground">{createdCreds?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Password:</span>
                  <span className="font-mono font-bold text-primary">{createdCreds?.password}</span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setCreatedCreds(null)} className="font-bold">Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
