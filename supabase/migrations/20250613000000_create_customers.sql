create table public.customers (
  id uuid not null default gen_random_uuid (),
  surname text not null,
  first_name text not null,
  street_number text null,
  street_name text null,
  suburb text null,
  post_code text null,
  contact_no text null,
  email text null,
  country_of_birth text null,
  date_of_birth date null,
  work_mobile text null,
  paq_form boolean null default false,
  australian_citizen boolean null,
  language_other_than_english text null,
  english_proficiency text null,
  indigenous_status text null,
  reason_for_class text null,
  how_did_you_hear text null,
  occupation text null,
  next_of_kin_name text null,
  next_of_kin_relationship text null,
  next_of_kin_mobile text null,
  next_of_kin_phone text null,
  equipment_purchased text[] null,
  status text null default 'Active'::text,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  user_id uuid null,
  customer_credit integer null default 0,
  paq_document_url text null,
  paq_filled_date timestamp without time zone null,
  paq_status character varying null,
  constraint customers_pkey primary key (id),
  constraint customers_user_id_fkey foreign KEY (user_id) references users (id),
  constraint customers_english_proficiency_check check (
    (
      english_proficiency = any (
        array[
          'Very Well'::text,
          'Well'::text,
          'Not Well'::text,
          'Not at All'::text
        ]
      )
    )
  ),
  constraint customers_indigenous_status_check check (
    (
      indigenous_status = any (
        array[
          'Yes'::text,
          'No'::text,
          'Prefer not to say'::text
        ]
      )
    )
  ),
  constraint customers_status_check check (
    (
      status = any (array['Active'::text, 'Inactive'::text])
    )
  )
) TABLESPACE pg_default;

create index IF not exists customers_user_id_idx on public.customers using btree (user_id) TABLESPACE pg_default;