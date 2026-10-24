-- Keeps scheduler history from growing forever. Runs daily at 03:00 UTC.
select cron.schedule(
  'prune-scheduler-logs',
  '0 3 * * *',
  $$
    delete from cron.job_run_details where end_time < now() - interval '7 days';
    delete from net._http_response where created < now() - interval '3 days';
  $$
);
