import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface GradeEntry {
  id: string;
  grade: string;
  label: string;
  min_score: number;
  max_score: number;
  points: number | null;
  order_index: number;
  sub_grades: SubGradeEntry[];
}

export interface SubGradeEntry {
  id: string;
  sub_grade: string;
  min_score: number;
  max_score: number;
  points: number | null;
}

interface GradingScale {
  id: string;
  name: string;
  is_default: boolean;
}

const FALLBACK_GRADES: GradeEntry[] = [
  { id: "f1", grade: "A", label: "Excellent", min_score: 80, max_score: 100, points: 5, order_index: 0, sub_grades: [] },
  { id: "f2", grade: "B", label: "Good", min_score: 60, max_score: 79, points: 4, order_index: 1, sub_grades: [] },
  { id: "f3", grade: "C", label: "Average", min_score: 40, max_score: 59, points: 3, order_index: 2, sub_grades: [] },
  { id: "f4", grade: "D", label: "Below Average", min_score: 20, max_score: 39, points: 2, order_index: 3, sub_grades: [] },
  { id: "f5", grade: "E", label: "Weak", min_score: 0, max_score: 19, points: 1, order_index: 4, sub_grades: [] },
];

export function useGradingScale(schoolId: string | undefined) {
  const [grades, setGrades] = useState<GradeEntry[]>(FALLBACK_GRADES);
  const [scale, setScale] = useState<GradingScale | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!schoolId) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      // Get the default (or first active) grading scale
      const { data: scales } = await supabase
        .from("grading_scales")
        .select("id, name, is_default")
        .eq("school_id", schoolId)
        .eq("is_active", true)
        .order("is_default", { ascending: false })
        .limit(1);

      const activeScale = scales?.[0];
      if (!activeScale) { setLoading(false); return; }

      setScale(activeScale);

      // Fetch grade entries
      const { data: entries } = await supabase
        .from("grade_entries")
        .select("id, grade, label, min_score, max_score, points, order_index")
        .eq("grading_scale_id", activeScale.id)
        .order("order_index");

      if (!entries?.length) { setLoading(false); return; }

      // Fetch sub-grade entries
      const entryIds = entries.map(e => e.id);
      const { data: subEntries } = await supabase
        .from("grade_sub_entries")
        .select("id, grade_entry_id, sub_grade, min_score, max_score, points, order_index")
        .in("grade_entry_id", entryIds)
        .order("order_index");

      const gradeList: GradeEntry[] = entries.map(e => ({
        ...e,
        sub_grades: (subEntries || [])
          .filter(se => se.grade_entry_id === e.id)
          .map(se => ({ id: se.id, sub_grade: se.sub_grade, min_score: se.min_score, max_score: se.max_score, points: se.points })),
      }));

      setGrades(gradeList);
      setLoading(false);
    })();
  }, [schoolId]);

  /** Get grade string for a percentage (0-100). Uses sub-grades when available for precision. */
  const getGrade = useCallback((pct: number): string => {
    // Try sub-grades first for more precise matching
    for (const entry of grades) {
      if (entry.sub_grades.length > 0) {
        for (const sub of entry.sub_grades) {
          if (pct >= sub.min_score && pct <= sub.max_score) return sub.sub_grade;
        }
      }
      if (pct >= entry.min_score && pct <= entry.max_score) return entry.grade;
    }
    // Fallback to last grade
    return grades[grades.length - 1]?.grade || "E";
  }, [grades]);

  /** Get points for a percentage */
  const getPoints = useCallback((pct: number): number => {
    for (const entry of grades) {
      if (entry.sub_grades.length > 0) {
        for (const sub of entry.sub_grades) {
          if (pct >= sub.min_score && pct <= sub.max_score) return sub.points ?? entry.points ?? 0;
        }
      }
      if (pct >= entry.min_score && pct <= entry.max_score) return entry.points ?? 0;
    }
    return 0;
  }, [grades]);

  /** Get all unique grade names (for distribution charts) */
  const gradeNames = grades.map(g => g.grade);

  /** Get grade distribution from a list of percentages */
  const getGradeDistribution = useCallback((percentages: number[]) => {
    const counts: Record<string, number> = {};
    grades.forEach(g => { counts[g.grade] = 0; });
    percentages.forEach(pct => {
      // Map to main grade for distribution
      for (const entry of grades) {
        if (pct >= entry.min_score && pct <= entry.max_score) {
          counts[entry.grade] = (counts[entry.grade] || 0) + 1;
          break;
        }
      }
    });
    const total = percentages.length;
    return grades.map(g => ({
      grade: g.grade,
      count: counts[g.grade] || 0,
      percentage: total ? Math.round(((counts[g.grade] || 0) / total) * 100) : 0,
    }));
  }, [grades]);

  return { grades, scale, loading, getGrade, getPoints, gradeNames, getGradeDistribution };
}
