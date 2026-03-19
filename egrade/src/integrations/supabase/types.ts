export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      assessment_questions: {
        Row: {
          assessment_id: string
          id: string
          marks: number
          order_index: number
          question_text: string
          question_type: string
        }
        Insert: {
          assessment_id: string
          id?: string
          marks: number
          order_index: number
          question_text: string
          question_type?: string
        }
        Update: {
          assessment_id?: string
          id?: string
          marks?: number
          order_index?: number
          question_text?: string
          question_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_questions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_scores: {
        Row: {
          assessment_id: string
          graded_at: string | null
          id: string
          remarks: string | null
          score: number | null
          student_id: string
          submitted_at: string | null
        }
        Insert: {
          assessment_id: string
          graded_at?: string | null
          id?: string
          remarks?: string | null
          score?: number | null
          student_id: string
          submitted_at?: string | null
        }
        Update: {
          assessment_id?: string
          graded_at?: string | null
          id?: string
          remarks?: string | null
          score?: number | null
          student_id?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_scores_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_scores_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          academic_year: string | null
          approval_status: string
          approved_by: string | null
          available_from: string | null
          available_until: string | null
          created_at: string
          due_date: string | null
          duration_minutes: number | null
          id: string
          instructions: string | null
          is_published: boolean
          school_id: string
          status: string
          stream_id: string
          subject_id: string
          target_stream_ids: Json | null
          teacher_id: string
          term: string | null
          title: string
          total_marks: number
          type: string
          updated_at: string
        }
        Insert: {
          academic_year?: string | null
          approval_status?: string
          approved_by?: string | null
          available_from?: string | null
          available_until?: string | null
          created_at?: string
          due_date?: string | null
          duration_minutes?: number | null
          id?: string
          instructions?: string | null
          is_published?: boolean
          school_id: string
          status?: string
          stream_id: string
          subject_id: string
          target_stream_ids?: Json | null
          teacher_id: string
          term?: string | null
          title: string
          total_marks?: number
          type?: string
          updated_at?: string
        }
        Update: {
          academic_year?: string | null
          approval_status?: string
          approved_by?: string | null
          available_from?: string | null
          available_until?: string | null
          created_at?: string
          due_date?: string | null
          duration_minutes?: number | null
          id?: string
          instructions?: string | null
          is_published?: boolean
          school_id?: string
          status?: string
          stream_id?: string
          subject_id?: string
          target_stream_ids?: Json | null
          teacher_id?: string
          term?: string | null
          title?: string
          total_marks?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          created_at: string
          date: string
          id: string
          marked_by: string
          notes: string | null
          school_id: string
          status: string
          stream_id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          marked_by: string
          notes?: string | null
          school_id: string
          status?: string
          stream_id: string
          student_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          marked_by?: string
          notes?: string | null
          school_id?: string
          status?: string
          stream_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      book_lending: {
        Row: {
          due_date: string | null
          id: string
          issue_date: string | null
          resource_id: string
          return_date: string | null
          school_id: string
          status: string | null
          student_id: string | null
        }
        Insert: {
          due_date?: string | null
          id?: string
          issue_date?: string | null
          resource_id: string
          return_date?: string | null
          school_id: string
          status?: string | null
          student_id?: string | null
        }
        Update: {
          due_date?: string | null
          id?: string
          issue_date?: string | null
          resource_id?: string
          return_date?: string | null
          school_id?: string
          status?: string | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "book_lending_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "library_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_lending_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_lending_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_lending_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string
          department_id: string | null
          description: string | null
          id: string
          is_active: boolean
          level: string
          name: string
          school_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          level?: string
          name: string
          school_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          level?: string
          name?: string
          school_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_designs: {
        Row: {
          assessment_methods: string | null
          created_at: string
          created_by: string | null
          grade: string | null
          id: string
          is_approved: boolean
          key_inquiry_questions: string | null
          learning_experiences: string | null
          lesson_number: number | null
          level: string
          resources: string | null
          specific_learning_outcomes: string | null
          strand: string
          sub_strand: string
          subject_id: string | null
          subject_name: string
          term: string | null
          updated_at: string
          week_number: number | null
        }
        Insert: {
          assessment_methods?: string | null
          created_at?: string
          created_by?: string | null
          grade?: string | null
          id?: string
          is_approved?: boolean
          key_inquiry_questions?: string | null
          learning_experiences?: string | null
          lesson_number?: number | null
          level?: string
          resources?: string | null
          specific_learning_outcomes?: string | null
          strand?: string
          sub_strand?: string
          subject_id?: string | null
          subject_name: string
          term?: string | null
          updated_at?: string
          week_number?: number | null
        }
        Update: {
          assessment_methods?: string | null
          created_at?: string
          created_by?: string | null
          grade?: string | null
          id?: string
          is_approved?: boolean
          key_inquiry_questions?: string | null
          learning_experiences?: string | null
          lesson_number?: number | null
          level?: string
          resources?: string | null
          specific_learning_outcomes?: string | null
          strand?: string
          sub_strand?: string
          subject_id?: string | null
          subject_name?: string
          term?: string | null
          updated_at?: string
          week_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_designs_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          id: string
          name: string
          school_id: string
        }
        Insert: {
          id?: string
          name: string
          school_id: string
        }
        Update: {
          id?: string
          name?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
        ]
      }
      discipline_records: {
        Row: {
          action_taken: string | null
          created_at: string
          date_reported: string | null
          id: string
          incident: string
          reported_by: string | null
          school_id: string
          student_id: string
        }
        Insert: {
          action_taken?: string | null
          created_at?: string
          date_reported?: string | null
          id?: string
          incident: string
          reported_by?: string | null
          school_id: string
          student_id: string
        }
        Update: {
          action_taken?: string | null
          created_at?: string
          date_reported?: string | null
          id?: string
          incident?: string
          reported_by?: string | null
          school_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discipline_records_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discipline_records_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discipline_records_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discipline_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      error_logs: {
        Row: {
          created_at: string
          error_message: string
          error_stack: string | null
          error_type: string
          id: string
          page_url: string | null
          school_id: string | null
          severity: string
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_message: string
          error_stack?: string | null
          error_type?: string
          id?: string
          page_url?: string | null
          school_id?: string | null
          severity?: string
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string
          error_stack?: string | null
          error_type?: string
          id?: string
          page_url?: string | null
          school_id?: string | null
          severity?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "error_logs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "error_logs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_marks: {
        Row: {
          created_at: string
          exam_id: string
          graded_at: string | null
          graded_by: string | null
          id: string
          out_of: number
          school_id: string
          score: number | null
          student_id: string
          subject_paper_id: string
        }
        Insert: {
          created_at?: string
          exam_id: string
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          out_of?: number
          school_id: string
          score?: number | null
          student_id: string
          subject_paper_id: string
        }
        Update: {
          created_at?: string
          exam_id?: string
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          out_of?: number
          school_id?: string
          score?: number | null
          student_id?: string
          subject_paper_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_marks_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_marks_graded_by_fkey"
            columns: ["graded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_marks_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_marks_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_marks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_marks_subject_paper_id_fkey"
            columns: ["subject_paper_id"]
            isOneToOne: false
            referencedRelation: "subject_papers"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_types: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          school_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          school_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_types_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_types_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          academic_year: string | null
          created_at: string
          created_by: string | null
          end_date: string | null
          exam_type_id: string
          id: string
          is_active: boolean
          name: string
          school_id: string
          start_date: string | null
          term: string | null
          updated_at: string
        }
        Insert: {
          academic_year?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          exam_type_id: string
          id?: string
          is_active?: boolean
          name: string
          school_id: string
          start_date?: string | null
          term?: string | null
          updated_at?: string
        }
        Update: {
          academic_year?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          exam_type_id?: string
          id?: string
          is_active?: boolean
          name?: string
          school_id?: string
          start_date?: string | null
          term?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_exam_type_id_fkey"
            columns: ["exam_type_id"]
            isOneToOne: false
            referencedRelation: "exam_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_categories: {
        Row: {
          amount: number
          id: string
          level: string | null
          name: string
          school_id: string
        }
        Insert: {
          amount: number
          id?: string
          level?: string | null
          name: string
          school_id: string
        }
        Update: {
          amount?: number
          id?: string
          level?: string | null
          name?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_categories_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_categories_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_payments: {
        Row: {
          amount_paid: number
          fee_category_id: string | null
          id: string
          payment_date: string | null
          payment_method: string | null
          payment_reference: string | null
          receipt_no: string
          school_id: string
          student_id: string
        }
        Insert: {
          amount_paid: number
          fee_category_id?: string | null
          id?: string
          payment_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          receipt_no: string
          school_id: string
          student_id: string
        }
        Update: {
          amount_paid?: number
          fee_category_id?: string | null
          id?: string
          payment_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          receipt_no?: string
          school_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_payments_fee_category_id_fkey"
            columns: ["fee_category_id"]
            isOneToOne: false
            referencedRelation: "fee_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      grade_entries: {
        Row: {
          created_at: string
          grade: string
          grading_scale_id: string
          id: string
          label: string
          max_score: number
          min_score: number
          order_index: number
          points: number | null
        }
        Insert: {
          created_at?: string
          grade: string
          grading_scale_id: string
          id?: string
          label?: string
          max_score: number
          min_score: number
          order_index?: number
          points?: number | null
        }
        Update: {
          created_at?: string
          grade?: string
          grading_scale_id?: string
          id?: string
          label?: string
          max_score?: number
          min_score?: number
          order_index?: number
          points?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "grade_entries_grading_scale_id_fkey"
            columns: ["grading_scale_id"]
            isOneToOne: false
            referencedRelation: "grading_scales"
            referencedColumns: ["id"]
          },
        ]
      }
      grade_sub_entries: {
        Row: {
          grade_entry_id: string
          id: string
          max_score: number
          min_score: number
          order_index: number
          points: number | null
          sub_grade: string
        }
        Insert: {
          grade_entry_id: string
          id?: string
          max_score: number
          min_score: number
          order_index?: number
          points?: number | null
          sub_grade: string
        }
        Update: {
          grade_entry_id?: string
          id?: string
          max_score?: number
          min_score?: number
          order_index?: number
          points?: number | null
          sub_grade?: string
        }
        Relationships: [
          {
            foreignKeyName: "grade_sub_entries_grade_entry_id_fkey"
            columns: ["grade_entry_id"]
            isOneToOne: false
            referencedRelation: "grade_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      grading_scales: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          school_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          school_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grading_scales_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grading_scales_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
        ]
      }
      library_resources: {
        Row: {
          author: string | null
          available_copies: number | null
          category: string | null
          created_at: string
          file_url: string | null
          id: string
          resource_type: string | null
          school_id: string
          title: string
          total_copies: number | null
        }
        Insert: {
          author?: string | null
          available_copies?: number | null
          category?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          resource_type?: string | null
          school_id: string
          title: string
          total_copies?: number | null
        }
        Update: {
          author?: string | null
          available_copies?: number | null
          category?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          resource_type?: string | null
          school_id?: string
          title?: string
          total_copies?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "library_resources_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_resources_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
        ]
      }
      mcq_options: {
        Row: {
          id: string
          is_correct: boolean
          option_text: string
          question_id: string
        }
        Insert: {
          id?: string
          is_correct?: boolean
          option_text: string
          question_id: string
        }
        Update: {
          id?: string
          is_correct?: boolean
          option_text?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mcq_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "assessment_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      noticeboard: {
        Row: {
          content: string
          created_at: string
          expiry_date: string | null
          id: string
          is_active: boolean | null
          posted_by: string | null
          school_id: string
          target_role: string | null
          title: string
        }
        Insert: {
          content: string
          created_at?: string
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          posted_by?: string | null
          school_id: string
          target_role?: string | null
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          posted_by?: string | null
          school_id?: string
          target_role?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "noticeboard_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "noticeboard_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "noticeboard_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
        ]
      }
      parents: {
        Row: {
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          national_id: string | null
          occupation: string | null
          phone: string | null
          relationship: string | null
          school_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          first_name?: string
          id?: string
          last_name?: string
          national_id?: string | null
          occupation?: string | null
          phone?: string | null
          relationship?: string | null
          school_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          national_id?: string | null
          occupation?: string | null
          phone?: string | null
          relationship?: string | null
          school_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parents_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parents_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_upgrade_requests: {
        Row: {
          admin_notes: string | null
          current_plan_id: string | null
          id: string
          requested_at: string
          requested_billing_cycle: string
          requested_by: string
          requested_plan_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          school_id: string
          school_notes: string | null
          status: string
        }
        Insert: {
          admin_notes?: string | null
          current_plan_id?: string | null
          id?: string
          requested_at?: string
          requested_billing_cycle?: string
          requested_by: string
          requested_plan_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_id: string
          school_notes?: string | null
          status?: string
        }
        Update: {
          admin_notes?: string | null
          current_plan_id?: string | null
          id?: string
          requested_at?: string
          requested_billing_cycle?: string
          requested_by?: string
          requested_plan_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_id?: string
          school_notes?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_upgrade_requests_current_plan_id_fkey"
            columns: ["current_plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_upgrade_requests_requested_plan_id_fkey"
            columns: ["requested_plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_upgrade_requests_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_upgrade_requests_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          description: string | null
          features: Json | null
          id: string
          is_active: boolean
          max_students: number | null
          max_teachers: number | null
          name: string
          price_monthly: number
          price_yearly: number
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean
          max_students?: number | null
          max_teachers?: number | null
          name: string
          price_monthly?: number
          price_yearly?: number
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean
          max_students?: number | null
          max_teachers?: number | null
          name?: string
          price_monthly?: number
          price_yearly?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          adm_no: string | null
          class_id: string | null
          created_at: string
          dob: string | null
          first_name: string
          gender: string | null
          id: string
          is_active: boolean
          last_name: string
          passport_url: string | null
          phone: string | null
          role: string
          school_id: string
          stream_id: string | null
          updated_at: string
        }
        Insert: {
          adm_no?: string | null
          class_id?: string | null
          created_at?: string
          dob?: string | null
          first_name?: string
          gender?: string | null
          id: string
          is_active?: boolean
          last_name?: string
          passport_url?: string | null
          phone?: string | null
          role?: string
          school_id: string
          stream_id?: string | null
          updated_at?: string
        }
        Update: {
          adm_no?: string | null
          class_id?: string | null
          created_at?: string
          dob?: string | null
          first_name?: string
          gender?: string | null
          id?: string
          is_active?: boolean
          last_name?: string
          passport_url?: string | null
          phone?: string | null
          role?: string
          school_id?: string
          stream_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_admin_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          first_name: string
          id: string
          last_name: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      school_subscriptions: {
        Row: {
          billing_cycle: string
          created_at: string
          expires_at: string | null
          id: string
          plan_id: string
          school_id: string
          starts_at: string
          status: string
          updated_at: string
        }
        Insert: {
          billing_cycle?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          plan_id: string
          school_id: string
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          plan_id?: string
          school_id?: string
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_subscriptions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_subscriptions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          address: string | null
          email: string | null
          id: string
          is_active: boolean
          is_setup_complete: boolean
          location: string | null
          logo_url: string | null
          moto: string | null
          phone: string | null
          registration_date: string
          school_name: string
          slug: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          is_setup_complete?: boolean
          location?: string | null
          logo_url?: string | null
          moto?: string | null
          phone?: string | null
          registration_date?: string
          school_name: string
          slug?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          is_setup_complete?: boolean
          location?: string | null
          logo_url?: string | null
          moto?: string | null
          phone?: string | null
          registration_date?: string
          school_name?: string
          slug?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      strand_assessment_evidence: {
        Row: {
          file_name: string
          file_type: string | null
          file_url: string
          id: string
          strand_assessment_id: string
          uploaded_at: string
        }
        Insert: {
          file_name?: string
          file_type?: string | null
          file_url: string
          id?: string
          strand_assessment_id: string
          uploaded_at?: string
        }
        Update: {
          file_name?: string
          file_type?: string | null
          file_url?: string
          id?: string
          strand_assessment_id?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "strand_assessment_evidence_strand_assessment_id_fkey"
            columns: ["strand_assessment_id"]
            isOneToOne: false
            referencedRelation: "strand_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      strand_assessments: {
        Row: {
          academic_year: string | null
          comments: string | null
          created_at: string
          curriculum_design_id: string | null
          id: string
          rating: string
          school_id: string
          strand: string
          stream_id: string
          student_id: string
          sub_strand: string
          subject_id: string
          teacher_id: string
          term: string | null
          updated_at: string
        }
        Insert: {
          academic_year?: string | null
          comments?: string | null
          created_at?: string
          curriculum_design_id?: string | null
          id?: string
          rating?: string
          school_id: string
          strand?: string
          stream_id: string
          student_id: string
          sub_strand?: string
          subject_id: string
          teacher_id: string
          term?: string | null
          updated_at?: string
        }
        Update: {
          academic_year?: string | null
          comments?: string | null
          created_at?: string
          curriculum_design_id?: string | null
          id?: string
          rating?: string
          school_id?: string
          strand?: string
          stream_id?: string
          student_id?: string
          sub_strand?: string
          subject_id?: string
          teacher_id?: string
          term?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "strand_assessments_curriculum_design_id_fkey"
            columns: ["curriculum_design_id"]
            isOneToOne: false
            referencedRelation: "curriculum_designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strand_assessments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strand_assessments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strand_assessments_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strand_assessments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strand_assessments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strand_assessments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      streams: {
        Row: {
          capacity: number | null
          class_id: string
          class_teacher_id: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          school_id: string
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          class_id: string
          class_teacher_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          school_id: string
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          class_id?: string
          class_teacher_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "streams_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "streams_class_teacher_id_fkey"
            columns: ["class_teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "streams_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "streams_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
        ]
      }
      student_competencies: {
        Row: {
          academic_year: string | null
          competency: string
          id: string
          rated_by: string | null
          rating: string
          school_id: string
          student_id: string
          term: string | null
          updated_at: string
        }
        Insert: {
          academic_year?: string | null
          competency: string
          id?: string
          rated_by?: string | null
          rating?: string
          school_id: string
          student_id: string
          term?: string | null
          updated_at?: string
        }
        Update: {
          academic_year?: string | null
          competency?: string
          id?: string
          rated_by?: string | null
          rating?: string
          school_id?: string
          student_id?: string
          term?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_competencies_rated_by_fkey"
            columns: ["rated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_competencies_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_competencies_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_competencies_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_exam_answers: {
        Row: {
          answer_text: string | null
          assessment_id: string
          id: string
          is_correct: boolean | null
          question_id: string
          selected_option_id: string | null
          started_at: string | null
          student_id: string
          submitted_at: string | null
        }
        Insert: {
          answer_text?: string | null
          assessment_id: string
          id?: string
          is_correct?: boolean | null
          question_id: string
          selected_option_id?: string | null
          started_at?: string | null
          student_id: string
          submitted_at?: string | null
        }
        Update: {
          answer_text?: string | null
          assessment_id?: string
          id?: string
          is_correct?: boolean | null
          question_id?: string
          selected_option_id?: string | null
          started_at?: string | null
          student_id?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_exam_answers_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_exam_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "assessment_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_exam_answers_selected_option_id_fkey"
            columns: ["selected_option_id"]
            isOneToOne: false
            referencedRelation: "mcq_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_exam_answers_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_exam_sessions: {
        Row: {
          assessment_id: string
          auto_submitted: boolean | null
          id: string
          score: number | null
          started_at: string
          student_id: string
          submitted_at: string | null
        }
        Insert: {
          assessment_id: string
          auto_submitted?: boolean | null
          id?: string
          score?: number | null
          started_at?: string
          student_id: string
          submitted_at?: string | null
        }
        Update: {
          assessment_id?: string
          auto_submitted?: boolean | null
          id?: string
          score?: number | null
          started_at?: string
          student_id?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_exam_sessions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_exam_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_parents: {
        Row: {
          id: string
          parent_id: string
          student_profile_id: string
        }
        Insert: {
          id?: string
          parent_id: string
          student_profile_id: string
        }
        Update: {
          id?: string
          parent_id?: string
          student_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_parents_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_parents_student_profile_id_fkey"
            columns: ["student_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_transfers: {
        Row: {
          admin_comments: string | null
          cancelled_at: string | null
          class_teacher_id: string | null
          completed_at: string | null
          created_at: string
          destination_school: string | null
          discipline_summary: Json | null
          exam_summary: Json | null
          fee_balance: number | null
          id: string
          initiated_at: string
          initiated_by: string
          reason: string | null
          school_id: string
          status: string
          student_id: string
          teacher_comments: string | null
          teacher_reviewed_at: string | null
          updated_at: string
        }
        Insert: {
          admin_comments?: string | null
          cancelled_at?: string | null
          class_teacher_id?: string | null
          completed_at?: string | null
          created_at?: string
          destination_school?: string | null
          discipline_summary?: Json | null
          exam_summary?: Json | null
          fee_balance?: number | null
          id?: string
          initiated_at?: string
          initiated_by: string
          reason?: string | null
          school_id: string
          status?: string
          student_id: string
          teacher_comments?: string | null
          teacher_reviewed_at?: string | null
          updated_at?: string
        }
        Update: {
          admin_comments?: string | null
          cancelled_at?: string | null
          class_teacher_id?: string | null
          completed_at?: string | null
          created_at?: string
          destination_school?: string | null
          discipline_summary?: Json | null
          exam_summary?: Json | null
          fee_balance?: number | null
          id?: string
          initiated_at?: string
          initiated_by?: string
          reason?: string | null
          school_id?: string
          status?: string
          student_id?: string
          teacher_comments?: string | null
          teacher_reviewed_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_transfers_class_teacher_id_fkey"
            columns: ["class_teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_transfers_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_transfers_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_transfers_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_transfers_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_demand: {
        Row: {
          academic_year: string | null
          id: string
          is_core_daily: boolean
          periods_per_week: number
          school_id: string
          stream_id: string
          subject_id: string
          term: string | null
        }
        Insert: {
          academic_year?: string | null
          id?: string
          is_core_daily?: boolean
          periods_per_week?: number
          school_id: string
          stream_id: string
          subject_id: string
          term?: string | null
        }
        Update: {
          academic_year?: string | null
          id?: string
          is_core_daily?: boolean
          periods_per_week?: number
          school_id?: string
          stream_id?: string
          subject_id?: string
          term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subject_demand_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_demand_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_demand_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_demand_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_papers: {
        Row: {
          class_id: string | null
          created_at: string
          default_out_of: number
          id: string
          is_active: boolean
          paper_name: string
          school_id: string
          subject_id: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          default_out_of?: number
          id?: string
          is_active?: boolean
          paper_name: string
          school_id: string
          subject_id: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          default_out_of?: number
          id?: string
          is_active?: boolean
          paper_name?: string
          school_id?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subject_papers_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_papers_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_papers_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_papers_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_teacher_allocations: {
        Row: {
          academic_year: string | null
          created_at: string
          id: string
          is_active: boolean
          school_id: string
          stream_id: string
          subject_id: string
          teacher_id: string
          term: string | null
        }
        Insert: {
          academic_year?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          school_id: string
          stream_id: string
          subject_id: string
          teacher_id: string
          term?: string | null
        }
        Update: {
          academic_year?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          school_id?: string
          stream_id?: string
          subject_id?: string
          teacher_id?: string
          term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subject_teacher_allocations_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_teacher_allocations_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_teacher_allocations_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_teacher_allocations_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_teacher_allocations_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          category: string | null
          code: string | null
          created_at: string
          id: string
          is_active: boolean
          is_national: boolean
          level: string | null
          name: string
          school_id: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_national?: boolean
          level?: string | null
          name: string
          school_id?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_national?: boolean
          level?: string | null
          name?: string
          school_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subjects_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          admin_response: string | null
          category: string
          created_at: string
          id: string
          message: string
          priority: string
          responded_at: string | null
          responded_by: string | null
          school_id: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          category?: string
          created_at?: string
          id?: string
          message: string
          priority?: string
          responded_at?: string | null
          responded_by?: string | null
          school_id?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          category?: string
          created_at?: string
          id?: string
          message?: string
          priority?: string
          responded_at?: string | null
          responded_by?: string | null
          school_id?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      timetable_periods: {
        Row: {
          break_label: string | null
          created_at: string
          end_time: string
          id: string
          is_break: boolean
          period_number: number
          school_id: string
          start_time: string
        }
        Insert: {
          break_label?: string | null
          created_at?: string
          end_time: string
          id?: string
          is_break?: boolean
          period_number: number
          school_id: string
          start_time: string
        }
        Update: {
          break_label?: string | null
          created_at?: string
          end_time?: string
          id?: string
          is_break?: boolean
          period_number?: number
          school_id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "timetable_periods_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_periods_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_slots: {
        Row: {
          academic_year: string | null
          created_at: string
          day_of_week: string
          id: string
          period_id: string
          school_id: string
          stream_id: string
          subject_id: string
          teacher_id: string
          term: string | null
        }
        Insert: {
          academic_year?: string | null
          created_at?: string
          day_of_week: string
          id?: string
          period_id: string
          school_id: string
          stream_id: string
          subject_id: string
          teacher_id: string
          term?: string | null
        }
        Update: {
          academic_year?: string | null
          created_at?: string
          day_of_week?: string
          id?: string
          period_id?: string
          school_id?: string
          stream_id?: string
          subject_id?: string
          teacher_id?: string
          term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timetable_slots_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "timetable_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_slots_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_slots_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_slots_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_slots_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_slots_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transfer_history_log: {
        Row: {
          action: string
          comments: string | null
          created_at: string
          id: string
          performed_by: string | null
          transfer_id: string
        }
        Insert: {
          action: string
          comments?: string | null
          created_at?: string
          id?: string
          performed_by?: string | null
          transfer_id: string
        }
        Update: {
          action?: string
          comments?: string | null
          created_at?: string
          id?: string
          performed_by?: string | null
          transfer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfer_history_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_history_log_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "student_transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          school_id: string | null
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          school_id?: string | null
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          school_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools_public"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      schools_public: {
        Row: {
          id: string | null
          is_active: boolean | null
          logo_url: string | null
          moto: string | null
          school_name: string | null
          slug: string | null
        }
        Insert: {
          id?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          moto?: string | null
          school_name?: string | null
          slug?: string | null
        }
        Update: {
          id?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          moto?: string | null
          school_name?: string | null
          slug?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      auto_suspend_expired_schools: { Args: never; Returns: number }
      get_mcq_options_for_student: {
        Args: { p_assessment_id: string }
        Returns: {
          id: string
          option_text: string
          question_id: string
        }[]
      }
      get_user_role_text: { Args: never; Returns: string }
      get_user_school_id: { Args: never; Returns: string }
      grade_mcq_exam: {
        Args: {
          p_assessment_id: string
          p_is_auto?: boolean
          p_session_id: string
        }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "saas_admin" | "school_admin" | "teacher" | "parent" | "student"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["saas_admin", "school_admin", "teacher", "parent", "student"],
    },
  },
} as const
