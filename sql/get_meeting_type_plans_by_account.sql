DROP FUNCTION get_meeting_type_plans_by_account(text);
CREATE OR REPLACE FUNCTION public.get_meeting_type_plans_by_account(account_address text)
RETURNS SETOF meeting_type_plan
LANGUAGE sql
STABLE
AS $$
  SELECT p.*
  FROM public.meeting_type_plan p
  JOIN public.meeting_type mt ON mt.id = p.meeting_type_id
  WHERE lower(mt.account_owner_address) = lower(account_address)
    AND mt.deleted_at IS NULL;
$$;