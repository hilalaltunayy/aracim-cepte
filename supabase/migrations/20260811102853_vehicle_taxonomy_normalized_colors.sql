-- TASK-018: extend the existing vehicle body taxonomy without rewriting legacy rows.
alter type public.body_type add value if not exists 'sedan';
alter type public.body_type add value if not exists 'hatchback';
alter type public.body_type add value if not exists 'crossover';
alter type public.body_type add value if not exists 'suv';
alter type public.body_type add value if not exists 'station_wagon';
alter type public.body_type add value if not exists 'coupe';
alter type public.body_type add value if not exists 'cabrio';
alter type public.body_type add value if not exists 'roadster';
alter type public.body_type add value if not exists 'pickup';
alter type public.body_type add value if not exists 'mpv_minivan';
alter type public.body_type add value if not exists 'van';
alter type public.body_type add value if not exists 'sports_car';
alter type public.body_type add value if not exists 'campervan';
alter type public.body_type add value if not exists 'minibus';

alter table public.vehicles
  add column if not exists color_id text null;

alter table public.vehicles
  drop constraint if exists vehicles_color_id_check;

alter table public.vehicles
  add constraint vehicles_color_id_check check (
    color_id is null or color_id in (
      'white', 'black', 'gray', 'silver', 'red', 'blue',
      'green', 'brown', 'beige', 'gold', 'yellow', 'orange'
    )
  );

comment on column public.vehicles.color_id is
  'Normalized vehicle color token. Legacy free-text color remains in color until a normal vehicle save selects a catalog color.';
