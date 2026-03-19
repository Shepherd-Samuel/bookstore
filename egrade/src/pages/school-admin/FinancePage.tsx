import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { sanitizeInput } from "@/lib/sanitize";
import EGradeLoader from "@/components/ui/EGradeLoader";
import {
  DollarSign, Plus, Search, RefreshCw, Loader2, Pencil, Trash2,
  Receipt, Download, Users, TrendingUp, CreditCard, FileText, Printer,
} from "lucide-react";
import { printFeeReminders } from "@/lib/feeReminderPrint";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type FeeCategory = {
  id: string; name: string; amount: number; school_id: string; level: string;
};

type FeePayment = {
  id: string; student_id: string; amount_paid: number; receipt_no: string;
  payment_method: string; payment_reference: string | null; payment_date: string;
  fee_category_id: string | null; school_id: string;
  student?: { first_name: string; last_name: string; adm_no: string | null };
  fee_category?: { name: string } | null;
};

type StudentBalance = {
  id: string; first_name: string; last_name: string; adm_no: string | null;
  total_fees: number; total_paid: number; balance: number;
};

const PAYMENT_METHODS = ["M-Pesa", "Bank Transfer", "Cash", "Cheque"];

export default function FinancePage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("payments");
  const [loading, setLoading] = useState(true);

  // Fee categories
  const [categories, setCategories] = useState<FeeCategory[]>([]);
  const [showCatModal, setShowCatModal] = useState(false);
  const [editingCat, setEditingCat] = useState<FeeCategory | null>(null);
  const [catForm, setCatForm] = useState({ name: "", amount: 0, level: "all" });
  const [savingCat, setSavingCat] = useState(false);

  // Payments
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payForm, setPayForm] = useState({ student_id: "", fee_category_id: "", amount_paid: 0, payment_method: "M-Pesa", payment_reference: "" });
  const [savingPay, setSavingPay] = useState(false);
  const [searchPay, setSearchPay] = useState("");

  // Students for dropdown
  const [students, setStudents] = useState<Array<{ id: string; first_name: string; last_name: string; adm_no: string | null; stream_id: string | null; class_id: string | null }>>([]);
  const [allStreams, setAllStreams] = useState<any[]>([]);
  const [allClasses, setAllClasses] = useState<any[]>([]);
  const [allParentLinks, setAllParentLinks] = useState<any[]>([]);
  const [reminderClassFilter, setReminderClassFilter] = useState<string>("all");
  const [reminderStreamFilter, setReminderStreamFilter] = useState<string>("all");
  const [school, setSchool] = useState<any>(null);

  // Balances
  const [balances, setBalances] = useState<StudentBalance[]>([]);
  const [searchBal, setSearchBal] = useState("");

  const schoolId = profile?.school_id;

  const fetchAll = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    const [catRes, payRes, studRes, classesRes, streamsRes, schoolRes, parentLinksRes] = await Promise.all([
      supabase.from("fee_categories").select("*").eq("school_id", schoolId).order("name"),
      supabase.from("fee_payments").select("*, student:profiles!fee_payments_student_id_fkey(first_name, last_name, adm_no), fee_category:fee_categories!fee_payments_fee_category_id_fkey(name)").eq("school_id", schoolId).order("payment_date", { ascending: false }).limit(200),
      supabase.from("profiles").select("id, first_name, last_name, adm_no, class_id, stream_id").eq("school_id", schoolId).eq("role", "student").eq("is_active", true).order("first_name"),
      supabase.from("classes").select("id, name, level"),
      supabase.from("streams").select("id, name, class_id").eq("school_id", schoolId).eq("is_active", true),
      supabase.from("schools").select("school_name, logo_url, address, phone, email, moto").eq("id", schoolId).single(),
      supabase.from("student_parents").select("student_profile_id, parent_id, parents!student_parents_parent_id_fkey(first_name, last_name, phone, school_id)"),
    ]);
    if (catRes.data) setCategories(catRes.data);
    if (payRes.data) setPayments(payRes.data as any);
    if (studRes.data) setStudents(studRes.data as any);
    if (streamsRes.data) setAllStreams(streamsRes.data);
    if (classesRes.data) setAllClasses(classesRes.data as any);
    if (schoolRes.data) setSchool(schoolRes.data);
    const filteredLinks = (parentLinksRes.data || []).filter((l: any) => l.parents?.school_id === schoolId).map((l: any) => ({ student_profile_id: l.student_profile_id, parent: l.parents }));
    setAllParentLinks(filteredLinks);

    // Calculate balances per student based on their class level
    if (catRes.data && payRes.data && studRes.data) {
      const cats = catRes.data as FeeCategory[];
      const classLevelMap: Record<string, string> = {};
      (classesRes.data || []).forEach((c: any) => { classLevelMap[c.id] = c.level; });

      const paymentsByStudent: Record<string, number> = {};
      (payRes.data as any[]).forEach(p => {
        paymentsByStudent[p.student_id] = (paymentsByStudent[p.student_id] || 0) + p.amount_paid;
      });

      setBalances(studRes.data.map((s: any) => {
        const studentLevel = s.class_id ? classLevelMap[s.class_id] || "primary" : "primary";
        const studentTotalFees = cats
          .filter(c => c.level === "all" || c.level === studentLevel)
          .reduce((sum, c) => sum + c.amount, 0);
        const paid = paymentsByStudent[s.id] || 0;
        return {
          ...s,
          total_fees: studentTotalFees,
          total_paid: paid,
          balance: studentTotalFees - paid,
        };
      }));
    }
    setLoading(false);
  }, [schoolId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Fee Category CRUD ──
  const openCatCreate = () => { setEditingCat(null); setCatForm({ name: "", amount: 0, level: "all" }); setShowCatModal(true); };
  const openCatEdit = (c: FeeCategory) => { setEditingCat(c); setCatForm({ name: c.name, amount: c.amount, level: c.level || "all" }); setShowCatModal(true); };

  const saveCat = async () => {
    if (!catForm.name || !schoolId) return;
    setSavingCat(true);
    const payload = { name: sanitizeInput(catForm.name, 100), amount: Number(catForm.amount), school_id: schoolId, level: catForm.level };
    const { error } = editingCat
      ? await supabase.from("fee_categories").update(payload).eq("id", editingCat.id)
      : await supabase.from("fee_categories").insert(payload);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { toast({ title: editingCat ? "Category Updated" : "Category Created" }); setShowCatModal(false); fetchAll(); }
    setSavingCat(false);
  };

  const deleteCat = async (c: FeeCategory) => {
    if (!confirm(`Delete "${c.name}"?`)) return;
    const { error } = await supabase.from("fee_categories").delete().eq("id", c.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Deleted" }); setCategories(prev => prev.filter(x => x.id !== c.id)); }
  };

  // ── Payment Recording ──
  const generateReceiptNo = () => `RCP-${Date.now().toString(36).toUpperCase()}`;

  const savePayment = async () => {
    if (!payForm.student_id || !payForm.amount_paid || !schoolId) {
      toast({ title: "Missing fields", description: "Student and amount are required.", variant: "destructive" });
      return;
    }
    setSavingPay(true);
    const { error } = await supabase.from("fee_payments").insert({
      student_id: payForm.student_id,
      fee_category_id: payForm.fee_category_id || null,
      amount_paid: Number(payForm.amount_paid),
      payment_method: payForm.payment_method,
      payment_reference: payForm.payment_reference ? sanitizeInput(payForm.payment_reference, 200) : null,
      receipt_no: generateReceiptNo(),
      school_id: schoolId,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { toast({ title: "Payment Recorded!" }); setShowPayModal(false); setPayForm({ student_id: "", fee_category_id: "", amount_paid: 0, payment_method: "M-Pesa", payment_reference: "" }); fetchAll(); }
    setSavingPay(false);
  };

  // ── PDF Receipt ──
  const downloadReceipt = (payment: FeePayment) => {
    const student = payment.student;
    const s = school;
    // Find student's class & stream
    const studentRec = students.find(st => st.id === payment.student_id);
    const studentStream = allStreams.find(st => st.id === studentRec?.stream_id);
    const studentClass = allClasses.find(c => c.id === (studentStream?.class_id || studentRec?.class_id));
    const studentBalance = balances.find(b => b.id === payment.student_id);

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt ${payment.receipt_no}</title>
<style>
  @page { size: A4 portrait; margin: 15mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; font-size: 12px; max-width: 700px; margin: 0 auto; padding: 30px; }
  .border-wrap { border: 2px solid #004000; border-radius: 8px; padding: 30px; position: relative; }
  .border-wrap::before { content: ''; position: absolute; inset: 4px; border: 1px solid #004000; border-radius: 6px; pointer-events: none; }
  .header { text-align: center; border-bottom: 2px solid #004000; padding-bottom: 14px; margin-bottom: 16px; }
  .logo { width: 60px; height: 60px; object-fit: contain; margin-bottom: 6px; }
  .school-name { font-size: 20px; font-weight: 900; color: #004000; text-transform: uppercase; letter-spacing: 1.5px; }
  .motto { font-size: 10px; color: #666; font-style: italic; margin: 2px 0; }
  .school-contacts { font-size: 9px; color: #888; }
  .receipt-title { text-align: center; margin: 14px 0; }
  .receipt-title h2 { font-size: 16px; color: #004000; text-transform: uppercase; letter-spacing: 2px; border-top: 1px solid #004000; border-bottom: 1px solid #004000; display: inline-block; padding: 5px 20px; }
  .receipt-no-block { background: #f0f7f0; padding: 8px 16px; border-radius: 6px; text-align: center; margin: 10px 0; }
  .receipt-no-block .no { font-size: 16px; font-weight: 900; color: #004000; letter-spacing: 1px; }
  .receipt-no-block .date { font-size: 10px; color: #666; }
  .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 16px 0; }
  .detail-item { padding: 7px 10px; border-bottom: 1px dotted #d1d5db; }
  .detail-label { font-size: 9px; text-transform: uppercase; color: #888; letter-spacing: 0.5px; }
  .detail-value { font-size: 12px; font-weight: 700; color: #1a1a1a; }
  .amount-block { text-align: center; margin: 18px 0; padding: 14px; background: linear-gradient(135deg, #004000 0%, #006600 100%); border-radius: 8px; }
  .amount-block .label { font-size: 10px; color: #a7f3d0; text-transform: uppercase; letter-spacing: 1px; }
  .amount-block .value { font-size: 28px; font-weight: 900; color: #fff; }
  .balance-row { display: flex; justify-content: space-between; padding: 8px 14px; border-radius: 6px; margin: 10px 0; font-size: 11px; }
  .balance-cleared { background: #f0fdf4; border: 1px solid #86efac; color: #16a34a; }
  .balance-owing { background: #fef2f2; border: 1px solid #fca5a5; color: #dc2626; }
  .paid-stamp { text-align: center; margin: 12px 0; }
  .paid-stamp span { display: inline-block; color: #16a34a; font-size: 14px; font-weight: 900; padding: 6px 20px; border: 2px dashed #16a34a; border-radius: 6px; letter-spacing: 2px; }
  .signatures { display: flex; justify-content: space-between; margin-top: 30px; }
  .sig-block { text-align: center; width: 30%; }
  .sig-line { border-top: 1px solid #333; margin-top: 40px; padding-top: 4px; font-size: 10px; font-weight: 700; }
  .sig-role { font-size: 8px; color: #888; }
  .footer { text-align: center; margin-top: 16px; font-size: 8px; color: #aaa; border-top: 1px solid #eee; padding-top: 8px; }
  @media print { body { padding: 0; } .border-wrap { border: none; } .border-wrap::before { display: none; } }
</style></head><body>
<div class="border-wrap">
  <div class="header">
    ${s?.logo_url ? `<img src="${s.logo_url}" class="logo" alt="School Logo" />` : ''}
    <div class="school-name">${s?.school_name || 'School'}</div>
    ${s?.moto ? `<div class="motto">"${s.moto}"</div>` : ''}
    <div class="school-contacts">${[s?.address, s?.phone, s?.email].filter(Boolean).join(' · ')}</div>
  </div>

  <div class="receipt-title"><h2>Official Fee Payment Receipt</h2></div>

  <div class="receipt-no-block">
    <div class="no">${payment.receipt_no}</div>
    <div class="date">Issued: ${new Date(payment.payment_date).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}</div>
  </div>

  <div class="details-grid">
    <div class="detail-item"><div class="detail-label">Student Name</div><div class="detail-value">${student?.first_name || ""} ${student?.last_name || ""}</div></div>
    <div class="detail-item"><div class="detail-label">Admission No.</div><div class="detail-value">${student?.adm_no || "N/A"}</div></div>
    <div class="detail-item"><div class="detail-label">Class / Stream</div><div class="detail-value">${studentClass?.name || "—"} ${studentStream?.name || ""}</div></div>
    <div class="detail-item"><div class="detail-label">Fee Category</div><div class="detail-value">${payment.fee_category?.name || "General"}</div></div>
    <div class="detail-item"><div class="detail-label">Payment Method</div><div class="detail-value">${payment.payment_method || "N/A"}</div></div>
    <div class="detail-item"><div class="detail-label">Transaction Ref</div><div class="detail-value" style="font-family:monospace;">${payment.payment_reference || "N/A"}</div></div>
  </div>

  <div class="amount-block">
    <div class="label">Amount Paid</div>
    <div class="value">KES ${Number(payment.amount_paid).toLocaleString()}</div>
  </div>

  ${studentBalance ? `
  <div class="balance-row ${studentBalance.balance <= 0 ? 'balance-cleared' : 'balance-owing'}">
    <span><strong>Total Fees:</strong> KES ${studentBalance.total_fees.toLocaleString()}</span>
    <span><strong>Paid:</strong> KES ${studentBalance.total_paid.toLocaleString()}</span>
    <span><strong>Balance:</strong> KES ${studentBalance.balance.toLocaleString()}</span>
  </div>` : ''}

  <div class="paid-stamp"><span>✓ PAYMENT RECEIVED</span></div>

  <div class="signatures">
    <div class="sig-block"><div class="sig-line">Received By</div><div class="sig-role">Bursar / Admin</div></div>
    <div class="sig-block"><div class="sig-line">School Stamp</div><div class="sig-role">Official</div></div>
    <div class="sig-block"><div class="sig-line">Parent / Guardian</div><div class="sig-role">Acknowledgement</div></div>
  </div>

  <div class="footer">
    This is an official computer-generated receipt from ${s?.school_name || 'the school'}. Valid for record-keeping purposes.<br/>
    Generated on ${new Date().toLocaleString("en-KE")} · eGrade M|S · Kenya CBC School Management Platform
  </div>
</div>
</body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank");
    if (w) w.onload = () => { w.print(); URL.revokeObjectURL(url); };
  };

  // Stats — use level-aware balances for accurate billing
  const totalCollected = payments.reduce((s, p) => s + p.amount_paid, 0);
  const totalExpected = balances.reduce((s, b) => s + b.total_fees, 0);
  const totalBalance = balances.reduce((s, b) => s + b.balance, 0);

  // Get filtered categories based on selected student's level for payment modal
  const selectedPayStudent = students.find(s => s.id === payForm.student_id);
  const selectedStudentLevel = (() => {
    if (!selectedPayStudent?.class_id) return null;
    const cls = allClasses.find((c: any) => c.id === selectedPayStudent.class_id);
    return cls?.level || null;
  })();
  const filteredPayCategories = selectedStudentLevel
    ? categories.filter(c => c.level === "all" || c.level === selectedStudentLevel)
    : categories;

  const filteredPayments = payments.filter(p => {
    const s = p.student;
    const q = searchPay.toLowerCase();
    return !q || (s && (`${s.first_name} ${s.last_name}`.toLowerCase().includes(q) || s.adm_no?.toLowerCase().includes(q))) || p.receipt_no.toLowerCase().includes(q) || (p.payment_reference || "").toLowerCase().includes(q);
  });

  const filteredBalances = balances.filter(b => {
    const q = searchBal.toLowerCase();
    return !q || `${b.first_name} ${b.last_name}`.toLowerCase().includes(q) || (b.adm_no || "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">Fee Management</h1>
          <p className="text-muted-foreground text-sm mt-0.5">M-Pesa integration, fee tracking & receipts</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchAll} className="gap-2"><RefreshCw className="w-4 h-4" /> Refresh</Button>
          <Button onClick={() => setShowPayModal(true)} className="gap-2 font-bold"><Plus className="w-4 h-4" /> Record Payment</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Collected", value: `KES ${totalCollected.toLocaleString()}`, icon: TrendingUp, color: "#16a34a" },
          { label: "Total Expected", value: `KES ${totalExpected.toLocaleString()}`, icon: CreditCard, color: "#2563eb" },
          { label: "Outstanding Balance", value: `KES ${totalBalance.toLocaleString()}`, icon: DollarSign, color: "#ff6600" },
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="payments" className="gap-1.5"><Receipt className="w-3.5 h-3.5" /> Payments</TabsTrigger>
          <TabsTrigger value="balances" className="gap-1.5"><Users className="w-3.5 h-3.5" /> Student Balances</TabsTrigger>
          <TabsTrigger value="categories" className="gap-1.5"><FileText className="w-3.5 h-3.5" /> Fee Categories</TabsTrigger>
        </TabsList>

        {/* ── Payments Tab ── */}
        <TabsContent value="payments" className="mt-4 space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={searchPay} onChange={e => setSearchPay(e.target.value)} placeholder="Search by name, adm no, receipt..." className="pl-9" />
          </div>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : filteredPayments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                <Receipt className="w-10 h-10" /><p className="font-semibold">No payments recorded yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[700px]">
                  <thead><tr className="border-b border-border">
                    {["Student", "Category", "Amount", "Method", "Reference", "Date", "Receipt"].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody className="divide-y divide-border">
                    {filteredPayments.map(p => (
                      <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-foreground">{p.student?.first_name} {p.student?.last_name}</p>
                          <p className="text-[10px] text-muted-foreground">{p.student?.adm_no || "N/A"}</p>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{p.fee_category?.name || "General"}</td>
                        <td className="px-4 py-3 font-bold text-foreground">KES {Number(p.amount_paid).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            p.payment_method === "M-Pesa" ? "bg-green-100 text-green-700" :
                            p.payment_method === "Bank Transfer" ? "bg-blue-100 text-blue-700" :
                            p.payment_method === "Cheque" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"
                          }`}>{p.payment_method}</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.payment_reference || "—"}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(p.payment_date).toLocaleDateString("en-KE")}</td>
                        <td className="px-4 py-3">
                          <Button size="sm" variant="ghost" onClick={() => downloadReceipt(p)} className="gap-1 text-xs h-7">
                            <Download className="w-3 h-3" /> PDF
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

        {/* ── Balances Tab ── */}
        <TabsContent value="balances" className="mt-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={searchBal} onChange={e => setSearchBal(e.target.value)} placeholder="Search students..." className="pl-9" />
            </div>
            <Select value={reminderClassFilter} onValueChange={v => { setReminderClassFilter(v); setReminderStreamFilter("all"); }}>
              <SelectTrigger className="w-[160px] h-9 text-xs"><SelectValue placeholder="Filter class" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {allClasses.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {reminderClassFilter !== "all" && (
              <Select value={reminderStreamFilter} onValueChange={setReminderStreamFilter}>
                <SelectTrigger className="w-[160px] h-9 text-xs"><SelectValue placeholder="Filter stream" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Streams</SelectItem>
                  {allStreams.filter(s => s.class_id === reminderClassFilter).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Button size="sm" variant="outline" className="gap-1.5 text-xs font-bold ml-auto" onClick={() => {
              // Filter balances with owing students based on class/stream
              const owing = filteredBalances.filter(b => {
                if (b.balance <= 0) return false;
                const student = students.find(s => s.id === b.id);
                if (!student) return false;
                if (reminderClassFilter !== "all") {
                  const stream = allStreams.find(st => st.id === student.stream_id);
                  if (!stream || stream.class_id !== reminderClassFilter) return false;
                  if (reminderStreamFilter !== "all" && student.stream_id !== reminderStreamFilter) return false;
                }
                return true;
              });
              if (owing.length === 0) { toast({ title: "No owing students", description: "No students with outstanding balances in this filter.", variant: "destructive" }); return; }
              const reminderData = owing.map(b => {
                const student = students.find(s => s.id === b.id);
                const stream = allStreams.find(st => st.id === student?.stream_id);
                const cls = allClasses.find(c => c.id === stream?.class_id);
                const link = allParentLinks.find((l: any) => l.student_profile_id === b.id);
                const parent = link?.parent;
                return {
                  studentName: `${b.first_name} ${b.last_name}`,
                  admNo: b.adm_no,
                  className: cls?.name || "—",
                  streamName: stream?.name || "—",
                  totalFees: b.total_fees,
                  totalPaid: b.total_paid,
                  balance: b.balance,
                  parentName: parent ? `${parent.first_name} ${parent.last_name}` : null,
                  parentPhone: parent?.phone || null,
                };
              });
              printFeeReminders(reminderData, school);
            }}>
              <Printer className="w-3.5 h-3.5" /> Print Fee Reminders
            </Button>
          </div>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead><tr className="border-b border-border">
                    {["Student", "Adm No.", "Total Fees", "Paid", "Balance", "Status"].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody className="divide-y divide-border">
                    {filteredBalances.map(b => (
                      <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-semibold text-foreground">{b.first_name} {b.last_name}</td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{b.adm_no || "N/A"}</td>
                        <td className="px-4 py-3 text-muted-foreground">KES {b.total_fees.toLocaleString()}</td>
                        <td className="px-4 py-3 font-semibold text-foreground">KES {b.total_paid.toLocaleString()}</td>
                        <td className="px-4 py-3 font-bold" style={{ color: b.balance <= 0 ? "#16a34a" : "#dc2626" }}>
                          KES {b.balance.toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${b.balance <= 0 ? "bg-green-100 text-green-700" : b.balance < b.total_fees * 0.5 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                            {b.balance <= 0 ? "Cleared" : b.balance < b.total_fees * 0.5 ? "Partial" : "Owing"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Categories Tab ── */}
        <TabsContent value="categories" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button onClick={openCatCreate} className="gap-2 font-bold"><Plus className="w-4 h-4" /> New Category</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {categories.map(c => (
              <div key={c.id} className="stat-card">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10">
                      <DollarSign className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground">{c.name}</p>
                      <p className="text-xl font-black text-foreground mt-0.5">KES {c.amount.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{c.level === "all" ? "All levels" : c.level.replace("_", " ")}</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 pt-3 border-t border-border">
                  <Button size="sm" variant="outline" onClick={() => openCatEdit(c)} className="flex-1 gap-1.5 text-xs"><Pencil className="w-3.5 h-3.5" /> Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => deleteCat(c)} className="gap-1.5 text-xs"><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            ))}
            {!loading && categories.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                <DollarSign className="w-10 h-10" /><p className="font-semibold">No fee categories yet</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Record Payment Modal ── */}
      <Dialog open={showPayModal} onOpenChange={setShowPayModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-black">Record Payment</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold">Student *</Label>
              <Select value={payForm.student_id} onValueChange={v => setPayForm(p => ({ ...p, student_id: v, fee_category_id: "" }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select student" /></SelectTrigger>
                <SelectContent>
                  {students.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name} {s.adm_no ? `(${s.adm_no})` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Fee Category</Label>
              <Select value={payForm.fee_category_id} onValueChange={v => setPayForm(p => ({ ...p, fee_category_id: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder={selectedPayStudent ? "Select category" : "Select student first"} /></SelectTrigger>
                <SelectContent>
                  {filteredPayCategories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name} — KES {c.amount.toLocaleString()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedStudentLevel && (
                <p className="text-[10px] text-muted-foreground mt-1 capitalize">Showing categories for: {selectedStudentLevel.replace("_", " ")}</p>
              )}
            </div>
            <div>
              <Label className="text-xs font-semibold">Amount Paid (KES) *</Label>
              <Input type="number" min={0} value={payForm.amount_paid} onChange={e => setPayForm(p => ({ ...p, amount_paid: Number(e.target.value) }))} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Payment Method</Label>
                <Select value={payForm.payment_method} onValueChange={v => setPayForm(p => ({ ...p, payment_method: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">M-Pesa / Ref No.</Label>
                <Input value={payForm.payment_reference} onChange={e => setPayForm(p => ({ ...p, payment_reference: e.target.value }))} placeholder="e.g. QGH12345" className="mt-1" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayModal(false)}>Cancel</Button>
            <Button onClick={savePayment} disabled={savingPay} className="font-bold gap-2">
              {savingPay ? <Loader2 className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4" />}
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Category Modal ── */}
      <Dialog open={showCatModal} onOpenChange={setShowCatModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="font-black">{editingCat ? "Edit Category" : "New Fee Category"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold">Category Name *</Label>
              <Input value={catForm.name} onChange={e => setCatForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Tuition Fee" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-semibold">Amount (KES) *</Label>
              <Input type="number" min={0} value={catForm.amount} onChange={e => setCatForm(p => ({ ...p, amount: Number(e.target.value) }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-semibold">Level / Department</Label>
              <Select value={catForm.level} onValueChange={v => setCatForm(p => ({ ...p, level: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="primary">Primary</SelectItem>
                  <SelectItem value="junior_secondary">Junior Secondary</SelectItem>
                  <SelectItem value="senior_secondary">Senior Secondary</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCatModal(false)}>Cancel</Button>
            <Button onClick={saveCat} disabled={savingCat} className="font-bold gap-2">
              {savingCat ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {editingCat ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
