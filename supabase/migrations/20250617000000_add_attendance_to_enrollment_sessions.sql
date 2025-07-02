-- Add attendance column to enrollment_sessions table
-- This will store attendance records as JSONB array with date and attendance status

ALTER TABLE enrollment_sessions 
ADD COLUMN attendance JSONB DEFAULT '[]'::jsonb;

-- Add comment to explain the structure
COMMENT ON COLUMN enrollment_sessions.attendance IS 'JSONB array storing attendance records. Format: [{"date": "YYYY-MM-DD", "status": "present"|"absent"|"late", "marked_by": "instructor_id", "marked_at": "timestamp"}]';

-- Add index for better query performance on attendance data
CREATE INDEX idx_enrollment_sessions_attendance ON enrollment_sessions USING GIN (attendance);

-- Add RLS policy for attendance management
CREATE POLICY "Instructors can update attendance for their sessions"
  ON enrollment_sessions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = enrollment_sessions.session_id 
      AND sessions.instructor_id = (
        SELECT id FROM instructors WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = enrollment_sessions.session_id 
      AND sessions.instructor_id = (
        SELECT id FROM instructors WHERE user_id = auth.uid()
      )
    )
  ); 