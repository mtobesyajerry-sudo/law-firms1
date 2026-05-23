/*
  # Enable pg_cron and pg_net extensions

  Enables two extensions required for scheduled HTTP calls from the database:
  - pg_cron: Job scheduler that runs SQL on a cron schedule
  - pg_net: Async HTTP client used by pg_cron to POST to edge functions

  Both are available on this Supabase project tier (confirmed via list_extensions).
  pg_cron installs into the `cron` schema automatically.
  pg_net uses the `extensions` schema as fallback when `net` doesn't exist yet.
*/

create extension if not exists pg_cron cascade;
create extension if not exists pg_net  cascade;

grant usage on schema cron to postgres;
