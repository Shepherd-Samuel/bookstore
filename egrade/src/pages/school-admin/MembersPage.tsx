import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { sanitizeFormData } from "@/lib/sanitize";
import {
  Plus, Search, RefreshCw, Loader2, Users, UserPlus, Eye, EyeOff,
  Key, AlertTriangle, CheckCircle2, GraduationCap, UserCheck,
  Pencil, Trash2, Save, X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type Profile = {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  phone: string;
  gender: string | null;
  dob: string | null;
  adm_no: string | null;
  is_active: boolean;
  class_id: string | null;
  stream_id: string | null;
  created_at: string;
};

type ClassRow = { id: string; name: string; level: string };
type StreamRow = { id: string; name: string; class_id: string };

const emptyForm = {
  email: "", first_name: "", last_name: "", role: "teacher",
  phone: "", gender: "", dob: "", adm_no: "",
  class_id: "", stream_id: "",
};

export default function MembersPage() {
  const { profile: myProfile } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<Profile[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [streams, setStreams] = useState<StreamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [createdCreds, setCreatedCreds] = useState<{ email: string; password: string; loginNote?: string } | null>(null);
  const [resetResult, setResetResult] = useState<{ password: string } | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Profile>>({});
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);
  const [deleting, setDeleting] = useState(false);

  const schoolId = myProfile?.school_id;

  const fetchData = async () => {
    if (!schoolId) return;
    setLoading(true);
    const [membersRes, classesRes, streamsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("school_id", schoolId).order("created_at", { ascending: false }),
      supabase.from("classes").select("id, name, level").eq("school_id", schoolId).eq("is_active", true),
      supabase.from("streams").select("id, name, class_id").eq("school_id", schoolId).eq("is_active", true),
    ]);
    if (membersRes.data) setMembers(membersRes.data as Profile[]);
    if (classesRes.data) setClasses(classesRes.data);
    if (streamsRes.data) setStreams(streamsRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [schoolId]);

  const handleCreate = async () => {
    if (!form.first_name || !form.role) {
      toast({ title: "Missing fields", description: "First name and role are required.", variant: "destructive" });
      return;
    }

    // For students: require adm_no
    if (form.role === "student") {
      if (!form.adm_no) {
        toast({ title: "Admission number required", description: "Students must have an admission number.", variant: "destructive" });
        return;
      }
    } else {
      if (!form.email) {
        toast({ title: "Email required", variant: "destructive" });
        return;
      }
    }

    setCreating(true);

    // Sanitize all form inputs
    const sanitized = sanitizeFormData(form);

    // For students, generate a unique login email from adm_no
    const loginEmail = sanitized.role === "student"
      ? `${sanitized.adm_no.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}@students.egrade.ke`
      : sanitized.email;

    const { data, error } = await supabase.functions.invoke("register-school-member", {
      body: {
        action: "register",
        ...sanitized,
        email: loginEmail,
      },
    });
    if (error || data?.error) {
      toast({ title: "Registration Failed", description: data?.error || error?.message, variant: "destructive" });
    } else {
      const loginNote = form.role === "student"
        ? `Student logs in with Admission No: ${form.adm_no} (email: ${loginEmail}) and password: their date of birth (${form.dob || "YYYY-MM-DD"})`
        : undefined;
      setCreatedCreds({ email: data.email, password: data.temp_password, loginNote });
      setShowCreate(false);
      setForm(emptyForm);
      fetchData();
      toast({ title: "Member Registered!", description: `${form.first_name} ${form.last_name} registered as ${form.role}.` });
    }
    setCreating(false);
  };

  const handleEdit = (member: Profile) => {
    setEditingId(member.id);
    setEditForm({
      first_name: member.first_name,
      last_name: member.last_name,
      phone: member.phone,
      gender: member.gender,
      dob: member.dob,
      adm_no: member.adm_no,
      class_id: member.class_id,
      stream_id: member.stream_id,
      is_active: member.is_active,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        phone: editForm.phone || "",
        gender: editForm.gender || null,
        dob: editForm.dob || null,
        adm_no: editForm.adm_no || null,
        class_id: editForm.class_id || null,
        stream_id: editForm.stream_id || null,
        is_active: editForm.is_active,
      })
      .eq("id", editingId);

    if (error) {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Updated", description: "Member details saved." });
      setEditingId(null);
      fetchData();
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    // Soft delete - set is_active = false
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: false })
      .eq("id", deleteTarget.id);

    if (error) {
      toast({ title: "Deactivation Failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Member Deactivated", description: `${deleteTarget.first_name} ${deleteTarget.last_name} has been deactivated.` });
      setDeleteTarget(null);
      fetchData();
    }
    setDeleting(false);
  };

  const handleResetPassword = async (userId: string) => {
    setResettingId(userId);
    const { data, error } = await supabase.functions.invoke("register-school-member", {
      body: { action: "reset_password", user_id: userId },
    });
    if (error || data?.error) {
      toast({ title: "Reset Failed", description: data?.error || error?.message, variant: "destructive" });
    } else {
      setResetResult({ password: data.new_password });
      toast({ title: "Password Reset", description: "New password generated." });
    }
    setResettingId(null);
  };

  const filteredMembers = members.filter(m => {
    const matchRole = roleFilter === "all" || m.role === roleFilter;
    const matchSearch = `${m.first_name} ${m.last_name} ${m.adm_no || ""}`.toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  const teachers = members.filter(m => m.role === "teacher");
  const students = members.filter(m => m.role === "student");

  const classesForStream = (classId: string) => streams.filter(s => s.class_id === classId);

  const ROLE_COLORS: Record<string, string> = {
    school_admin: "bg-blue-100 text-blue-700",
    teacher: "bg-green-100 text-green-700",
    student: "bg-amber-100 text-amber-700",
    parent: "bg-purple-100 text-purple-700",
  };

  const getClassName = (id: string | null) => classes.find(c => c.id === id)?.name || "";
  const getStreamName = (id: string | null) => streams.find(s => s.id === id)?.name || "";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">School Members</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {teachers.length} teachers · {students.length} students · {members.length} total
          </p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setShowCreate(true); }} className="font-bold gap-2">
          <UserPlus className="w-4 h-4" /> Register Member
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search members..." className="pl-9" />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="teacher">Teachers</SelectItem>
            <SelectItem value="student">Students</SelectItem>
            <SelectItem value="school_admin">Admins</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={fetchData} className="gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Users className="w-10 h-10" />
            <p className="font-semibold">No members found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-border">
                  {["Name", "Role", "Adm No", "Class/Stream", "Gender", "Status", "Actions"].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredMembers.map(m => (
                  <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">{m.first_name} {m.last_name}</p>
                      {m.phone && <p className="text-xs text-muted-foreground">{m.phone}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ROLE_COLORS[m.role] || "bg-gray-100 text-gray-600"}`}>
                        {m.role.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{m.adm_no || "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {m.class_id ? getClassName(m.class_id) : "—"}
                      {m.stream_id ? ` / ${getStreamName(m.stream_id)}` : ""}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">{m.gender || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {m.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(m)}
                          className="gap-1 h-7 text-xs font-bold px-2"
                        >
                          <Pencil className="w-3 h-3" /> Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResetPassword(m.id)}
                          disabled={resettingId === m.id}
                          className="gap-1 h-7 text-xs font-bold px-2"
                        >
                          {resettingId === m.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Key className="w-3 h-3" />}
                          Reset
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDeleteTarget(m)}
                          className="gap-1 h-7 text-xs font-bold px-2 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Register Member Modal */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-black">Register New Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold">Role *</Label>
              <Select value={form.role} onValueChange={v => setForm(p => ({ ...p, role: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">First Name *</Label>
                <Input value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} placeholder="John" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Last Name</Label>
                <Input value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} placeholder="Kamau" className="mt-1" />
              </div>
            </div>

            {form.role === "teacher" && (
              <div>
                <Label className="text-xs font-semibold">Email *</Label>
                <Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="teacher@school.ac.ke" className="mt-1" />
              </div>
            )}

            {form.role === "student" && (
              <>
                <div className="rounded-xl border border-dashed border-accent/40 p-3 bg-accent/5">
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <AlertTriangle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                    <div>
                      <p><strong>Student Login:</strong> Students log in using their <strong>Admission Number</strong> as username and <strong>Date of Birth</strong> as password.</p>
                      <p className="mt-1">A unique login email is auto-generated from the admission number. The parent's email is stored separately for communication.</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold">Admission No. *</Label>
                    <Input value={form.adm_no} onChange={e => setForm(p => ({ ...p, adm_no: e.target.value }))} placeholder="JSS/001/2026" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Date of Birth *</Label>
                    <Input type="date" value={form.dob} onChange={e => setForm(p => ({ ...p, dob: e.target.value }))} className="mt-1" />
                  </div>
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Phone</Label>
                <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+254 700 000000" className="mt-1" />
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
            </div>

            {form.role === "student" && (
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
                      {classesForStream(form.class_id).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {form.role === "teacher" && (
              <div className="rounded-xl border border-dashed border-primary/30 p-3 bg-primary/5">
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <GraduationCap className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>A temporary password will be generated. The teacher must change it on first login.</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating} className="font-bold gap-2">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Register
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Member Modal */}
      <Dialog open={!!editingId} onOpenChange={() => setEditingId(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-black">Edit Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">First Name</Label>
                <Input value={editForm.first_name || ""} onChange={e => setEditForm(p => ({ ...p, first_name: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Last Name</Label>
                <Input value={editForm.last_name || ""} onChange={e => setEditForm(p => ({ ...p, last_name: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Phone</Label>
                <Input value={editForm.phone || ""} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Gender</Label>
                <Select value={editForm.gender || ""} onValueChange={v => setEditForm(p => ({ ...p, gender: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Date of Birth</Label>
                <Input type="date" value={editForm.dob || ""} onChange={e => setEditForm(p => ({ ...p, dob: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Admission No.</Label>
                <Input value={editForm.adm_no || ""} onChange={e => setEditForm(p => ({ ...p, adm_no: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Class</Label>
                <Select value={editForm.class_id || ""} onValueChange={v => setEditForm(p => ({ ...p, class_id: v, stream_id: null }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Stream</Label>
                <Select value={editForm.stream_id || ""} onValueChange={v => setEditForm(p => ({ ...p, stream_id: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select stream" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {editForm.class_id ? classesForStream(editForm.class_id).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>) : null}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold">Status</Label>
              <Select value={editForm.is_active ? "active" : "inactive"} onValueChange={v => setEditForm(p => ({ ...p, is_active: v === "active" }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={saving} className="font-bold gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-black text-destructive flex items-center gap-2">
              <Trash2 className="w-5 h-5" /> Deactivate Member
            </DialogTitle>
            <DialogDescription>
              This will deactivate <strong>{deleteTarget?.first_name} {deleteTarget?.last_name}</strong>. They will no longer be able to log in. This can be reversed by editing their status.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="font-bold gap-2">
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credentials Modal */}
      <Dialog open={!!createdCreds} onOpenChange={() => setCreatedCreds(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-black flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" /> Member Registered
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <p className="text-sm font-bold text-green-800 mb-3">Login Credentials</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Login Email:</span>
                  <span className="font-mono font-semibold text-foreground">{createdCreds?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Password:</span>
                  <span className="font-mono font-bold text-primary">{createdCreds?.password}</span>
                </div>
              </div>
            </div>
            {createdCreds?.loginNote && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
                <strong>Student Login Note:</strong> {createdCreds.loginNote}
              </div>
            )}
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <span>Share these credentials securely. The member should change their password after first login.</span>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setCreatedCreds(null)} className="font-bold">Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Result Modal */}
      <Dialog open={!!resetResult} onOpenChange={() => setResetResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-black flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" /> Password Reset
            </DialogTitle>
          </DialogHeader>
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm font-bold text-foreground mb-2">New Password</p>
            <p className="font-mono font-bold text-primary text-lg">{resetResult?.password}</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setResetResult(null)} className="font-bold">Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
