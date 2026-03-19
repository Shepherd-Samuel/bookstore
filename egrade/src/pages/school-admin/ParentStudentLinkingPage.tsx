import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { sanitizeInput } from "@/lib/sanitize";
import {
  Search, Loader2, Users, UserPlus, Link2, Unlink, Pencil, Plus,
  Save, X, CheckCircle2, Copy, Mail, KeyRound,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type StudentProfile = {
  id: string; first_name: string; last_name: string; adm_no: string | null;
  class_id: string | null; stream_id: string | null; is_active: boolean;
};
type ParentRow = {
  id: string; first_name: string; last_name: string; email: string;
  phone: string | null; national_id: string | null; relationship: string | null;
};
type LinkRow = { id: string; student_profile_id: string; parent_id: string };
type ClassRow = { id: string; name: string };
type StreamRow = { id: string; name: string; class_id: string };

const emptyParentForm = {
  first_name: "", last_name: "", email: "", phone: "", national_id: "", relationship: "parent",
};

export default function ParentStudentLinkingPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const schoolId = profile?.school_id;

  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [parents, setParents] = useState<ParentRow[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [streams, setStreams] = useState<StreamRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Link flow
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [parentSearch, setParentSearch] = useState("");
  const [selectedParent, setSelectedParent] = useState<string>("");
  const [linking, setLinking] = useState(false);

  // Create parent
  const [showCreateParent, setShowCreateParent] = useState(false);
  const [parentForm, setParentForm] = useState(emptyParentForm);
  const [creatingParent, setCreatingParent] = useState(false);

  // Edit link
  const [editLink, setEditLink] = useState<LinkRow | null>(null);
  const [editParentId, setEditParentId] = useState("");

  // Search
  const [studentSearch, setStudentSearch] = useState("");

  const fetchAll = async () => {
    if (!schoolId) return;
    setLoading(true);
    const [studRes, parRes, linkRes, clsRes, strmRes] = await Promise.all([
      supabase.from("profiles").select("id, first_name, last_name, adm_no, class_id, stream_id, is_active").eq("school_id", schoolId).eq("role", "student").eq("is_active", true).order("first_name"),
      supabase.from("parents").select("*").eq("school_id", schoolId).order("first_name"),
      supabase.from("student_parents").select("*"),
      supabase.from("classes").select("id, name").eq("school_id", schoolId).eq("is_active", true),
      supabase.from("streams").select("id, name, class_id").eq("school_id", schoolId).eq("is_active", true),
    ]);
    if (studRes.data) setStudents(studRes.data as StudentProfile[]);
    if (parRes.data) setParents(parRes.data as ParentRow[]);
    if (linkRes.data) setLinks(linkRes.data as LinkRow[]);
    if (clsRes.data) setClasses(clsRes.data);
    if (strmRes.data) setStreams(strmRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [schoolId]);

  const linkedStudentIds = useMemo(() => new Set(links.map(l => l.student_profile_id)), [links]);

  const unlinkedStudents = useMemo(
    () => students.filter(s => !linkedStudentIds.has(s.id)),
    [students, linkedStudentIds]
  );

  const linkedStudents = useMemo(
    () => students.filter(s => linkedStudentIds.has(s.id)),
    [students, linkedStudentIds]
  );

  const filteredParents = useMemo(() => {
    if (!parentSearch.trim()) return parents;
    const q = parentSearch.toLowerCase();
    return parents.filter(p =>
      `${p.first_name} ${p.last_name} ${p.email} ${p.phone || ""}`.toLowerCase().includes(q)
    );
  }, [parents, parentSearch]);

  const getClassName = (id: string | null) => classes.find(c => c.id === id)?.name || "";
  const getStreamName = (id: string | null) => streams.find(s => s.id === id)?.name || "";
  const getParent = (id: string) => parents.find(p => p.id === id);
  const getStudent = (id: string) => students.find(s => s.id === id);

  const handleLink = async () => {
    if (!selectedStudent || !selectedParent) {
      toast({ title: "Select both", description: "Pick a student and a parent to link.", variant: "destructive" });
      return;
    }
    setLinking(true);
    const { error } = await supabase.from("student_parents").insert({
      student_profile_id: selectedStudent,
      parent_id: selectedParent,
    });
    if (error) {
      toast({ title: "Linking failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Linked!", description: "Student linked to parent successfully." });
      setShowLinkDialog(false);
      setSelectedStudent("");
      setSelectedParent("");
      setParentSearch("");
      fetchAll();
    }
    setLinking(false);
  };

  const [parentCredentials, setParentCredentials] = useState<{ email: string; password: string; isExisting: boolean } | null>(null);

  const handleCreateParent = async () => {
    if (!parentForm.email || !parentForm.first_name) {
      toast({ title: "Missing fields", description: "First name and email are required.", variant: "destructive" });
      return;
    }
    if (!schoolId) return;
    setCreatingParent(true);

    try {
      const { data, error } = await supabase.functions.invoke("register-parent", {
        body: {
          first_name: sanitizeInput(parentForm.first_name, 100),
          last_name: sanitizeInput(parentForm.last_name, 100),
          email: parentForm.email.trim().toLowerCase(),
          phone: parentForm.phone ? sanitizeInput(parentForm.phone, 20) : null,
          national_id: parentForm.national_id ? sanitizeInput(parentForm.national_id, 50) : null,
          relationship: parentForm.relationship,
        },
      });

      if (error) throw error;
      if (data?.error) {
        // Check if parent already exists
        if (data.error.includes("already exists")) {
          toast({ title: "Parent already exists", description: data.error + " You can link them directly.", variant: "destructive" });
        } else {
          toast({ title: "Failed", description: data.error, variant: "destructive" });
        }
        setCreatingParent(false);
        return;
      }

      // Show credentials to admin
      if (data.temp_password && !data.is_existing_user) {
        setParentCredentials({
          email: data.email,
          password: data.temp_password,
          isExisting: false,
        });
      }

      toast({
        title: "Parent created",
        description: data.is_existing_user
          ? `${parentForm.first_name} linked to existing account. They can log in with their current credentials.`
          : `${parentForm.first_name} registered. A verification email has been sent to ${data.email}.`,
      });
      setShowCreateParent(false);
      setParentForm(emptyParentForm);
      if (data.parent_id) setSelectedParent(data.parent_id);
      fetchAll();
    } catch (err: any) {
      toast({ title: "Failed", description: err.message || "An error occurred.", variant: "destructive" });
    }
    setCreatingParent(false);
  };

  const handleUpdateLink = async () => {
    if (!editLink || !editParentId) return;
    // Delete old link, insert new
    const { error: delErr } = await supabase.from("student_parents").delete().eq("id", editLink.id);
    if (delErr) {
      toast({ title: "Update failed", description: delErr.message, variant: "destructive" });
      return;
    }
    const { error: insErr } = await supabase.from("student_parents").insert({
      student_profile_id: editLink.student_profile_id,
      parent_id: editParentId,
    });
    if (insErr) {
      toast({ title: "Update failed", description: insErr.message, variant: "destructive" });
    } else {
      toast({ title: "Updated", description: "Parent link updated." });
    }
    setEditLink(null);
    setEditParentId("");
    fetchAll();
  };

  const filteredUnlinked = useMemo(() => {
    if (!studentSearch.trim()) return unlinkedStudents;
    const q = studentSearch.toLowerCase();
    return unlinkedStudents.filter(s =>
      `${s.first_name} ${s.last_name} ${s.adm_no || ""}`.toLowerCase().includes(q)
    );
  }, [unlinkedStudents, studentSearch]);

  const filteredLinked = useMemo(() => {
    if (!studentSearch.trim()) return linkedStudents;
    const q = studentSearch.toLowerCase();
    return linkedStudents.filter(s =>
      `${s.first_name} ${s.last_name} ${s.adm_no || ""}`.toLowerCase().includes(q)
    );
  }, [linkedStudents, studentSearch]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">Parent-Student Linking</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {unlinkedStudents.length} unlinked · {linkedStudents.length} linked · {parents.length} parents
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setParentForm(emptyParentForm); setShowCreateParent(true); }} className="font-bold gap-2">
            <Plus className="w-4 h-4" /> Add Parent
          </Button>
          <Button onClick={() => { setSelectedStudent(""); setSelectedParent(""); setParentSearch(""); setShowLinkDialog(true); }} className="font-bold gap-2">
            <Link2 className="w-4 h-4" /> Link Student to Parent
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="Search students by name or adm no..." className="pl-9" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <Tabs defaultValue="unlinked" className="space-y-4">
          <TabsList>
            <TabsTrigger value="unlinked" className="gap-1.5">
              <Unlink className="w-3.5 h-3.5" /> Unlinked ({filteredUnlinked.length})
            </TabsTrigger>
            <TabsTrigger value="linked" className="gap-1.5">
              <Link2 className="w-3.5 h-3.5" /> Linked ({filteredLinked.length})
            </TabsTrigger>
            <TabsTrigger value="parents" className="gap-1.5">
              <Users className="w-3.5 h-3.5" /> Parents ({parents.length})
            </TabsTrigger>
          </TabsList>

          {/* Unlinked students */}
          <TabsContent value="unlinked">
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              {filteredUnlinked.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                  <CheckCircle2 className="w-10 h-10 text-green-500" />
                  <p className="font-semibold">All students are linked to parents!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-border">
                      {["Adm No", "Name", "Class/Stream", "Action"].map(h => (
                        <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody className="divide-y divide-border">
                      {filteredUnlinked.map(s => (
                        <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs">{s.adm_no || "—"}</td>
                          <td className="px-4 py-3 font-semibold text-foreground">{s.first_name} {s.last_name}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {getClassName(s.class_id)}{s.stream_id ? ` / ${getStreamName(s.stream_id)}` : ""}
                          </td>
                          <td className="px-4 py-3">
                            <Button size="sm" onClick={() => { setSelectedStudent(s.id); setSelectedParent(""); setParentSearch(""); setShowLinkDialog(true); }} className="gap-1 h-7 text-xs font-bold px-3">
                              <Link2 className="w-3 h-3" /> Link
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Linked students */}
          <TabsContent value="linked">
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              {filteredLinked.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                  <Users className="w-10 h-10" />
                  <p className="font-semibold">No linked students found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                   <table className="w-full text-sm min-w-[600px]">
                    <thead><tr className="border-b border-border">
                      {["Adm No", "Student Name", "Parent Name", "Parent Email", "Parent Phone", "Action"].map(h => (
                        <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody className="divide-y divide-border">
                      {filteredLinked.map(s => {
                        const link = links.find(l => l.student_profile_id === s.id);
                        const parent = link ? getParent(link.parent_id) : null;
                        return (
                          <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3 font-mono text-xs">{s.adm_no || "—"}</td>
                            <td className="px-4 py-3 font-semibold text-foreground">{s.first_name} {s.last_name}</td>
                            <td className="px-4 py-3 text-muted-foreground">{parent ? `${parent.first_name} ${parent.last_name}` : "—"}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{parent?.email || "—"}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{parent?.phone || "—"}</td>
                            <td className="px-4 py-3">
                              {link && (
                                <Button size="sm" variant="outline" onClick={() => { setEditLink(link); setEditParentId(link.parent_id); setParentSearch(""); }} className="gap-1 h-7 text-xs font-bold px-2">
                                  <Pencil className="w-3 h-3" /> Edit
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Parents list */}
          <TabsContent value="parents">
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              {parents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                  <Users className="w-10 h-10" />
                  <p className="font-semibold">No parents registered</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                   <table className="w-full text-sm min-w-[700px]">
                    <thead><tr className="border-b border-border">
                      {["Name", "Email", "Phone", "National ID", "Relationship", "Linked Students"].map(h => (
                        <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody className="divide-y divide-border">
                      {parents.map(p => {
                        const childLinks = links.filter(l => l.parent_id === p.id);
                        const childNames = childLinks.map(l => {
                          const s = getStudent(l.student_profile_id);
                          return s ? `${s.first_name} ${s.last_name}` : "—";
                        });
                        return (
                          <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3 font-semibold text-foreground">{p.first_name} {p.last_name}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{p.email}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{p.phone || "—"}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{p.national_id || "—"}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground capitalize">{p.relationship || "—"}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{childNames.length > 0 ? childNames.join(", ") : "None"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Link Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-black">Link Student to Parent</DialogTitle>
            <DialogDescription>Select an unlinked student and search for or create a parent to link.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Student selector - only unlinked */}
            <div>
              <Label className="text-xs font-semibold">Student *</Label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select student" /></SelectTrigger>
                <SelectContent>
                  {unlinkedStudents.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.first_name} {s.last_name} {s.adm_no ? `(${s.adm_no})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Parent search */}
            <div>
              <Label className="text-xs font-semibold">Search Parent (name, email, or phone)</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={parentSearch} onChange={e => setParentSearch(e.target.value)} placeholder="Type to search..." className="pl-9" />
              </div>
            </div>

            {/* Parent results */}
            <div className="max-h-48 overflow-y-auto space-y-1 border border-border rounded-lg p-2">
              {filteredParents.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No parents found. Create a new one below.</p>
              ) : (
                filteredParents.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedParent(p.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedParent === p.id ? "bg-primary/10 border border-primary/30 font-semibold" : "hover:bg-muted/60"}`}
                  >
                    <span className="font-medium">{p.first_name} {p.last_name}</span>
                    <span className="text-xs text-muted-foreground ml-2">{p.email}</span>
                    {p.phone && <span className="text-xs text-muted-foreground ml-2">· {p.phone}</span>}
                  </button>
                ))
              )}
            </div>

            <Button variant="outline" size="sm" onClick={() => setShowCreateParent(true)} className="gap-1 text-xs font-bold">
              <Plus className="w-3 h-3" /> Create New Parent
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLinkDialog(false)}>Cancel</Button>
            <Button onClick={handleLink} disabled={linking || !selectedStudent || !selectedParent} className="font-bold gap-2">
              {linking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
              Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Parent Dialog */}
      <Dialog open={showCreateParent} onOpenChange={setShowCreateParent}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-black">Add New Parent</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">First Name *</Label>
                <Input value={parentForm.first_name} onChange={e => setParentForm(p => ({ ...p, first_name: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Last Name</Label>
                <Input value={parentForm.last_name} onChange={e => setParentForm(p => ({ ...p, last_name: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold">Email *</Label>
              <Input type="email" value={parentForm.email} onChange={e => setParentForm(p => ({ ...p, email: e.target.value }))} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Phone</Label>
                <Input value={parentForm.phone} onChange={e => setParentForm(p => ({ ...p, phone: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-semibold">National ID</Label>
                <Input value={parentForm.national_id} onChange={e => setParentForm(p => ({ ...p, national_id: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold">Relationship</Label>
              <Select value={parentForm.relationship} onValueChange={v => setParentForm(p => ({ ...p, relationship: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="guardian">Guardian</SelectItem>
                  <SelectItem value="sponsor">Sponsor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateParent(false)}>Cancel</Button>
            <Button onClick={handleCreateParent} disabled={creatingParent} className="font-bold gap-2">
              {creatingParent ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Create Parent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Link Dialog */}
      <Dialog open={!!editLink} onOpenChange={() => setEditLink(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-black">Edit Parent Link</DialogTitle>
            <DialogDescription>
              Change the parent linked to {editLink ? (() => { const s = getStudent(editLink.student_profile_id); return s ? `${s.first_name} ${s.last_name}` : "this student"; })() : "this student"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold">Search Parent</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={parentSearch} onChange={e => setParentSearch(e.target.value)} placeholder="Type to search..." className="pl-9" />
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1 border border-border rounded-lg p-2">
              {filteredParents.map(p => (
                <button
                  key={p.id}
                  onClick={() => setEditParentId(p.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${editParentId === p.id ? "bg-primary/10 border border-primary/30 font-semibold" : "hover:bg-muted/60"}`}
                >
                  <span className="font-medium">{p.first_name} {p.last_name}</span>
                  <span className="text-xs text-muted-foreground ml-2">{p.email}</span>
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditLink(null)}>Cancel</Button>
            <Button onClick={handleUpdateLink} disabled={!editParentId} className="font-bold gap-2">
              <Save className="w-4 h-4" /> Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Parent Credentials Dialog */}
      <Dialog open={!!parentCredentials} onOpenChange={() => setParentCredentials(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-black flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" /> Parent Account Created
            </DialogTitle>
            <DialogDescription>
              A verification email has been sent. Share the temporary password below with the parent. They must verify their email first, then log in and reset their password.
            </DialogDescription>
          </DialogHeader>
          {parentCredentials && (
            <div className="space-y-3 py-2">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2 border border-border">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Email</span>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1"
                    onClick={() => { navigator.clipboard.writeText(parentCredentials.email); toast({ title: "Copied!" }); }}>
                    <Copy className="w-3 h-3" /> Copy
                  </Button>
                </div>
                <p className="font-mono text-sm text-foreground">{parentCredentials.email}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2 border border-border">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Temporary Password</span>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1"
                    onClick={() => { navigator.clipboard.writeText(parentCredentials.password); toast({ title: "Copied!" }); }}>
                    <Copy className="w-3 h-3" /> Copy
                  </Button>
                </div>
                <p className="font-mono text-sm text-foreground">{parentCredentials.password}</p>
              </div>
              <div className="flex items-start gap-2 bg-yellow-500/10 rounded-lg p-3 border border-yellow-500/20">
                <Mail className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  The parent must click the verification link in their email before they can log in. After verification, they'll be prompted to change their password on first login.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setParentCredentials(null)} className="font-bold">Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
