import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import EGradeLoader from "@/components/ui/EGradeLoader";
import {
  Loader2, Plus, Trash2, Edit2, Save, X, Star, ChevronDown, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

type GradingScale = {
  id: string; name: string; description: string; is_default: boolean; is_active: boolean;
};
type GradeEntry = {
  id: string; grading_scale_id: string; grade: string; label: string;
  min_score: number; max_score: number; points: number; order_index: number;
};
type SubGradeEntry = {
  id: string; grade_entry_id: string; sub_grade: string;
  min_score: number; max_score: number; points: number; order_index: number;
};

export default function GradingManagementPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const schoolId = profile?.school_id;

  const [loading, setLoading] = useState(true);
  const [scales, setScales] = useState<GradingScale[]>([]);
  const [entries, setEntries] = useState<GradeEntry[]>([]);
  const [subEntries, setSubEntries] = useState<SubGradeEntry[]>([]);
  const [selectedScale, setSelectedScale] = useState<string>("");
  const [expandedGrade, setExpandedGrade] = useState<string>("");

  // Dialogs
  const [showScaleDialog, setShowScaleDialog] = useState(false);
  const [editingScale, setEditingScale] = useState<GradingScale | null>(null);
  const [scaleName, setScaleName] = useState("");
  const [scaleDesc, setScaleDesc] = useState("");
  const [scaleIsDefault, setScaleIsDefault] = useState(false);

  const [showGradeDialog, setShowGradeDialog] = useState(false);
  const [editingGrade, setEditingGrade] = useState<GradeEntry | null>(null);
  const [gradeName, setGradeName] = useState("");
  const [gradeLabel, setGradeLabel] = useState("");
  const [gradeMin, setGradeMin] = useState("");
  const [gradeMax, setGradeMax] = useState("");
  const [gradePoints, setGradePoints] = useState("");

  const [showSubDialog, setShowSubDialog] = useState(false);
  const [editingSub, setEditingSub] = useState<SubGradeEntry | null>(null);
  const [subParentId, setSubParentId] = useState("");
  const [subGrade, setSubGrade] = useState("");
  const [subMin, setSubMin] = useState("");
  const [subMax, setSubMax] = useState("");
  const [subPoints, setSubPoints] = useState("");

  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    if (!schoolId) return;
    setLoading(true);
    const [scalesR, entriesR, subR] = await Promise.all([
      supabase.from("grading_scales").select("*").eq("school_id", schoolId).order("created_at"),
      supabase.from("grade_entries").select("*").order("order_index"),
      supabase.from("grade_sub_entries").select("*").order("order_index"),
    ]);
    const s = (scalesR.data || []) as GradingScale[];
    setScales(s);
    setEntries((entriesR.data || []) as GradeEntry[]);
    setSubEntries((subR.data || []) as SubGradeEntry[]);
    if (!selectedScale && s.length > 0) setSelectedScale(s[0].id);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [schoolId]);

  const scaleEntries = entries.filter(e => e.grading_scale_id === selectedScale).sort((a, b) => a.order_index - b.order_index);

  // ── Scale CRUD ──
  const handleSaveScale = async () => {
    if (!schoolId || !scaleName.trim()) return;
    setSaving(true);

    if (scaleIsDefault) {
      // Unset other defaults
      await supabase.from("grading_scales").update({ is_default: false }).eq("school_id", schoolId);
    }

    if (editingScale) {
      await supabase.from("grading_scales").update({
        name: scaleName, description: scaleDesc, is_default: scaleIsDefault, updated_at: new Date().toISOString(),
      }).eq("id", editingScale.id);
    } else {
      const { data } = await supabase.from("grading_scales").insert({
        school_id: schoolId, name: scaleName, description: scaleDesc, is_default: scaleIsDefault,
      }).select("id").single();
      if (data) setSelectedScale(data.id);
    }
    setSaving(false);
    setShowScaleDialog(false);
    toast({ title: editingScale ? "Scale Updated" : "Scale Created" });
    loadData();
  };

  const handleDeleteScale = async (id: string) => {
    await supabase.from("grading_scales").delete().eq("id", id);
    if (selectedScale === id) setSelectedScale("");
    toast({ title: "Scale Deleted" });
    loadData();
  };

  // ── Grade CRUD ──
  const handleSaveGrade = async () => {
    if (!selectedScale || !gradeName.trim()) return;
    setSaving(true);
    const payload = {
      grade: gradeName, label: gradeLabel, min_score: Number(gradeMin), max_score: Number(gradeMax),
      points: Number(gradePoints) || 0, order_index: editingGrade?.order_index ?? scaleEntries.length,
    };
    if (editingGrade) {
      await supabase.from("grade_entries").update(payload).eq("id", editingGrade.id);
    } else {
      await supabase.from("grade_entries").insert({ ...payload, grading_scale_id: selectedScale });
    }
    setSaving(false);
    setShowGradeDialog(false);
    toast({ title: editingGrade ? "Grade Updated" : "Grade Added" });
    loadData();
  };

  const handleDeleteGrade = async (id: string) => {
    await supabase.from("grade_entries").delete().eq("id", id);
    toast({ title: "Grade Deleted" });
    loadData();
  };

  // ── Sub-grade CRUD ──
  const handleSaveSub = async () => {
    if (!subParentId || !subGrade.trim()) return;
    setSaving(true);
    const existingSubs = subEntries.filter(s => s.grade_entry_id === subParentId);
    const payload = {
      sub_grade: subGrade, min_score: Number(subMin), max_score: Number(subMax),
      points: Number(subPoints) || 0, order_index: editingSub?.order_index ?? existingSubs.length,
    };
    if (editingSub) {
      await supabase.from("grade_sub_entries").update(payload).eq("id", editingSub.id);
    } else {
      await supabase.from("grade_sub_entries").insert({ ...payload, grade_entry_id: subParentId });
    }
    setSaving(false);
    setShowSubDialog(false);
    toast({ title: editingSub ? "Sub-grade Updated" : "Sub-grade Added" });
    loadData();
  };

  const handleDeleteSub = async (id: string) => {
    await supabase.from("grade_sub_entries").delete().eq("id", id);
    toast({ title: "Sub-grade Deleted" });
    loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <EGradeLoader message="Loading grading scales..." />
      </div>
    );
  }

  const activeScale = scales.find(s => s.id === selectedScale);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-foreground">Grading System</h1>
        <p className="text-sm text-muted-foreground">Manage grading scales with main grades and optional sub-grades (e.g., KJSEA style)</p>
      </div>

      {/* ── Grading Scales ── */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">Grading Scales</h2>
          <Button size="sm" className="gap-1.5 text-xs h-8" onClick={() => {
            setEditingScale(null); setScaleName(""); setScaleDesc(""); setScaleIsDefault(false);
            setShowScaleDialog(true);
          }}>
            <Plus className="w-3.5 h-3.5" /> New Scale
          </Button>
        </div>

        {scales.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No grading scales yet. Create one to get started.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {scales.map(s => (
              <button key={s.id}
                onClick={() => setSelectedScale(s.id)}
                className={`group relative px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                  selectedScale === s.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/30 text-foreground border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  {s.is_default && <Star className="w-3 h-3 fill-current" />}
                  {s.name}
                  {!s.is_active && <Badge variant="secondary" className="text-[9px] px-1 py-0">Inactive</Badge>}
                </div>
                <div className="absolute -top-1 -right-1 hidden group-hover:flex gap-0.5">
                  <button onClick={(e) => { e.stopPropagation(); setEditingScale(s); setScaleName(s.name); setScaleDesc(s.description); setScaleIsDefault(s.is_default); setShowScaleDialog(true); }}
                    className="w-5 h-5 rounded-full bg-muted border border-border flex items-center justify-center hover:bg-accent">
                    <Edit2 className="w-2.5 h-2.5" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteScale(s.id); }}
                    className="w-5 h-5 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center hover:bg-destructive/20">
                    <Trash2 className="w-2.5 h-2.5 text-destructive" />
                  </button>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Grade Entries ── */}
      {selectedScale && activeScale && (
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-foreground">{activeScale.name} — Grades</h2>
              {activeScale.description && <p className="text-xs text-muted-foreground mt-0.5">{activeScale.description}</p>}
            </div>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={() => {
              setEditingGrade(null); setGradeName(""); setGradeLabel(""); setGradeMin(""); setGradeMax(""); setGradePoints("");
              setShowGradeDialog(true);
            }}>
              <Plus className="w-3.5 h-3.5" /> Add Grade
            </Button>
          </div>

          {scaleEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No grades defined. Add grades like A, B, C, D, E.</p>
          ) : (
            <div className="space-y-2">
              {scaleEntries.map(entry => {
                const subs = subEntries.filter(s => s.grade_entry_id === entry.id).sort((a, b) => a.order_index - b.order_index);
                const isExpanded = expandedGrade === entry.id;
                return (
                  <div key={entry.id} className="border border-border rounded-lg overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-3 bg-muted/20 hover:bg-muted/40 transition-colors">
                      <button onClick={() => setExpandedGrade(isExpanded ? "" : entry.id)} className="flex items-center gap-1">
                        {subs.length > 0 ? (
                          isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        ) : <div className="w-4" />}
                      </button>
                      <span className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-black text-lg">{entry.grade}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground text-sm">{entry.grade}</span>
                          {entry.label && <span className="text-xs text-muted-foreground">— {entry.label}</span>}
                        </div>
                        <p className="text-xs text-muted-foreground">{entry.min_score}% – {entry.max_score}% · {entry.points} pts</p>
                      </div>
                      {subs.length > 0 && (
                        <Badge variant="secondary" className="text-[10px]">{subs.length} sub-grade{subs.length !== 1 ? "s" : ""}</Badge>
                      )}
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => {
                          setSubParentId(entry.id); setEditingSub(null); setSubGrade(""); setSubMin(""); setSubMax(""); setSubPoints("");
                          setShowSubDialog(true);
                        }}>
                          <Plus className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => {
                          setEditingGrade(entry); setGradeName(entry.grade); setGradeLabel(entry.label);
                          setGradeMin(String(entry.min_score)); setGradeMax(String(entry.max_score)); setGradePoints(String(entry.points));
                          setShowGradeDialog(true);
                        }}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => handleDeleteGrade(entry.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    {isExpanded && subs.length > 0 && (
                      <div className="border-t border-border divide-y divide-border">
                        {subs.map(sub => (
                          <div key={sub.id} className="flex items-center gap-3 px-4 py-2.5 pl-16 bg-background hover:bg-muted/20">
                            <span className="w-8 h-8 rounded-md bg-accent/30 flex items-center justify-center text-accent-foreground font-bold text-xs">{sub.sub_grade}</span>
                            <div className="flex-1">
                              <span className="text-xs font-semibold text-foreground">{sub.sub_grade}</span>
                              <p className="text-[10px] text-muted-foreground">{sub.min_score}% – {sub.max_score}% · {sub.points} pts</p>
                            </div>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => {
                                setSubParentId(sub.grade_entry_id); setEditingSub(sub); setSubGrade(sub.sub_grade);
                                setSubMin(String(sub.min_score)); setSubMax(String(sub.max_score)); setSubPoints(String(sub.points));
                                setShowSubDialog(true);
                              }}>
                                <Edit2 className="w-3 h-3" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive hover:text-destructive" onClick={() => handleDeleteSub(sub.id)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Scale Dialog ── */}
      <Dialog open={showScaleDialog} onOpenChange={setShowScaleDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingScale ? "Edit Grading Scale" : "New Grading Scale"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-semibold">Scale Name *</Label>
              <Input value={scaleName} onChange={e => setScaleName(e.target.value)} placeholder="e.g., KJSEA 2025" />
            </div>
            <div>
              <Label className="text-xs font-semibold">Description</Label>
              <Input value={scaleDesc} onChange={e => setScaleDesc(e.target.value)} placeholder="e.g., Kenya Junior Secondary Education Assessment grading" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={scaleIsDefault} onCheckedChange={setScaleIsDefault} />
              <Label className="text-xs">Set as default grading scale</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScaleDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveScale} disabled={saving || !scaleName.trim()}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
              {editingScale ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Grade Dialog ── */}
      <Dialog open={showGradeDialog} onOpenChange={setShowGradeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingGrade ? "Edit Grade" : "Add Grade"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Grade *</Label>
                <Input value={gradeName} onChange={e => setGradeName(e.target.value)} placeholder="e.g., A" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Label</Label>
                <Input value={gradeLabel} onChange={e => setGradeLabel(e.target.value)} placeholder="e.g., Excellent" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold">Min Score %</Label>
                <Input type="number" value={gradeMin} onChange={e => setGradeMin(e.target.value)} placeholder="80" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Max Score %</Label>
                <Input type="number" value={gradeMax} onChange={e => setGradeMax(e.target.value)} placeholder="100" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Points</Label>
                <Input type="number" value={gradePoints} onChange={e => setGradePoints(e.target.value)} placeholder="12" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGradeDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveGrade} disabled={saving || !gradeName.trim() || !gradeMin || !gradeMax}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
              {editingGrade ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Sub-grade Dialog ── */}
      <Dialog open={showSubDialog} onOpenChange={setShowSubDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSub ? "Edit Sub-grade" : "Add Sub-grade"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-semibold">Sub-grade *</Label>
              <Input value={subGrade} onChange={e => setSubGrade(e.target.value)} placeholder="e.g., A-" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold">Min Score %</Label>
                <Input type="number" value={subMin} onChange={e => setSubMin(e.target.value)} placeholder="80" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Max Score %</Label>
                <Input type="number" value={subMax} onChange={e => setSubMax(e.target.value)} placeholder="84" />
              </div>
              <div>
                <Label className="text-xs font-semibold">Points</Label>
                <Input type="number" value={subPoints} onChange={e => setSubPoints(e.target.value)} placeholder="11" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveSub} disabled={saving || !subGrade.trim() || !subMin || !subMax}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
              {editingSub ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
