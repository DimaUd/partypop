-- PartyPop schema v2 — multi-city / multi-operator / multi-level ambassadors

create table if not exists cities (
  id uuid primary key default gen_random_uuid(),
  name text not null
);

create table if not exists operators (
  id uuid primary key default gen_random_uuid(),
  city_id uuid references cities(id),
  name text not null,
  phone text,
  created_at timestamptz default now()
);

create table if not exists packages (
  id text primary key,
  name text not null,
  emoji text default '🍭',
  price numeric not null,
  "desc" text default '',
  popular boolean default false,
  active boolean default true,
  operator_id uuid references operators(id),
  created_at timestamptz default now()
);

create table if not exists ambassadors (
  slug text primary key,
  name text,
  phone text,
  parent_slug text references ambassadors(slug),  -- ambassador-of-ambassador tree
  created_at timestamptz default now()
);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  pack_id text,
  pack_name text,
  price numeric default 0,
  event_date date not null,
  event_hour text,
  address text not null,
  guests int default 0,
  customer_name text not null,
  customer_phone text not null,
  has_power boolean default true,
  has_parking boolean default true,
  notes text,
  ambassador_slug text,
  operator_id uuid references operators(id),
  payment_method text default 'bit',          -- bit | cash | kashcash
  social_optin boolean default false,          -- customer promised to film + tag on social
  social_verified boolean default false,       -- admin verified the tag → discount applied
  discount numeric default 0,                  -- e.g. 30 for verified social tag
  addons jsonb default '[]',                   -- partner add-on ids (collaborations)
  addons_total numeric default 0,              -- sum of add-on prices (platform takes 15%)
  gallery jsonb default '[]',                  -- PartyPop Moments: up to 10 event photos (move to Supabase Storage at scale)
  deposit_paid boolean default false,          -- ₪100 deposit confirmed by admin
  status text default 'pending',   -- pending → confirmed → completed_paid | cancelled
  created_at timestamptz default now()
);

-- Commissions: created ONLY when a booking transitions to completed_paid.
-- level 1 = direct ambassador (30₪), level 2 = their recruiter (10₪).
create table if not exists rewards (
  id uuid primary key default gen_random_uuid(),
  ambassador_slug text not null,
  booking_id uuid references bookings(id),
  amount numeric not null,
  level int default 1,
  approved boolean default true,
  paid boolean default false,
  created_at timestamptz default now()
);

create index if not exists bookings_date_idx on bookings(event_date);
create index if not exists bookings_amb_idx on bookings(ambassador_slug);
create index if not exists rewards_amb_idx on rewards(ambassador_slug);
create index if not exists ambassadors_parent_idx on ambassadors(parent_slug);

-- Seed packages
insert into packages (id, name, emoji, price, "desc", popular) values
  ('basic', 'צמר גפן בסיסי', '🍭', 350, 'שעה אחת · עד 25 מנות · מפעיל מקצועי', false),
  ('party', 'מסיבה מתוקה', '🎉', 550, 'שעתיים · עד 50 מנות · צבעים וטעמים', true),
  ('mega', 'מגה אירוע', '👑', 850, '3 שעות · ללא הגבלה · עמדה מעוצבת + תאורה', false)
on conflict (id) do nothing;
