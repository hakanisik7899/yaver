-- Calls Yaver's notification check every 5 minutes (Vercel Hobby cron is
-- daily only). The CRON_SECRET lives in Supabase Vault, never in this file.
--
-- BEFORE running this file, run once in the SQL editor with the real value
-- from .env.local (do not save it anywhere else):
--   select vault.create_secret('<CRON_SECRET değeri>', 'yaver_cron_secret');

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'yaver-notify',
  '*/5 * * * *',
  $$
  select net.http_get(
    url := 'https://yaver-six.vercel.app/api/cron/notify',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'yaver_cron_secret')
    ),
    timeout_milliseconds := 60000
  );
  $$
);

-- To stop it:   select cron.unschedule('yaver-notify');
-- Recent runs:  select * from cron.job_run_details order by start_time desc limit 10;
-- HTTP results: select status_code, content from net._http_response order by created desc limit 10;
