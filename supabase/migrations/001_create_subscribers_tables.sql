-- Create schema for portfolio-blog (isolated from open-brain)
create schema if not exists portfolio_blog;

-- Create subscribers table (PORTFOLIO-BLOG ONLY - NOT SHARED WITH OPEN-BRAIN)
create table if not exists portfolio_blog.subscribers (
  id uuid default gen_random_uuid() primary key,
  email text not null unique,
  created_at timestamp with time zone default now() not null,
  verified boolean default true not null,
  unsubscribe_token text not null unique,

  constraint email_not_empty check (email != ''),
  constraint unsubscribe_token_not_empty check (unsubscribe_token != '')
);

-- Create newsletter_sends audit log table (PORTFOLIO-BLOG ONLY)
create table if not exists portfolio_blog.newsletter_sends (
  id uuid default gen_random_uuid() primary key,
  post_ids text not null,
  post_count integer not null,
  sent_at timestamp with time zone not null,
  subscriber_count integer not null,
  provider text not null,
  status text not null check (status in ('sent', 'failed')),

  constraint post_count_positive check (post_count > 0),
  constraint subscriber_count_non_negative check (subscriber_count >= 0)
);

-- Create indices for query performance
create index if not exists idx_subscribers_verified on portfolio_blog.subscribers(verified);
create index if not exists idx_subscribers_email on portfolio_blog.subscribers(email);
create index if not exists idx_newsletter_sends_sent_at on portfolio_blog.newsletter_sends(sent_at desc);

-- Enable RLS on both tables (default: DENY ALL)
alter table portfolio_blog.subscribers enable row level security;
alter table portfolio_blog.newsletter_sends enable row level security;

-- RLS Policy: Public can INSERT ONLY for signup (no reads/updates/deletes)
-- Used by: POST /api/subscribe
create policy "portfolio_public_subscribe" on portfolio_blog.subscribers
  for insert
  with check (true);

-- RLS Policy: Service role ONLY can select/update/delete subscribers
-- Used by: GET /api/unsubscribe (delete) and POST /api/send-newsletter (select)
-- This blocks ANY query not using the service role key
create policy "portfolio_service_role_all_subscribers" on portfolio_blog.subscribers
  for all
  using (auth.role() = 'service_role');

-- RLS Policy: Service role ONLY can read/write newsletter_sends audit log
-- Used by: POST /api/send-newsletter (select + insert)
create policy "portfolio_service_role_all_sends" on portfolio_blog.newsletter_sends
  for all
  using (auth.role() = 'service_role');

-- Prevent any open-brain queries from accessing subscriber data
-- by putting it in a separate schema (portfolio_blog)
-- open-brain queries default to public schema only
