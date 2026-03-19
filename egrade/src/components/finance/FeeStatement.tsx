import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Download, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

type Payment = {
  id: string;
  amount_paid: number;
  receipt_no: string;
  payment_method: string | null;
  payment_reference: string | null;
  payment_date: string;
  fee_category: { name: string } | null;
};

type Props = {
  studentId: string;
  schoolId: string;
  studentName: string;
  admNo: string | null;
};

export default function FeeStatement({ studentId, schoolId, studentName, admNo }: Props) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [classLevel, setClassLevel] = useState<string>("primary");
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState<string>("all");

  useEffect(() => {
    if (!studentId || !schoolId) return;
    (async () => {
      setLoading(true);
      const [payRes, catRes, profileRes] = await Promise.all([
        supabase.from("fee_payments")
          .select("id, amount_paid, receipt_no, payment_method, payment_reference, payment_date, fee_category:fee_categories!fee_payments_fee_category_id_fkey(name)")
          .eq("school_id", schoolId).eq("student_id", studentId)
          .order("payment_date", { ascending: false }),
        supabase.from("fee_categories").select("id, name, amount, level").eq("school_id", schoolId),
        supabase.from("profiles").select("class_id").eq("id", studentId).single(),
      ]);
      if (payRes.data) setPayments(payRes.data as any);
      if (catRes.data) setCategories(catRes.data);

      if (profileRes.data?.class_id) {
        const { data: cls } = await supabase.from("classes").select("level").eq("id", profileRes.data.class_id).single();
        if (cls) setClassLevel(cls.level);
      }
      setLoading(false);
    })();
  }, [studentId, schoolId]);

  const totalFees = categories
    .filter(c => c.level === "all" || c.level === classLevel)
    .reduce((s, c) => s + c.amount, 0);

  const years = [...new Set(payments.map(p => new Date(p.payment_date).getFullYear().toString()))].sort((a, b) => b.localeCompare(a));

  const filtered = yearFilter === "all" ? payments : payments.filter(p => new Date(p.payment_date).getFullYear().toString() === yearFilter);
  const totalPaid = payments.reduce((s, p) => s + p.amount_paid, 0);
  const balance = totalFees - totalPaid;

  const printStatement = () => {
    const rows = filtered.map(p => `
      <tr>
        <td>${new Date(p.payment_date).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}</td>
        <td>${p.receipt_no}</td>
        <td>${p.fee_category?.name || "General"}</td>
        <td>${p.payment_method || "—"}</td>
        <td>${p.payment_reference || "—"}</td>
        <td style="text-align:right;font-weight:bold;">KES ${p.amount_paid.toLocaleString()}</td>
      </tr>
    `).join("");

    const catRows = categories
      .filter(c => c.level === "all" || c.level === classLevel)
      .map(c => `<tr><td>${c.name}</td><td style="text-align:right;">KES ${c.amount.toLocaleString()}</td></tr>`)
      .join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Fee Statement</title>
<style>
  @page { size: A4; margin: 15mm; }
  body { font-family: Arial, sans-serif; color: #1a1a1a; font-size: 12px; }
  .header { text-align: center; border-bottom: 2px solid #004000; padding-bottom: 12px; margin-bottom: 16px; }
  .header h1 { color: #004000; font-size: 20px; margin: 0; }
  .header p { color: #666; font-size: 10px; margin: 2px 0; }
  h2 { color: #004000; font-size: 14px; margin: 16px 0 8px; border-bottom: 1px solid #004000; padding-bottom: 4px; }
  .info { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 12px; font-size: 11px; }
  .info .label { color: #888; font-size: 9px; text-transform: uppercase; }
  .info .value { font-weight: bold; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  th { background: #004000; color: white; text-align: left; padding: 6px 8px; font-size: 10px; }
  td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
  tr:nth-child(even) { background: #fafafa; }
  .summary { background: #f0fdf4; border: 1px solid #86efac; padding: 12px; border-radius: 6px; margin-top: 12px; }
  .summary-row { display: flex; justify-content: space-between; padding: 3px 0; }
  .summary-row.total { border-top: 2px solid #004000; margin-top: 6px; padding-top: 6px; font-weight: 900; font-size: 14px; }
  .balance-positive { color: #dc2626; }
  .balance-cleared { color: #16a34a; }
  .footer { text-align: center; margin-top: 20px; font-size: 9px; color: #999; }
  @media print { body { padding: 0; } }
</style></head><body>
<div class="header">
  <h1>FEE STATEMENT</h1>
  <p>Official Student Fee Statement</p>
</div>
<div class="info">
  <div><div class="label">Student Name</div><div class="value">${studentName}</div></div>
  <div><div class="label">Admission No.</div><div class="value">${admNo || "N/A"}</div></div>
  <div><div class="label">Statement Date</div><div class="value">${new Date().toLocaleDateString("en-KE", { dateStyle: "long" })}</div></div>
  <div><div class="label">Filter</div><div class="value">${yearFilter === "all" ? "All Years" : yearFilter}</div></div>
</div>

<h2>Fee Structure</h2>
<table><thead><tr><th>Category</th><th style="text-align:right;">Amount</th></tr></thead><tbody>${catRows}</tbody></table>

<h2>Payment History (${filtered.length} transactions)</h2>
<table><thead><tr><th>Date</th><th>Receipt</th><th>Category</th><th>Method</th><th>Reference</th><th style="text-align:right;">Amount</th></tr></thead><tbody>${rows}</tbody></table>

<div class="summary">
  <div class="summary-row"><span>Total Fees Due</span><span>KES ${totalFees.toLocaleString()}</span></div>
  <div class="summary-row"><span>Total Paid</span><span>KES ${totalPaid.toLocaleString()}</span></div>
  <div class="summary-row total"><span>Balance</span><span class="${balance > 0 ? 'balance-positive' : 'balance-cleared'}">KES ${balance.toLocaleString()}</span></div>
</div>

<div class="footer"><p>Generated on ${new Date().toLocaleString("en-KE")} · eGrade M|S</p></div>
</body></html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank");
    if (w) w.onload = () => { w.print(); URL.revokeObjectURL(url); };
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-xl border border-border p-3 text-center">
          <p className="text-lg font-black text-foreground">KES {totalFees.toLocaleString()}</p>
          <p className="text-[10px] font-bold text-muted-foreground">Total Fees</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-3 text-center">
          <p className="text-lg font-black text-foreground">KES {totalPaid.toLocaleString()}</p>
          <p className="text-[10px] font-bold text-muted-foreground">Total Paid</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-3 text-center">
          <p className={`text-lg font-black ${balance > 0 ? "text-destructive" : "text-green-600"}`}>KES {balance.toLocaleString()}</p>
          <p className="text-[10px] font-bold text-muted-foreground">Balance</p>
        </div>
      </div>

      {/* Filters + print */}
      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={printStatement} className="ml-auto gap-1.5 text-xs font-bold">
          <Download className="w-3.5 h-3.5" /> Print Statement
        </Button>
      </div>

      {/* Fee categories */}
      <div className="bg-card rounded-xl border border-border p-4">
        <p className="text-xs font-bold text-muted-foreground mb-2 uppercase">Fee Structure ({classLevel.replace("_", " ")})</p>
        <div className="space-y-1">
          {categories.filter(c => c.level === "all" || c.level === classLevel).map(c => (
            <div key={c.id} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{c.name}</span>
              <span className="font-bold text-foreground">KES {c.amount.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Payment history */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border">
              {["Date", "Receipt", "Category", "Method", "Ref", "Amount"].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-muted-foreground text-sm">No payments found.</td></tr>
              ) : filtered.map(p => (
                <tr key={p.id} className="hover:bg-muted/30">
                  <td className="px-4 py-2.5 text-xs text-foreground">{new Date(p.payment_date).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{p.receipt_no}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{p.fee_category?.name || "General"}</td>
                  <td className="px-4 py-2.5 text-xs">
                    <span className={`font-semibold px-1.5 py-0.5 rounded text-[10px] ${
                      p.payment_method === "M-Pesa" ? "bg-green-100 text-green-700" :
                      p.payment_method === "Bank Transfer" ? "bg-blue-100 text-blue-700" :
                      "bg-muted text-muted-foreground"
                    }`}>{p.payment_method || "—"}</span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{p.payment_reference || "—"}</td>
                  <td className="px-4 py-2.5 text-xs font-bold text-foreground">KES {p.amount_paid.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
