create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'viewer' check (role in ('viewer', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  location text not null,
  event_date text not null,
  description text not null,
  cover_url text,
  is_published boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.event_videos (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  title text not null,
  video_url text not null,
  description text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.event_testimonials (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  role text,
  quote text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.event_videos enable row level security;
alter table public.event_testimonials enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

drop policy if exists "profiles own read" on public.profiles;
create policy "profiles own read"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists "events public read" on public.events;
create policy "events public read"
on public.events for select
to anon, authenticated
using (is_published = true);

drop policy if exists "events admin write" on public.events;
create policy "events admin write"
on public.events for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "videos public read" on public.event_videos;
create policy "videos public read"
on public.event_videos for select
to anon, authenticated
using (
  exists (
    select 1
    from public.events
    where events.id = event_videos.event_id
      and events.is_published = true
  )
);

drop policy if exists "videos admin write" on public.event_videos;
create policy "videos admin write"
on public.event_videos for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "testimonials public read" on public.event_testimonials;
create policy "testimonials public read"
on public.event_testimonials for select
to anon, authenticated
using (
  exists (
    select 1
    from public.events
    where events.id = event_testimonials.event_id
      and events.is_published = true
  )
);

drop policy if exists "testimonials admin write" on public.event_testimonials;
create policy "testimonials admin write"
on public.event_testimonials for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into storage.buckets (id, name, public)
values ('event-videos', 'event-videos', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "event videos public read" on storage.objects;
create policy "event videos public read"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'event-videos');

drop policy if exists "event videos admin upload" on storage.objects;
create policy "event videos admin upload"
on storage.objects for insert
to authenticated
with check (bucket_id = 'event-videos' and public.is_admin());

drop policy if exists "event videos admin update" on storage.objects;
create policy "event videos admin update"
on storage.objects for update
to authenticated
using (bucket_id = 'event-videos' and public.is_admin())
with check (bucket_id = 'event-videos' and public.is_admin());

drop policy if exists "event videos admin delete" on storage.objects;
create policy "event videos admin delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'event-videos' and public.is_admin());
