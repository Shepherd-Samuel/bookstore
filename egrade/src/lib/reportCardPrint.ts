import type { ChildProfile, SchoolInfo, ExamResult, CbcLevel } from "@/hooks/useParentData";
import { LEVEL_LABELS, CORE_COMPETENCIES } from "@/hooks/useParentData";
import type { GradeEntry } from "@/hooks/useGradingScale";

function validPhoto(url: string | null | undefined): string | null {
  if (!url || url.trim() === "") return null;
  return url;
}

const PRINT_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', 'Segoe UI', Arial, sans-serif; color: #1a1a1a; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  @page { size: A4 portrait; margin: 10mm 8mm; }
  .report-card { max-width: 100%; }
  .page-break { page-break-after: always; break-after: page; }
  .header { text-align: center; padding-bottom: 10px; margin-bottom: 10px; border-bottom: 3px double #004000; }
  .header-inner { display: flex; align-items: center; justify-content: center; gap: 14px; }
  .header img.logo { width: 56px; height: 56px; object-fit: contain; }
  .header h1 { font-size: 18px; color: #004000; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; }
  .header .motto { font-size: 9px; color: #555; font-style: italic; margin-top: 1px; }
  .header .contacts { font-size: 8px; color: #888; margin-top: 4px; }
  .report-title-bar { margin-top: 8px; background: linear-gradient(135deg, #004000, #006600); color: white; padding: 5px 16px; border-radius: 4px; display: inline-block; }
  .report-title-bar h2 { font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; }
  .report-title-bar p { font-size: 8px; opacity: 0.85; margin-top: 1px; }
  .student-block { display: flex; gap: 12px; margin: 10px 0; padding: 10px; background: #f8faf8; border: 1px solid #d1d5db; border-radius: 6px; }
  .student-block .photo-frame { width: 70px; min-width: 70px; height: 85px; border: 2px solid #004000; border-radius: 6px; overflow: hidden; background: #e5e7eb; flex-shrink: 0; }
  .student-block .photo-frame img { width: 100%; height: 100%; object-fit: cover; }
  .student-block .photo-frame .initials { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 900; color: #004000; background: #dcfce7; }
  .info-fields { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 3px 16px; font-size: 10px; flex: 1; }
  .info-fields .label { font-size: 7px; text-transform: uppercase; letter-spacing: 0.5px; color: #888; font-weight: 600; }
  .info-fields .value { font-weight: 700; color: #1a1a1a; }
  .section-title { font-size: 10px; font-weight: 800; color: #004000; margin: 10px 0 4px; padding: 3px 8px; background: #f0fdf4; border-left: 3px solid #004000; border-radius: 0 4px 4px 0; text-transform: uppercase; letter-spacing: 0.5px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 6px; font-size: 9px; }
  thead th { background: #004000; color: white; padding: 5px 8px; text-align: left; font-weight: 600; font-size: 8px; text-transform: uppercase; letter-spacing: 0.3px; }
  thead th:first-child { border-radius: 4px 0 0 0; } thead th:last-child { border-radius: 0 4px 0 0; }
  tbody td { padding: 4px 8px; border-bottom: 1px solid #e5e7eb; }
  tbody tr:nth-child(even) { background: #fafafa; }
  .badge { display: inline-block; padding: 1px 10px; border-radius: 10px; font-weight: 700; font-size: 8px; }
  .badge-EE { background: #dcfce7; color: #166534; } .badge-ME { background: #dbeafe; color: #1e40af; }
  .badge-AE { background: #fef3c7; color: #92400e; } .badge-BE { background: #fee2e2; color: #991b1b; }
  .overall-strip { display: flex; align-items: center; gap: 12px; padding: 6px 12px; background: linear-gradient(135deg, #f0fdf4, #dcfce7); border: 1px solid #86efac; border-radius: 6px; margin: 6px 0; }
  .overall-strip .score { font-size: 22px; font-weight: 900; color: #004000; }
  .overall-strip .meta { font-size: 8px; color: #666; margin-left: auto; }
  .comp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 16px; margin-top: 4px; }
  .comp-row { display: flex; justify-content: space-between; align-items: center; padding: 2px 0; border-bottom: 1px solid #f3f4f6; font-size: 9px; }
  .comments-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 6px; }
  .comment-box .comment-label { font-size: 8px; font-weight: 700; color: #004000; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 2px; }
  .comment-box .comment-content { font-size: 9px; padding: 6px 8px; background: #fafafa; border: 1px dashed #d1d5db; border-radius: 4px; min-height: 30px; line-height: 1.4; }
  .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 14px; text-align: center; font-size: 8px; }
  .sig-line { border-top: 1px solid #1a1a1a; margin-top: 22px; padding-top: 3px; font-weight: 600; }
  .footer { margin-top: 8px; text-align: center; font-size: 7px; color: #aaa; border-top: 1px solid #e5e7eb; padding-top: 5px; }
  .footer .levels { font-weight: 600; color: #666; }
  @media print { body { padding: 0; } .page-break { page-break-after: always; } }
`;

interface PrintContext {
  school: SchoolInfo | null;
  streams: any[];
  classes: any[];
  teachers: Record<string, string>;
  subjects: any[];
  papers: any[];
  examMarks: any[];
  exams: any[];
  strandAssessments: any[];
  competencies: any[];
  gradingEntries: GradeEntry[];
  getLevel: (pct: number) => CbcLevel;
  getGrade: (pct: number) => string;
}

function buildHeader(ctx: PrintContext, title: string, subtitle?: string): string {
  const s = ctx.school;
  return `
    <div class="header">
      <div class="header-inner">
        ${validPhoto(s?.logo_url) ? `<img src="${s!.logo_url}" alt="" class="logo" />` : ""}
        <div>
          <h1>${s?.school_name || ""}</h1>
          ${s?.moto ? `<p class="motto">&ldquo;${s.moto}&rdquo;</p>` : ""}
        </div>
      </div>
      <p class="contacts">${[s?.email, s?.phone, s?.address].filter(Boolean).join("  •  ")}</p>
      <div class="report-title-bar"><h2>${title}</h2><p>${subtitle || "Term 1 · Academic Year 2026"}</p></div>
    </div>`;
}

function buildStudentInfo(ctx: PrintContext, student: ChildProfile): string {
  const photo = validPhoto(student.passport_url);
  const st = ctx.streams.find((s: any) => s.id === student.stream_id);
  const cls = st ? ctx.classes.find((c: any) => c.id === st.class_id) : null;
  const ct = st?.class_teacher_id ? ctx.teachers[st.class_teacher_id] : "—";
  const photoHtml = photo
    ? `<img src="${photo}" alt="" />`
    : `<div class="initials">${(student.first_name?.[0] || "") + (student.last_name?.[0] || "")}</div>`;

  return `
    <div class="student-block">
      <div class="photo-frame">${photoHtml}</div>
      <div class="info-fields">
        <div class="field"><div class="label">Full Name</div><div class="value">${student.first_name} ${student.last_name}</div></div>
        <div class="field"><div class="label">Adm No</div><div class="value">${student.adm_no || "—"}</div></div>
        <div class="field"><div class="label">Gender</div><div class="value" style="text-transform:capitalize;">${student.gender || "—"}</div></div>
        <div class="field"><div class="label">Class / Stream</div><div class="value">${cls?.name || "—"} — ${st?.name || "—"}</div></div>
        <div class="field"><div class="label">Class Teacher</div><div class="value">${ct}</div></div>
        <div class="field"><div class="label">Level</div><div class="value" style="text-transform:capitalize;">${cls?.level?.replace("_", " ") || "—"}</div></div>
      </div>
    </div>`;
}

function buildStrands(ctx: PrintContext): string {
  if (ctx.strandAssessments.length === 0) return "";
  const bySubject: Record<string, any[]> = {};
  ctx.strandAssessments.forEach((sa: any) => {
    const sub = ctx.subjects.find((s: any) => s.id === sa.subject_id);
    const name = sub?.name || "Unknown";
    if (!bySubject[name]) bySubject[name] = [];
    bySubject[name].push(sa);
  });
  const rows = Object.entries(bySubject)
    .flatMap(([subName, sas]) =>
      sas.map(
        (sa: any, i: number) =>
          `<tr>${i === 0 ? `<td rowspan="${sas.length}" style="font-weight:600;vertical-align:top;">${subName}</td>` : ""}
          <td>${sa.strand}</td><td style="font-size:8px;">${sa.sub_strand}</td>
          <td><span class="badge badge-${sa.rating}">${sa.rating}</span></td>
          <td style="font-size:8px;color:#666;">${sa.comments || "—"}</td></tr>`
      )
    )
    .join("");
  return `
    <div class="section-title">CBC Strand-Based Assessments (Formative)</div>
    <table><thead><tr><th>Subject</th><th>Strand</th><th>Sub-Strand</th><th>Rating</th><th>Comments</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function buildCompetencies(ctx: PrintContext): string {
  const comps = CORE_COMPETENCIES.map((c) => {
    const existing = ctx.competencies.find(
      (r: any) => r.competency === c && r.term === "Term 1" && r.academic_year === "2026"
    );
    const rating = existing?.rating || "ME";
    return `<div class="comp-row"><span>${c}</span><span class="badge badge-${rating}">${rating}</span></div>`;
  }).join("");
  return `<div class="section-title">Core Competencies (KICD Framework)</div><div class="comp-grid">${comps}</div>`;
}

function buildFooter(ctx: PrintContext): string {
  const g = ctx.gradingEntries;
  const levelLabels =
    g.length >= 4
      ? `${g[0]?.grade} (Exceeding Expectations) ≥${g[0]?.min_score}%&nbsp;&nbsp;|&nbsp;&nbsp;${g[1]?.grade} (Meeting Expectations) ≥${g[1]?.min_score}%&nbsp;&nbsp;|&nbsp;&nbsp;${g[2]?.grade} (Approaching Expectations) ≥${g[2]?.min_score}%&nbsp;&nbsp;|&nbsp;&nbsp;${g[3]?.grade} (Below Expectations) &lt;${g[2]?.min_score}%`
      : `EE ≥80% | ME ≥60% | AE ≥40% | BE <40%`;
  return `<div class="footer"><p class="levels">${levelLabels}</p><p style="margin-top:2px;">Generated by eGrade M|S — Kenya's CBC School Management Platform</p></div>`;
}

export function buildFullReport(ctx: PrintContext, student: ChildProfile, examFilter: string): string {
  const filteredExams =
    examFilter === "all"
      ? ctx.exams.filter((ex) => ctx.examMarks.some((m) => m.exam_id === ex.id))
      : ctx.exams.filter((ex) => ex.id === examFilter);
  const examLabel = examFilter === "all" ? "All Exams" : filteredExams[0]?.name || "Exam";

  const marks = ctx.examMarks.filter((m) => filteredExams.some((ex) => ex.id === m.exam_id));
  const bySubject: Record<string, { score: number; outOf: number; name: string }> = {};
  marks.forEach((m: any) => {
    const paper = ctx.papers.find((p: any) => p.id === m.subject_paper_id);
    const sub = paper ? ctx.subjects.find((s: any) => s.id === paper.subject_id) : null;
    const key = sub?.name || m.subject_paper_id;
    if (!bySubject[key]) bySubject[key] = { score: 0, outOf: 0, name: sub ? `${sub.name} (${paper?.paper_name})` : "Unknown" };
    bySubject[key].score += m.score || 0;
    bySubject[key].outOf += m.out_of;
  });

  const examRows = Object.values(bySubject)
    .map((r) => {
      const pct = r.outOf > 0 ? (r.score / r.outOf) * 100 : 0;
      const level = ctx.getLevel(pct);
      return `<tr><td style="font-weight:600;">${r.name}</td><td>${r.score}/${r.outOf}</td><td style="font-weight:700;">${pct.toFixed(0)}%</td><td><span class="badge badge-${level}">${level}</span></td></tr>`;
    })
    .join("");

  const totalScore = Object.values(bySubject).reduce((s, r) => s + r.score, 0);
  const totalOutOf = Object.values(bySubject).reduce((s, r) => s + r.outOf, 0);
  const overallPct = totalOutOf > 0 ? (totalScore / totalOutOf) * 100 : 0;
  const overallLevel = ctx.getLevel(overallPct);

  const comment =
    overallPct >= 80
      ? "Excellent performance. Keep up the outstanding work!"
      : overallPct >= 60
      ? "Good performance. Continue striving for excellence."
      : overallPct >= 40
      ? "Fair performance. More dedication and effort needed."
      : "Below average. Requires immediate attention and support.";

  return `
    <div class="report-card">
      ${buildHeader(ctx, "Comprehensive Learner Progress Report", `${examLabel} · Term 1 · Academic Year 2026`)}
      ${buildStudentInfo(ctx, student)}
      ${marks.length > 0 ? `
        <div class="section-title">Summative Exam Results — ${examLabel}</div>
        <table><thead><tr><th>Subject</th><th>Marks</th><th>%</th><th>Level</th></tr></thead><tbody>${examRows}</tbody></table>
        <div class="overall-strip"><div class="score">${overallPct.toFixed(0)}%</div><span class="badge badge-${overallLevel}">${overallLevel} — ${LEVEL_LABELS[overallLevel]}</span><span class="meta">${Object.keys(bySubject).length} subject(s)</span></div>
      ` : ""}
      ${buildStrands(ctx)}
      ${buildCompetencies(ctx)}
      <div class="comments-grid">
        <div class="comment-box"><div class="comment-label">Class Teacher's Remarks</div><div class="comment-content">${marks.length > 0 ? comment : "—"}</div></div>
        <div class="comment-box"><div class="comment-label">Head Teacher's Remarks</div><div class="comment-content">Noted. Continue working diligently.</div></div>
      </div>
      <div class="signatures">
        <div><div class="sig-line">Class Teacher's Sign</div></div>
        <div><div class="sig-line">Head Teacher's Sign</div></div>
        <div><div class="sig-line">Parent/Guardian's Sign</div></div>
      </div>
      ${buildFooter(ctx)}
    </div>`;
}

export function openPrintWindow(html: string): void {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Report Card</title><style>${PRINT_STYLES}</style></head><body>${html}</body></html>`
  );
  win.document.close();
  setTimeout(() => win.print(), 600);
}

export function openSavePDF(html: string, name: string): void {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${name}</title><style>${PRINT_STYLES}</style></head><body>${html}<script>setTimeout(()=>{document.title="${name}";window.print();},600)<\/script></body></html>`
  );
  win.document.close();
}
