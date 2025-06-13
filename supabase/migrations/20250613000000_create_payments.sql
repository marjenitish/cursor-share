create table public.payments (
  id uuid not null default gen_random_uuid (),
  enrollment_id uuid not null,
  amount numeric(10, 2) not null,
  payment_method text not null,
  payment_status text not null default 'pending'::text,
  transaction_id text null,
  receipt_number text not null,
  payment_date timestamp with time zone not null default now(),
  notes text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint payments_pkey primary key (id),
  constraint payments_receipt_number_key unique (receipt_number),
  constraint payments_enrollment_id_fkey foreign KEY (enrollment_id) references enrollments (id),
  constraint payments_payment_method_check check (
    (
      payment_method = any (
        array[
          'stripe'::text,
          'cash'::text,
          'cheque'::text,
          'card'::text
        ]
      )
    )
  ),
  constraint payments_payment_status_check check (
    (
      payment_status = any (
        array[
          'pending'::text,
          'completed'::text,
          'failed'::text,
          'refunded'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;