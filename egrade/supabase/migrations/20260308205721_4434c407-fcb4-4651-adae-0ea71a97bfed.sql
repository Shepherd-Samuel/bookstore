
-- Create a server-side function to grade MCQ exams securely
CREATE OR REPLACE FUNCTION public.grade_mcq_exam(
  p_session_id uuid,
  p_assessment_id uuid,
  p_is_auto boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
  v_total_score numeric := 0;
  v_question record;
  v_submitted_at timestamptz;
BEGIN
  -- Verify the session belongs to the calling user
  SELECT student_id, submitted_at INTO v_student_id, v_submitted_at
  FROM student_exam_sessions
  WHERE id = p_session_id AND assessment_id = p_assessment_id;

  IF v_student_id IS NULL OR v_student_id != auth.uid() THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;

  IF v_submitted_at IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'Already submitted');
  END IF;

  -- Grade each MCQ question
  FOR v_question IN
    SELECT aq.id as question_id, aq.marks, sea.selected_option_id
    FROM assessment_questions aq
    LEFT JOIN student_exam_answers sea ON sea.question_id = aq.id 
      AND sea.student_id = v_student_id AND sea.assessment_id = p_assessment_id
    WHERE aq.assessment_id = p_assessment_id AND aq.question_type = 'MCQ'
  LOOP
    IF v_question.selected_option_id IS NOT NULL THEN
      IF EXISTS (
        SELECT 1 FROM mcq_options 
        WHERE id = v_question.selected_option_id AND is_correct = true
      ) THEN
        v_total_score := v_total_score + v_question.marks;
        UPDATE student_exam_answers 
        SET is_correct = true 
        WHERE assessment_id = p_assessment_id 
          AND question_id = v_question.question_id 
          AND student_id = v_student_id;
      ELSE
        UPDATE student_exam_answers 
        SET is_correct = false 
        WHERE assessment_id = p_assessment_id 
          AND question_id = v_question.question_id 
          AND student_id = v_student_id;
      END IF;
    END IF;
  END LOOP;

  -- Update session
  UPDATE student_exam_sessions 
  SET submitted_at = now(), auto_submitted = p_is_auto, score = v_total_score
  WHERE id = p_session_id;

  -- Upsert assessment_scores
  INSERT INTO assessment_scores (assessment_id, student_id, score, graded_at)
  VALUES (p_assessment_id, v_student_id, v_total_score, now())
  ON CONFLICT (assessment_id, student_id) 
  DO UPDATE SET score = v_total_score, graded_at = now();

  RETURN jsonb_build_object('score', v_total_score, 'success', true);
END;
$$;
