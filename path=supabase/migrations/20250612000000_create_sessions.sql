-- Create sessions table
CREATE TABLE public.sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL,
  venue_id uuid NOT NULL REFERENCES venues(id), -- Changed from venue/address to venue_id
  instructor_id uuid NOT NULL,
  fee_criteria text NOT NULL,
  term text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  fee_amount numeric(10, 2) NOT NULL DEFAULT 0.00,
  exercise_type_id uuid,
  term_id bigint REFERENCES terms(id),
  zip_code text,
  day_of_week text NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone,
  is_subsidised boolean DEFAULT false,
  class_capacity bigint,
  CONSTRAINT sessions_pkey PRIMARY KEY (id),
  CONSTRAINT sessions_exercise_type_id_fkey FOREIGN KEY (exercise_type_id) REFERENCES exercise_types(id),
  CONSTRAINT sessions_instructor_id_fkey FOREIGN KEY (instructor_id) REFERENCES instructors(id),
  CONSTRAINT sessions_venue_id_fkey FOREIGN KEY (venue_id) REFERENCES venues(id),
  CONSTRAINT sessions_day_of_week_check CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'))
);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER set_timestamp
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

-- Create indexes for common queries
CREATE INDEX idx_sessions_term_id ON sessions(term_id);
CREATE INDEX idx_sessions_instructor_id ON sessions(instructor_id);
CREATE INDEX idx_sessions_exercise_type_id ON sessions(exercise_type_id);
CREATE INDEX idx_sessions_venue_id ON sessions(venue_id);