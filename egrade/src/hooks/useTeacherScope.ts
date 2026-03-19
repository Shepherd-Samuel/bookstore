import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Allocation {
  stream_id: string;
  subject_id: string;
}

interface TeacherScope {
  /** Stream IDs where teacher is class teacher */
  classTeacherStreamIds: string[];
  /** Subject-teacher allocations: which subjects in which streams */
  allocations: Allocation[];
  /** All stream IDs the teacher has any access to (union of class teacher + subject allocations) */
  accessibleStreamIds: string[];
  /** Get allowed subject IDs for a given stream */
  getAllowedSubjects: (streamId: string) => string[];
  /** Whether teacher is class teacher for a given stream */
  isClassTeacher: (streamId: string) => boolean;
  /** Whether teacher has any access to a stream (class teacher OR subject allocation) */
  hasStreamAccess: (streamId: string) => boolean;
  loading: boolean;
}

/**
 * Hook that determines a teacher's scope based on:
 * 1. subject_teacher_allocations (subject teaching assignments)
 * 2. streams.class_teacher_id (class teacher assignments)
 * 
 * School admins get unrestricted access (all flags return true).
 */
export function useTeacherScope(
  teacherId: string | undefined,
  schoolId: string | undefined,
  role: string | undefined
): TeacherScope {
  const [classTeacherStreamIds, setClassTeacherStreamIds] = useState<string[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = role === "school_admin" || role === "saas_admin";

  useEffect(() => {
    if (!teacherId || !schoolId || isAdmin) {
      setLoading(false);
      return;
    }

    const fetch = async () => {
      setLoading(true);
      const [allocRes, ctRes] = await Promise.all([
        supabase
          .from("subject_teacher_allocations")
          .select("stream_id, subject_id")
          .eq("teacher_id", teacherId)
          .eq("school_id", schoolId)
          .eq("is_active", true),
        supabase
          .from("streams")
          .select("id")
          .eq("school_id", schoolId)
          .eq("class_teacher_id", teacherId)
          .eq("is_active", true),
      ]);

      if (allocRes.data) setAllocations(allocRes.data as Allocation[]);
      if (ctRes.data) setClassTeacherStreamIds(ctRes.data.map(s => s.id));
      setLoading(false);
    };
    fetch();
  }, [teacherId, schoolId, isAdmin]);

  const accessibleStreamIds = isAdmin
    ? [] // not used for admins
    : [...new Set([
        ...classTeacherStreamIds,
        ...allocations.map(a => a.stream_id),
      ])];

  const getAllowedSubjects = (streamId: string): string[] => {
    if (isAdmin) return []; // admin sees all
    return [...new Set(allocations.filter(a => a.stream_id === streamId).map(a => a.subject_id))];
  };

  const isClassTeacher = (streamId: string): boolean => {
    if (isAdmin) return true;
    return classTeacherStreamIds.includes(streamId);
  };

  const hasStreamAccess = (streamId: string): boolean => {
    if (isAdmin) return true;
    return accessibleStreamIds.includes(streamId);
  };

  return {
    classTeacherStreamIds,
    allocations,
    accessibleStreamIds,
    getAllowedSubjects,
    isClassTeacher,
    hasStreamAccess,
    loading,
  };
}
