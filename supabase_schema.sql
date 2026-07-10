-- Louis Smart — Supabase schema
-- Run this in Supabase Dashboard → SQL Editor → New query

-- Chats table
create table if not exists public.chats (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New Chat',
  last_message text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chats_user_id_updated_at_idx
  on public.chats (user_id, updated_at desc);

-- Messages table
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null default '',
  attachments jsonb not null default '[]'::jsonb,
  "timestamp" timestamptz not null default now()
);

create index if not exists messages_chat_id_timestamp_idx
  on public.messages (chat_id, "timestamp" asc);

-- Row Level Security: users can only touch their own chats / messages in their own chats
alter table public.chats enable row level security;
alter table public.messages enable row level security;

create policy "Users manage their own chats"
  on public.chats
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage messages in their own chats"
  on public.messages
  for all
  using (exists (select 1 from public.chats c where c.id = chat_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.chats c where c.id = chat_id and c.user_id = auth.uid()));

-- Enable Realtime on both tables (Supabase Dashboard → Database → Replication
-- also has a toggle for this; running this covers it via SQL too)
alter publication supabase_realtime add table public.chats;
alter publication supabase_realtime add table public.messages;

-- Storage bucket for chat image uploads
insert into storage.buckets (id, name, public)
values ('chat-uploads', 'chat-uploads', true)
on conflict (id) do nothing;

create policy "Authenticated users can upload their own chat images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'chat-uploads' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Anyone can view chat images"
  on storage.objects for select
  using (bucket_id = 'chat-uploads');
