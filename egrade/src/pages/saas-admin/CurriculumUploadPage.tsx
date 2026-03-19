import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Upload, FileText, Clipboard, CheckCircle2, Zap, FileUp, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";

type CurriculumEntry = {
  subject_name: string; level: string; strand: string; sub_strand: string;
  specific_learning_outcomes: string; key_inquiry_questions: string;
  learning_experiences: string; resources: string; assessment_methods: string;
  term: string; week_number: number; lesson_number: number;
};

type ParseResult = { entries: CurriculumEntry[]; summary: string };
type ClassRow = { id: string; name: string; level: string };
type SubjectRow = { id: string; name: string; code: string | null; level: string | null };

export default function CurriculumUploadPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [inputMode, setInputMode] = useState<"paste" | "pdf">("paste");
  const [pasteContent, setPasteContent] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfExtracting, setPdfExtracting] = useState(false);

  // DB-driven selectors
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [term, setTerm] = useState("Full Year");

  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);

  // Load classes and subjects from DB
  useEffect(() => {
    const load = async () => {
      setDataLoading(true);
      const [classesRes, subjectsRes] = await Promise.all([
        supabase.from("classes").select("id, name, level").eq("is_active", true).order("name"),
        supabase.from("subjects").select("id, name, code, level").eq("is_active", true).eq("is_national", true).order("name"),
      ]);
      if (classesRes.data) setClasses(classesRes.data as ClassRow[]);
      if (subjectsRes.data) setSubjects(subjectsRes.data as SubjectRow[]);
      setDataLoading(false);
    };
    load();
  }, []);

  const selectedClass = classes.find(c => c.id === selectedClassId);
  const selectedSubject = subjects.find(s => s.id === selectedSubjectId);

  // Show all national subjects — they are curriculum-wide and applicable across levels
  const filteredSubjects = subjects;

  const extractTextFromPdf = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        resolve(base64);
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  };

  const handleAnalyze = async () => {
    let content = pasteContent.trim();

    if (inputMode === "pdf") {
      if (!pdfFile) {
        toast({ title: "No file", description: "Please upload a PDF file.", variant: "destructive" });
        return;
      }
      setPdfExtracting(true);
      try {
        const base64 = await extractTextFromPdf(pdfFile);
        content = `[PDF_BASE64]${base64}`;
      } catch (e: any) {
        toast({ title: "PDF Error", description: e.message, variant: "destructive" });
        setPdfExtracting(false);
        return;
      }
      setPdfExtracting(false);
    }

    if (!content) {
      toast({ title: "No content", description: "Please paste curriculum content or upload a PDF.", variant: "destructive" });
      return;
    }
    if (!selectedClassId || !selectedSubjectId) {
      toast({ title: "Select class and subject", description: "Please select both a class and subject before analyzing.", variant: "destructive" });
      return;
    }

    const subjectName = selectedSubject?.name || "";
    const level = selectedClass?.level || "junior_secondary";
    const grade = selectedClass?.name || "";

    setLoading(true);
    setResult(null);
    setImported(false);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-curriculum", {
        body: { content, subject_name: subjectName, level, grade, term },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data as ParseResult);
      toast({ title: "Analysis Complete", description: `Found ${data.entries?.length || 0} curriculum entries.` });
    } catch (e: any) {
      toast({ title: "Analysis Failed", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const handleImport = async () => {
    if (!result?.entries?.length || !selectedClass || !selectedSubject) return;
    setImporting(true);
    const entries = result.entries.map(e => ({
      subject_name: selectedSubject.name,
      subject_id: selectedSubject.id,
      level: selectedClass.level,
      grade: selectedClass.name,
      strand: e.strand,
      sub_strand: e.sub_strand,
      specific_learning_outcomes: e.specific_learning_outcomes,
      key_inquiry_questions: e.key_inquiry_questions,
      learning_experiences: e.learning_experiences,
      resources: e.resources,
      assessment_methods: e.assessment_methods,
      term: term === "Full Year" ? (e.term || "Term 1") : term,
      week_number: e.week_number || 1,
      lesson_number: e.lesson_number || 1,
      created_by: profile?.id,
      is_approved: false,
    }));

    const { error } = await supabase.from("curriculum_designs").insert(entries);
    if (error) {
      toast({ title: "Import Failed", description: error.message, variant: "destructive" });
    } else {
      setImported(true);
      toast({ title: "Imported!", description: `${entries.length} entries added for ${selectedSubject.name} — ${selectedClass.name}.` });
    }
    setImporting(false);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type === "application/pdf") {
      setPdfFile(file);
      setInputMode("pdf");
    } else {
      toast({ title: "Invalid file", description: "Only PDF files are supported.", variant: "destructive" });
    }
  };

  if (dataLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black text-foreground">AI Curriculum Upload</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Upload KICD curriculum designs per class and subject — AI extracts the entire content into structured entries
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="stat-card space-y-4">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <Zap className="w-4 h-4 text-accent" /> Input Curriculum Content
          </h3>

          <div className="rounded-xl border border-dashed border-primary/30 p-3 bg-primary/5 text-xs text-muted-foreground">
            <strong className="text-foreground">Important:</strong> Each class (e.g. Grade 7) has its own unique curriculum design per subject.
            Select the specific class and subject, then upload the full KICD PDF — the AI will extract everything.
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">Class *</Label>
              <Select value={selectedClassId} onValueChange={v => { setSelectedClassId(v); setSelectedSubjectId(""); }}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {classes.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} <span className="text-muted-foreground ml-1">({c.level.replace("_", " ")})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Subject *</Label>
              <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId} disabled={!selectedClassId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder={selectedClassId ? "Select subject" : "Select class first"} /></SelectTrigger>
                <SelectContent>
                  {filteredSubjects.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} {s.code ? `(${s.code})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold">Scope</Label>
            <Select value={term} onValueChange={setTerm}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Full Year">Full Year (All Terms)</SelectItem>
                <SelectItem value="Term 1">Term 1 Only</SelectItem>
                <SelectItem value="Term 2">Term 2 Only</SelectItem>
                <SelectItem value="Term 3">Term 3 Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Input Mode Tabs */}
          <Tabs value={inputMode} onValueChange={v => setInputMode(v as "paste" | "pdf")}>
            <TabsList className="w-full">
              <TabsTrigger value="paste" className="flex-1 gap-1.5">
                <Clipboard className="w-3.5 h-3.5" /> Paste Text
              </TabsTrigger>
              <TabsTrigger value="pdf" className="flex-1 gap-1.5">
                <FileUp className="w-3.5 h-3.5" /> Upload PDF
              </TabsTrigger>
            </TabsList>

            <TabsContent value="paste" className="mt-3">
              <Textarea
                value={pasteContent}
                onChange={e => setPasteContent(e.target.value)}
                placeholder={"Paste KICD curriculum design content here...\n\nExample:\nStrand: Numbers\nSub-strand: Whole Numbers\nSpecific Learning Outcomes: By the end of the sub-strand, the learner should be able to...\nKey Inquiry Questions: Why do we use numbers?"}
                rows={12}
                className="font-mono text-xs"
              />
            </TabsContent>

            <TabsContent value="pdf" className="mt-3">
              <div
                className="rounded-xl border-2 border-dashed border-primary/30 p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={handleFileDrop}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) setPdfFile(file);
                  }}
                />
                {pdfFile ? (
                  <div className="space-y-2">
                    <FileText className="w-10 h-10 text-primary mx-auto" />
                    <p className="text-sm font-bold text-foreground">{pdfFile.name}</p>
                    <p className="text-xs text-muted-foreground">{(pdfFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={e => { e.stopPropagation(); setPdfFile(null); }}
                      className="gap-1.5"
                    >
                      <X className="w-3 h-3" /> Remove
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-10 h-10 text-muted-foreground mx-auto" />
                    <p className="text-sm font-semibold text-foreground">Drop PDF here or click to upload</p>
                    <p className="text-xs text-muted-foreground">Max 20MB · KICD curriculum design PDFs — entire document will be extracted</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <Button onClick={handleAnalyze} disabled={loading || pdfExtracting || !selectedClassId || !selectedSubjectId} className="w-full font-bold gap-2">
            {loading || pdfExtracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {loading ? "Analyzing with AI..." : pdfExtracting ? "Extracting PDF..." : "Analyze Curriculum"}
          </Button>

          {selectedClass && selectedSubject && (
            <p className="text-xs text-muted-foreground text-center">
              Uploading for: <strong>{selectedSubject.name}</strong> — <strong>{selectedClass.name}</strong> ({selectedClass.level.replace("_", " ")}) — {term}
            </p>
          )}
        </div>

        {/* Results Section */}
        <div className="stat-card space-y-4">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" /> Extracted Curriculum Entries
          </h3>

          {!result && !loading && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <Clipboard className="w-10 h-10" />
              <p className="font-semibold">No content analyzed yet</p>
              <p className="text-xs text-center max-w-xs">Select a class and subject, then upload the full KICD PDF or paste content. The AI will extract every strand, sub-strand, and learning outcome.</p>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm font-semibold text-foreground">AI is analyzing curriculum...</p>
              <p className="text-xs text-muted-foreground">Extracting strands, sub-strands, and learning outcomes from the entire document</p>
            </div>
          )}

          {result && (
            <>
              {result.summary && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-foreground">
                  {result.summary}
                </div>
              )}

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {result.entries.map((entry, i) => (
                  <div key={i} className="rounded-xl border border-border p-4 hover:border-primary/20 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-bold text-foreground text-sm">Strand: {entry.strand}</p>
                        <p className="text-xs text-muted-foreground">Sub-strand: {entry.sub_strand}</p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                        W{entry.week_number} · L{entry.lesson_number}
                      </span>
                    </div>
                    {entry.specific_learning_outcomes && (
                      <div className="mt-2">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Learning Outcomes</p>
                        <p className="text-xs text-foreground mt-0.5">{entry.specific_learning_outcomes}</p>
                      </div>
                    )}
                    {entry.key_inquiry_questions && (
                      <div className="mt-2">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Key Inquiry Questions</p>
                        <p className="text-xs text-foreground mt-0.5">{entry.key_inquiry_questions}</p>
                      </div>
                    )}
                    {entry.learning_experiences && (
                      <div className="mt-2">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Learning Experiences</p>
                        <p className="text-xs text-foreground mt-0.5">{entry.learning_experiences}</p>
                      </div>
                    )}
                    {entry.resources && (
                      <div className="mt-2">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Resources</p>
                        <p className="text-xs text-foreground mt-0.5">{entry.resources}</p>
                      </div>
                    )}
                    {entry.assessment_methods && (
                      <div className="mt-2">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Assessment Methods</p>
                        <p className="text-xs text-foreground mt-0.5">{entry.assessment_methods}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 pt-2 border-t border-border">
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-bold text-foreground">{result.entries.length} entries extracted</p>
                  <p className="text-xs text-muted-foreground">Review above, then import to database</p>
                </div>
                {imported ? (
                  <div className="flex items-center gap-2 text-sm font-bold text-green-600">
                    <CheckCircle2 className="w-4 h-4" /> Imported
                  </div>
                ) : (
                  <Button onClick={handleImport} disabled={importing} className="font-bold gap-2">
                    {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    Import to Database
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
