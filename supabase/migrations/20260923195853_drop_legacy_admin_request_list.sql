-- The category-filtered inbox RPC replaced this earlier signature. Keeping
-- both overloads can make API calls ambiguous and leaves a stale queue path.
drop function public.admin_list_support_requests(text, integer);
