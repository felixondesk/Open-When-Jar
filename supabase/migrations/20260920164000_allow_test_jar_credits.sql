-- Test credits are explicitly non-billable, have no provider order, and remain
-- bound to the same recipient limits as their corresponding paid jar sizes.
alter table public.jar_credits drop constraint jar_credits_known_plan;
alter table public.jar_credits drop constraint jar_credits_paid_order;

alter table public.jar_credits add constraint jar_credits_known_plan check (
  (source = 'free' and plan_code = 'one_heart' and recipient_limit = 1 and amount_cents = 0)
  or (source = 'paid' and (
    (plan_code = 'one_heart' and recipient_limit = 1 and amount_cents = 799)
    or (plan_code = 'two_hearts' and recipient_limit = 2 and amount_cents = 1499)
    or (plan_code = 'close_circle' and recipient_limit = 3 and amount_cents = 1999)
    or (plan_code = 'family_circle' and recipient_limit = 5 and amount_cents = 2999)
    or (plan_code = 'big_heart' and recipient_limit = 10 and amount_cents = 4999)
  ))
  or (source = 'test' and amount_cents = 0 and (
    (plan_code = 'one_heart' and recipient_limit = 1)
    or (plan_code = 'two_hearts' and recipient_limit = 2)
    or (plan_code = 'close_circle' and recipient_limit = 3)
    or (plan_code = 'family_circle' and recipient_limit = 5)
    or (plan_code = 'big_heart' and recipient_limit = 10)
  ))
);

alter table public.jar_credits add constraint jar_credits_paid_order check (
  (source in ('free', 'test') and provider_order_id is null)
  or (source = 'paid' and provider_order_id is not null)
);
