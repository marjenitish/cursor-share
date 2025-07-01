-- Add cancelled_dates column to enrollment_sessions table
ALTER TABLE enrollment_sessions
ADD COLUMN cancelled_dates JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN enrollment_sessions.cancelled_dates IS 'Array of objects: {date, reason, medical_certificate_url, status, requested_at} for participant cancellation requests. Status can be: pending, approved, rejected.'; 