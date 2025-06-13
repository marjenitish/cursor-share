create table public.exercise_types (
  id uuid not null default gen_random_uuid (),
  name text not null,
  description text null,
  what_to_bring text[] null,
  duration interval not null,
  cost numeric(10, 2) not null default 0.00,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  image_link text null,
  constraint exercise_types_pkey primary key (id)
) TABLESPACE pg_default;