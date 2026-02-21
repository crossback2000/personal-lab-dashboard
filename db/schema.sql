create table if not exists tests (
  id text primary key,
  name_en text not null unique,
  name_ko text,
  category text not null default 'other',
  unit_default text,
  created_at text not null,
  updated_at text not null,
  check (category in ('general_blood', 'chemistry', 'coagulation', 'urinalysis', 'other'))
);

create table if not exists observations (
  id text primary key,
  test_id text not null references tests(id) on delete cascade,
  observed_at text not null,
  value_numeric real,
  value_text text,
  unit text,
  ref_low real,
  ref_high real,
  flag text,
  raw_row text,
  created_at text not null,
  updated_at text not null,
  check (value_numeric is not null or value_text is not null),
  check (flag in ('H', 'L') or flag is null),
  unique (test_id, observed_at)
);

create index if not exists idx_tests_category on tests(category, name_ko, name_en);
create index if not exists idx_observations_test_date on observations(test_id, observed_at desc);
