// Generate a printable Transfer Certificate HTML document

interface CertificateData {
  studentName: string;
  admNo: string;
  className: string;
  streamName: string;
  destinationSchool: string;
  reason: string;
  feeBalance: number;
  completedAt: string;
  adminComments: string | null;
  teacherComments: string | null;
  school: {
    school_name: string;
    logo_url?: string;
    address?: string;
    phone?: string;
    email?: string;
    moto?: string;
  } | null;
}

export function generateTransferCertificate(data: CertificateData): void {
  const s = data.school;
  const date = new Date(data.completedAt).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Transfer Certificate</title>
<style>
  @page { size: A4 portrait; margin: 20mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Times New Roman', Georgia, serif; color: #1a1a1a; padding: 40px; background: #fff; }
  .border-frame { border: 3px double #004000; padding: 30px; min-height: 90vh; position: relative; }
  .border-frame::before {
    content: ''; position: absolute; inset: 6px; border: 1px solid #004000; pointer-events: none;
  }
  .header { text-align: center; margin-bottom: 25px; }
  .logo { width: 80px; height: 80px; object-fit: contain; margin-bottom: 8px; }
  .school-name { font-size: 24px; font-weight: bold; color: #004000; text-transform: uppercase; letter-spacing: 2px; }
  .motto { font-size: 11px; color: #666; font-style: italic; margin: 4px 0; }
  .school-contact { font-size: 10px; color: #666; margin: 2px 0; }
  .title { text-align: center; margin: 20px 0; }
  .title h2 { font-size: 20px; color: #004000; text-transform: uppercase; letter-spacing: 3px;
    border-top: 2px solid #004000; border-bottom: 2px solid #004000; display: inline-block; padding: 6px 30px; }
  .cert-body { font-size: 14px; line-height: 2; margin: 25px 0; text-align: justify; }
  .cert-body .field { font-weight: bold; text-decoration: underline; color: #004000; }
  .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 20px 0; }
  .detail-item { padding: 8px 12px; border-bottom: 1px dotted #ccc; }
  .detail-label { font-size: 10px; text-transform: uppercase; color: #888; letter-spacing: 1px; }
  .detail-value { font-size: 13px; font-weight: bold; color: #1a1a1a; }
  .fee-note { background: ${data.feeBalance > 0 ? '#fef2f2' : '#f0fdf4'}; border: 1px solid ${data.feeBalance > 0 ? '#fca5a5' : '#86efac'};
    padding: 10px 15px; border-radius: 4px; margin: 15px 0; font-size: 12px; }
  .remarks { margin: 15px 0; padding: 10px 15px; border-left: 3px solid #004000; background: #f9f9f9; font-size: 12px; }
  .signatures { display: flex; justify-content: space-between; margin-top: 50px; }
  .sig-block { text-align: center; width: 28%; }
  .sig-line { border-top: 1px solid #333; margin-top: 50px; padding-top: 6px; font-size: 11px; font-weight: bold; }
  .sig-role { font-size: 9px; color: #666; }
  .stamp-area { text-align: center; margin-top: 20px; }
  .stamp-circle { width: 80px; height: 80px; border: 2px dashed #ccc; border-radius: 50%; display: inline-flex;
    align-items: center; justify-content: center; font-size: 9px; color: #ccc; }
  .footer { text-align: center; margin-top: 20px; font-size: 9px; color: #999; border-top: 1px solid #eee; padding-top: 8px; }
  .ref-no { font-size: 10px; color: #999; text-align: right; margin-bottom: 10px; }
  @media print { body { padding: 0; } .border-frame { min-height: auto; } }
</style></head><body>
<div class="border-frame">
  <div class="ref-no">Ref: TC/${new Date(data.completedAt).getFullYear()}/${Math.random().toString(36).substring(2, 8).toUpperCase()}</div>

  <div class="header">
    ${s?.logo_url ? `<img src="${s.logo_url}" class="logo" alt="School Logo" />` : ''}
    <div class="school-name">${s?.school_name || 'School'}</div>
    ${s?.moto ? `<div class="motto">"${s.moto}"</div>` : ''}
    <div class="school-contact">${[s?.address, s?.phone, s?.email].filter(Boolean).join(' | ')}</div>
  </div>

  <div class="title"><h2>Transfer Certificate</h2></div>

  <div class="cert-body">
    This is to certify that <span class="field">${data.studentName}</span>,
    Admission Number <span class="field">${data.admNo || '—'}</span>,
    a student of <span class="field">${data.className} ${data.streamName}</span>,
    has been officially transferred from this institution
    on <span class="field">${date}</span>.
    ${data.destinationSchool ? `The student is transferring to <span class="field">${data.destinationSchool}</span>.` : ''}
  </div>

  <div class="details-grid">
    <div class="detail-item">
      <div class="detail-label">Student Name</div>
      <div class="detail-value">${data.studentName}</div>
    </div>
    <div class="detail-item">
      <div class="detail-label">Admission Number</div>
      <div class="detail-value">${data.admNo || '—'}</div>
    </div>
    <div class="detail-item">
      <div class="detail-label">Class / Stream</div>
      <div class="detail-value">${data.className} ${data.streamName}</div>
    </div>
    <div class="detail-item">
      <div class="detail-label">Date of Transfer</div>
      <div class="detail-value">${date}</div>
    </div>
    <div class="detail-item">
      <div class="detail-label">Destination School</div>
      <div class="detail-value">${data.destinationSchool || 'Not specified'}</div>
    </div>
    <div class="detail-item">
      <div class="detail-label">Reason for Transfer</div>
      <div class="detail-value">${data.reason || '—'}</div>
    </div>
  </div>

  <div class="fee-note">
    <strong>Fee Status:</strong> ${data.feeBalance > 0
      ? `Outstanding balance of <strong>KES ${data.feeBalance.toLocaleString()}</strong> at time of transfer.`
      : 'No outstanding fee balance. All fees cleared.'}
  </div>

  ${data.adminComments || data.teacherComments ? `
  <div class="remarks">
    ${data.adminComments ? `<p><strong>Admin Remarks:</strong> ${data.adminComments}</p>` : ''}
    ${data.teacherComments ? `<p><strong>Class Teacher Remarks:</strong> ${data.teacherComments}</p>` : ''}
  </div>` : ''}

  <div class="signatures">
    <div class="sig-block">
      <div class="sig-line">Class Teacher</div>
      <div class="sig-role">Signature & Date</div>
    </div>
    <div class="sig-block">
      <div class="sig-line">Head Teacher / Principal</div>
      <div class="sig-role">Signature & Date</div>
    </div>
    <div class="sig-block">
      <div class="sig-line">Parent / Guardian</div>
      <div class="sig-role">Signature & Date</div>
    </div>
  </div>

  <div class="stamp-area">
    <div class="stamp-circle">Official<br/>Stamp</div>
  </div>

  <div class="footer">
    This certificate is issued by ${s?.school_name || 'the school'} and is valid for enrollment purposes at the receiving institution.
    <br/>Generated on ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
  </div>
</div>
</body></html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank");
  if (w) {
    w.onload = () => { w.print(); URL.revokeObjectURL(url); };
  }
}
