// Utility to group flat exam marks by exam name for transfer reports

export type RawExamMark = {
  score: number | null;
  out_of: number;
  exam?: { name?: string; term?: string | null } | null;
  subject_paper?: { paper_name?: string } | null;
};

export type GroupedExam = {
  examName: string;
  term: string;
  papers: { paperName: string; score: number | null; outOf: number }[];
  totalScore: number;
  totalOutOf: number;
};

export function groupExamMarks(marks: RawExamMark[]): GroupedExam[] {
  const map = new Map<string, GroupedExam>();

  for (const m of marks) {
    const examName = m.exam?.name || "Unknown Exam";
    const term = m.exam?.term || "—";
    const key = examName;

    if (!map.has(key)) {
      map.set(key, { examName, term, papers: [], totalScore: 0, totalOutOf: 0 });
    }
    const group = map.get(key)!;
    const paperName = m.subject_paper?.paper_name || "Paper";
    const score = m.score ?? 0;
    group.papers.push({ paperName, score: m.score, outOf: m.out_of });
    group.totalScore += score;
    group.totalOutOf += m.out_of;
  }

  return Array.from(map.values());
}

export function buildGroupedExamHtml(exams: RawExamMark[]): string {
  const grouped = groupExamMarks(exams);
  if (grouped.length === 0) return '<p style="font-size:12px;color:#999">No exam records on file.</p>';

  let html = "";
  for (const g of grouped) {
    html += `<h3 style="font-size:13px;color:#004000;margin:12px 0 4px">${g.examName} <span style="font-size:11px;color:#666">(${g.term})</span></h3>`;
    html += `<table><thead><tr><th>Paper</th><th>Score</th></tr></thead><tbody>`;
    for (const p of g.papers) {
      html += `<tr><td>${p.paperName}</td><td>${p.score ?? "—"}/${p.outOf}</td></tr>`;
    }
    html += `<tr style="font-weight:bold;background:#f5f5f5"><td>Total</td><td>${g.totalScore}/${g.totalOutOf}</td></tr>`;
    html += `</tbody></table>`;
  }
  return html;
}
