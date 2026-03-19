import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTeacherScope } from "@/hooks/useTeacherScope";
import { useToast } from "@/hooks/use-toast";
import CameraCapture from "@/components/CameraCapture";
import EGradeLoader from "@/components/ui/EGradeLoader";
import {
  Users, Printer, Camera, Upload, Search, User, Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type Student = {
  id: string; first_name: string; last_name: string; adm_no: string | null;
  gender: string | null; dob: string | null; phone: string | null;
  passport_url: string | null; stream_id: string | null;
};

type StreamInfo = { id: string; name: string; class_id: string; class_name?: string };

export default function MyClassPage() {
  const { profile, effectiveRole } = useAuth();
  const { toast } = useToast();
  const scope = useTeacherScope(profile?.id, profile?.school_id, effectiveRole);

  const [streams, setStreams] = useState<StreamInfo[]>([]);
  const [selectedStream, setSelectedStream] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [schoolInfo, setSchoolInfo] = useState<any>(null);

  // Photo upload state
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraTarget, setCameraTarget] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scope.loading || !profile?.school_id) return;

    const load = async () => {
      setLoading(true);
      const ctStreamIds = scope.classTeacherStreamIds;
      if (ctStreamIds.length === 0) {
        setLoading(false);
        return;
      }

      const [streamsRes, schoolRes] = await Promise.all([
        supabase.from("streams").select("id, name, class_id, classes(name)").in("id", ctStreamIds),
        supabase.from("schools").select("*").eq("id", profile.school_id).single(),
      ]);

      const streamData = (streamsRes.data || []).map((s: any) => ({
        id: s.id, name: s.name, class_id: s.class_id, class_name: s.classes?.name || "",
      }));
      setStreams(streamData);
      if (schoolRes.data) setSchoolInfo(schoolRes.data);
      if (streamData.length > 0) setSelectedStream(streamData[0].id);
      setLoading(false);
    };
    load();
  }, [scope.loading, scope.classTeacherStreamIds, profile?.school_id]);

  useEffect(() => {
    if (!selectedStream || !profile?.school_id) return;
    const fetchStudents = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, adm_no, gender, dob, phone, passport_url, stream_id")
        .eq("school_id", profile.school_id)
        .eq("stream_id", selectedStream)
        .eq("role", "student")
        .eq("is_active", true)
        .order("first_name");
      setStudents(data || []);
    };
    fetchStudents();
  }, [selectedStream, profile?.school_id]);

  const currentStream = streams.find(s => s.id === selectedStream);
  const filtered = students.filter(s =>
    `${s.first_name} ${s.last_name} ${s.adm_no || ""}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleFileUpload = async (studentId: string, file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5MB", variant: "destructive" });
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", variant: "destructive" });
      return;
    }
    setUploadingFor(studentId);
    const ext = file.name.split(".").pop();
    const filePath = `${profile!.school_id}/${studentId}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("passports")
      .upload(filePath, file, { upsert: true });

    if (upErr) {
      toast({ title: "Upload failed", description: upErr.message, variant: "destructive" });
      setUploadingFor(null);
      return;
    }

    const { data: urlData } = supabase.storage.from("passports").getPublicUrl(filePath);
    const url = urlData.publicUrl + "?t=" + Date.now();

    const { error: updErr } = await supabase
      .from("profiles")
      .update({ passport_url: url })
      .eq("id", studentId);

    if (updErr) {
      toast({ title: "Error updating profile", description: updErr.message, variant: "destructive" });
    } else {
      toast({ title: "Photo updated" });
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, passport_url: url } : s));
    }
    setUploadingFor(null);
  };

  const handleCameraCapture = (file: File) => {
    if (cameraTarget) handleFileUpload(cameraTarget, file);
    setCameraTarget(null);
  };

  const printClassList = () => {
    if (!currentStream || !schoolInfo) return;
    const logo = schoolInfo.logo_url || "";
    const rows = filtered.map((s, i) => `
      <tr>
        <td style="text-align:center">${i + 1}</td>
        <td>${s.adm_no || "-"}</td>
        <td>${s.first_name} ${s.last_name}</td>
        <td style="text-align:center">${(s.gender || "-").charAt(0).toUpperCase()}</td>
        <td>${s.dob || "-"}</td>
        <td>${s.phone || "-"}</td>
        <td style="text-align:center">${s.passport_url ? "✓" : "✗"}</td>
      </tr>
    `).join("");

    const html = `<!DOCTYPE html><html><head><title>Class List</title>
    <style>
      @page{size:A4 landscape;margin:15mm}
      body{font-family:Arial,sans-serif;font-size:11px;color:#111}
      .header{text-align:center;margin-bottom:20px}
      .header img{height:60px;margin-bottom:5px}
      .header h1{font-size:16px;margin:4px 0}
      .header p{font-size:10px;color:#555;margin:2px 0}
      .meta{display:flex;justify-content:space-between;margin-bottom:10px;font-size:10px}
      table{width:100%;border-collapse:collapse}
      th,td{border:1px solid #ddd;padding:5px 8px;text-align:left}
      th{background:#f5f5f5;font-weight:bold;font-size:10px;text-transform:uppercase}
      tr:nth-child(even){background:#fafafa}
      .footer{margin-top:20px;font-size:9px;color:#888;text-align:center}
      .sign-line{margin-top:40px;display:flex;justify-content:space-between}
      .sign-line div{width:200px;border-top:1px solid #333;padding-top:4px;text-align:center;font-size:10px}
    </style></head><body>
      <div class="header">
        ${logo ? `<img src="${logo}" />` : ""}
        <h1>${schoolInfo.school_name}</h1>
        ${schoolInfo.moto ? `<p><em>${schoolInfo.moto}</em></p>` : ""}
        <p>${[schoolInfo.address, schoolInfo.phone, schoolInfo.email].filter(Boolean).join(" | ")}</p>
      </div>
      <h2 style="text-align:center;font-size:14px;margin-bottom:6px">CLASS LIST</h2>
      <div class="meta">
        <span><strong>Class:</strong> ${currentStream.class_name} — ${currentStream.name}</span>
        <span><strong>Class Teacher:</strong> ${profile!.first_name} ${profile!.last_name}</span>
        <span><strong>Total Students:</strong> ${filtered.length}</span>
        <span><strong>Date:</strong> ${new Date().toLocaleDateString()}</span>
      </div>
      <table>
        <thead><tr>
          <th style="width:30px">#</th><th>Adm No</th><th>Student Name</th><th>Gender</th><th>DOB</th><th>Phone</th><th>Photo</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="sign-line">
        <div>Class Teacher's Signature</div>
        <div>Head Teacher's Signature</div>
        <div>Date & Stamp</div>
      </div>
      <div class="footer">Generated by eGrade M|S on ${new Date().toLocaleString()}</div>
    </body></html>`;

    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); w.print(); }
  };

  if (loading || scope.loading) return <EGradeLoader />;

  if (scope.classTeacherStreamIds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-3">
        <Users className="w-12 h-12 text-muted-foreground/30" />
        <h2 className="text-lg font-bold text-foreground">No Class Assigned</h2>
        <p className="text-muted-foreground text-sm max-w-xs">
          You are not currently assigned as a class teacher for any stream. Contact your school admin.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-foreground">My Class</h1>
          <p className="text-xs text-muted-foreground">Manage your class students and their photos</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {streams.length > 1 && (
            <Select value={selectedStream} onValueChange={setSelectedStream}>
              <SelectTrigger className="w-48 text-xs h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {streams.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.class_name} — {s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button size="sm" variant="outline" onClick={printClassList} className="gap-1.5 text-xs">
            <Printer className="w-3.5 h-3.5" /> Print Class List
          </Button>
        </div>
      </div>

      {currentStream && (
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary font-semibold">
            {currentStream.class_name} — {currentStream.name}
          </span>
          <span className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground font-medium">
            {filtered.length} Students
          </span>
        </div>
      )}

      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          placeholder="Search by name or adm no..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-8 h-9 text-xs"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[700px] text-xs">
          <thead>
            <tr className="bg-muted/50">
              <th className="px-3 py-2.5 text-left font-bold text-muted-foreground">#</th>
              <th className="px-3 py-2.5 text-left font-bold text-muted-foreground">Photo</th>
              <th className="px-3 py-2.5 text-left font-bold text-muted-foreground">Adm No</th>
              <th className="px-3 py-2.5 text-left font-bold text-muted-foreground">Student Name</th>
              <th className="px-3 py-2.5 text-left font-bold text-muted-foreground">Gender</th>
              <th className="px-3 py-2.5 text-left font-bold text-muted-foreground">DOB</th>
              <th className="px-3 py-2.5 text-left font-bold text-muted-foreground">Phone</th>
              <th className="px-3 py-2.5 text-center font-bold text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, i) => (
              <tr key={s.id} className="border-t border-border hover:bg-muted/30">
                <td className="px-3 py-2">{i + 1}</td>
                <td className="px-3 py-2">
                  {s.passport_url ? (
                    <img src={s.passport_url} alt="" className="w-9 h-9 rounded-lg object-cover border border-border" />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center border border-dashed border-border">
                      <User className="w-4 h-4 text-muted-foreground/40" />
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 font-mono">{s.adm_no || "-"}</td>
                <td className="px-3 py-2 font-semibold">{s.first_name} {s.last_name}</td>
                <td className="px-3 py-2 capitalize">{s.gender || "-"}</td>
                <td className="px-3 py-2">{s.dob || "-"}</td>
                <td className="px-3 py-2">{s.phone || "-"}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-center gap-1">
                    {uploadingFor === s.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    ) : (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          title="Upload photo"
                          onClick={() => {
                            setCameraTarget(null);
                            const input = fileRef.current;
                            if (input) {
                              input.dataset.studentId = s.id;
                              input.click();
                            }
                          }}
                        >
                          <Upload className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          title="Take photo with camera"
                          onClick={() => { setCameraTarget(s.id); setCameraOpen(true); }}
                        >
                          <Camera className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">No students found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          const studentId = (e.target as HTMLInputElement).dataset.studentId;
          if (file && studentId) handleFileUpload(studentId, file);
          e.target.value = "";
        }}
      />
      <CameraCapture
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={handleCameraCapture}
      />
    </div>
  );
}
