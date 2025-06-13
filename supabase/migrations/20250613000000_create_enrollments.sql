create table public.enrollments (
  id uuid not null default gen_random_uuid (),
  customer_id uuid null,
  enrollment_type text not null,
  status text not null default 'pending'::text,
  payment_status text not null default 'pending'::text,
  payment_intent text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint enrollments_pkey primary key (id),
  constraint enrollments_customer_id_fkey foreign KEY (customer_id) references customers (id),
  constraint enrollments_enrollment_type_check check (
    (
      enrollment_type = any (array['trial'::text, 'direct'::text])
    )
  ),
  constraint enrollments_payment_status_check check (
    (
      payment_status = any (
        array['pending'::text, 'paid'::text, 'refunded'::text]
      )
    )
  ),
  constraint enrollments_status_check check (
    (
      status = any (
        array[
          'pending'::text,
          'active'::text,
          'completed'::text,
          'cancelled'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;