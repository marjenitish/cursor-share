-- Add cancelled_classes column to sessions table
ALTER TABLE sessions
ADD COLUMN cancelled_classes JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN sessions.cancelled_classes IS 'Array of objects: {date, reason, cancelled_by} for per-date class cancellations.'; 