CREATE OR REPLACE FUNCTION get_accounts_by_calendar_email(
    p_email TEXT,
    p_address TEXT,
    p_limit INTEGER DEFAULT 1000,
    p_offset INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    result JSONB;
BEGIN
WITH limited_results AS (
  SELECT
    ap.name,
    a.address,
    ap.avatar_url
  FROM public.accounts a
  INNER JOIN public.account_preferences ap ON ap.owner_account_address = a.address
  INNER JOIN public.connected_calendars cca ON cca.account_address = a.address
  WHERE cca.email ILIKE '%' || p_email || '%'
  AND a.address != LOWER(p_address)
  ORDER BY a.created_at
  LIMIT p_limit
  OFFSET p_offset
)
SELECT
  jsonb_agg(row_to_json(limited_results)) AS result
FROM limited_results;

RETURN result;
END;
$$;
