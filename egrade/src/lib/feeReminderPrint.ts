// Bulk print fee reminders for students with balances

interface ReminderStudent {
  studentName: string;
  admNo: string | null;
  className: string;
  streamName: string;
  totalFees: number;
  totalPaid: number;
  balance: number;
  parentName: string | null;
  parentPhone: string | null;
}

interface SchoolInfo {
  school_name: string;
  logo_url?: string;
  address?: string;
  phone?: string;
  email?: string;
  moto?: string;
}

export function printFeeReminders(students: ReminderStudent[], school: SchoolInfo | null): void {
  const date = new Date().toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" });
  const s = school;
  const refBase = `FR/${new Date().getFullYear()}/${Date.now().toString(36).toUpperCase().slice(-4)}`;

  const pages = students.map((st, i) => `
    <div class="reminder${i < students.length - 1 ? ' page-break' : ''}">
      <div class="border-wrap">
        <div class="ref-no">Ref: ${refBase}-${String(i + 1).padStart(3, '0')}</div>

        <div class="header">
          ${s?.logo_url ? `<img src="${s.logo_url}" class="logo" alt="School Logo" />` : ''}
          <div class="school-name">${s?.school_name || 'School'}</div>
          ${s?.moto ? `<div class="motto">"${s.moto}"</div>` : ''}
          <div class="school-contacts">${[s?.address, s?.phone, s?.email].filter(Boolean).join(' · ')}</div>
        </div>

        <div class="title-block"><h2>FEE BALANCE REMINDER</h2></div>
        <p class="date">Date: ${date}</p>

        <div class="recipient-block">
          <div class="recipient-grid">
            <div class="recipient-item"><span class="rl">To:</span> <strong>${st.parentName || 'Parent/Guardian'}</strong></div>
            ${st.parentPhone ? `<div class="recipient-item"><span class="rl">Phone:</span> ${st.parentPhone}</div>` : ''}
          </div>
        </div>

        <div class="student-info">
          <div class="si-grid">
            <div class="si-item"><div class="si-label">Student Name</div><div class="si-value">${st.studentName}</div></div>
            <div class="si-item"><div class="si-label">Admission No.</div><div class="si-value">${st.admNo || 'N/A'}</div></div>
            <div class="si-item"><div class="si-label">Class</div><div class="si-value">${st.className}</div></div>
            <div class="si-item"><div class="si-label">Stream</div><div class="si-value">${st.streamName}</div></div>
          </div>
        </div>

        <p class="body-text">
          Dear Parent/Guardian,<br/><br/>
          This is to officially notify you that <strong>${st.studentName}</strong>, a student in
          <strong>${st.className} — ${st.streamName}</strong>, has an outstanding fee balance as detailed below.
          We kindly request that you make arrangements to clear the balance at your earliest convenience to avoid
          disruption to the student's academic activities.
        </p>

        <table class="fee-table">
          <thead>
            <tr><th>Description</th><th style="text-align:right;">Amount (KES)</th></tr>
          </thead>
          <tbody>
            <tr><td>Total Fees Due</td><td style="text-align:right;">KES ${st.totalFees.toLocaleString()}</td></tr>
            <tr><td>Total Amount Paid</td><td style="text-align:right; color:#16a34a;">KES ${st.totalPaid.toLocaleString()}</td></tr>
          </tbody>
          <tfoot>
            <tr class="balance-row"><td><strong>Outstanding Balance</strong></td><td style="text-align:right;"><strong>KES ${st.balance.toLocaleString()}</strong></td></tr>
          </tfoot>
        </table>

        <div class="payment-info">
          <p class="pi-title">Accepted Payment Methods:</p>
          <div class="pi-grid">
            <div class="pi-item"><strong>M-Pesa</strong><br/>Pay to school paybill</div>
            <div class="pi-item"><strong>Bank Transfer</strong><br/>School bank account</div>
            <div class="pi-item"><strong>Cash</strong><br/>Bursar's office</div>
          </div>
          <p class="pi-note">Please retain your payment receipt for verification.</p>
        </div>

        <p class="body-text">
          Should you have any queries regarding this balance, please do not hesitate to contact the school finance office
          during working hours.
        </p>

        <div class="signatures">
          <div class="sig-block"><div class="sig-line">School Administrator</div><div class="sig-role">Signature & Stamp</div></div>
          <div class="sig-block"><div class="sig-line">Parent / Guardian</div><div class="sig-role">Acknowledgement</div></div>
        </div>

        <div class="footer">
          This is an official fee reminder from ${s?.school_name || 'the school'}. Please treat it with urgency.<br/>
          Generated on ${date} · eGrade M|S · Kenya CBC School Management Platform
        </div>
      </div>
    </div>
  `).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Fee Reminders</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; font-size: 12px; line-height: 1.5; }
  .reminder { padding: 10px; }
  .page-break { page-break-after: always; }
  .border-wrap { border: 2px solid #004000; border-radius: 6px; padding: 24px; position: relative; }
  .border-wrap::before { content: ''; position: absolute; inset: 3px; border: 1px solid #e5e7eb; border-radius: 4px; pointer-events: none; }
  .ref-no { text-align: right; font-size: 9px; color: #999; margin-bottom: 8px; font-family: monospace; }
  .header { text-align: center; border-bottom: 2px solid #004000; padding-bottom: 10px; margin-bottom: 14px; }
  .header .logo { width: 55px; height: 55px; object-fit: contain; margin-bottom: 4px; }
  .school-name { font-size: 18px; font-weight: 900; color: #004000; text-transform: uppercase; letter-spacing: 1.5px; }
  .motto { font-size: 9px; color: #666; font-style: italic; }
  .school-contacts { font-size: 8px; color: #888; margin-top: 2px; }
  .title-block { text-align: center; margin: 10px 0; }
  .title-block h2 { font-size: 14px; color: #004000; text-transform: uppercase; letter-spacing: 2px; border-top: 1px solid #004000; border-bottom: 1px solid #004000; display: inline-block; padding: 4px 18px; }
  .date { text-align: right; font-size: 10px; color: #666; margin-bottom: 12px; }
  .recipient-block { background: #f8faf8; border: 1px solid #d1d5db; border-radius: 5px; padding: 10px; margin-bottom: 10px; }
  .recipient-grid { display: flex; gap: 16px; font-size: 11px; }
  .rl { color: #888; }
  .student-info { margin-bottom: 12px; }
  .si-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 6px; }
  .si-item { padding: 6px 8px; background: #f9fafb; border-radius: 4px; border: 1px solid #e5e7eb; }
  .si-label { font-size: 8px; text-transform: uppercase; color: #888; letter-spacing: 0.5px; }
  .si-value { font-size: 11px; font-weight: 700; color: #1a1a1a; }
  .body-text { margin-bottom: 12px; text-align: justify; font-size: 11px; }
  .fee-table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  .fee-table th { background: #004000; color: white; padding: 7px 12px; font-size: 10px; text-align: left; }
  .fee-table td { padding: 7px 12px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
  .fee-table tfoot .balance-row td { border-top: 2px solid #004000; color: #dc2626; font-size: 13px; background: #fef2f2; }
  .payment-info { background: #f0f7f0; border: 1px solid #86efac; border-radius: 5px; padding: 10px; margin: 12px 0; }
  .pi-title { font-size: 10px; font-weight: 700; color: #004000; margin-bottom: 6px; }
  .pi-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; margin-bottom: 6px; }
  .pi-item { font-size: 9px; color: #333; text-align: center; padding: 6px; background: white; border-radius: 4px; border: 1px solid #d1fae5; }
  .pi-note { font-size: 9px; color: #666; font-style: italic; }
  .signatures { display: flex; justify-content: space-between; margin-top: 28px; }
  .sig-block { text-align: center; width: 35%; }
  .sig-line { border-top: 1px solid #333; margin-top: 35px; padding-top: 3px; font-size: 10px; font-weight: 700; }
  .sig-role { font-size: 8px; color: #888; }
  .footer { text-align: center; margin-top: 14px; font-size: 8px; color: #aaa; border-top: 1px solid #eee; padding-top: 6px; }
  @media print { body { padding: 0; } .page-break { page-break-after: always; } .border-wrap { border: none; } .border-wrap::before { display: none; } }
</style></head><body>${pages}</body></html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank");
  if (w) w.onload = () => { w.print(); URL.revokeObjectURL(url); };
}