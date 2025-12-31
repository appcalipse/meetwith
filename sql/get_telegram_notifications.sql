CREATE OR REPLACE FUNCTION get_telegram_notifications()
RETURNS TABLE(
  telegram_id TEXT,
  account_address TEXT,
  timezone TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT elem->>'destination' AS telegram_id,
                  a.account_address,
        av.timezone
  FROM account_notifications a
  JOIN LATERAL jsonb_array_elements(a.notification_types) AS elem ON true
  INNER JOIN public.account_preferences ap ON ap.owner_account_address = a.account_address
  INNER JOIN public.availabilities av ON av.id = ap.availaibility_id
  WHERE elem->>'channel' = 'telegram';
END;
$$;
