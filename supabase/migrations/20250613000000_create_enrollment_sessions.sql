create table public.enrollment_sessions (
  id uuid not null default gen_random_uuid (),
  enrollment_id uuid not null,
  session_id uuid not null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  booking_date date not null,
  is_free_trial boolean not null default false,
  cancellation_reason text null,
  medical_certificate_url text null,
  cancellation_status text null,
  admin_notes text null,
  trial_date date null,
  partial_dates jsonb null,
  enrollment_type character varying null,
  constraint enrollment_sessions_pkey primary key (id),
  constraint enrollment_sessions_enrollment_id_fkey foreign KEY (enrollment_id) references enrollments (id),
  constraint enrollment_sessions_session_id_fkey foreign KEY (session_id) references sessions (id),
  constraint enrollment_sessions_cancellation_status_check check (
    (
      cancellation_status = any (
        array[
          'pending'::text,
          'accepted'::text,
          'rejected'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;