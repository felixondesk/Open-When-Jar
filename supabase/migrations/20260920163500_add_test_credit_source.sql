-- Keep non-billable QA entitlements distinct from real paid credits.
alter type public.credit_source add value if not exists 'test';
