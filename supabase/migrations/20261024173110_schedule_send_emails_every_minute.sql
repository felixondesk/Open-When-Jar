-- The publishable key is public (it ships in the browser bundle), so it is safe to store here.
select cron.schedule(
  'send-emails',
  '* * * * *',
  $$select net.http_post(
    url := 'https://saplipdgsbpwlgxyhxjg.supabase.co/functions/v1/send-emails',
    headers := '{"apikey": "sb_publishable_7CfvT33VYkbCtw_UBYMyeg_plScFww7", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  )$$
);
