CREATE OR REPLACE FUNCTION get_discord_notifications()
RETURNS TABLE(
  discord_id TEXT,
  account_address TEXT,
  timezone TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT elem->>'destination' AS discord_id,
                  a.account_address,
        av.timezone
  FROM account_notifications a
  JOIN LATERAL jsonb_array_elements(a.notification_types) AS elem ON true
  INNER JOIN public.account_preferences ap ON ap.owner_account_address = a.account_address
  INNER JOIN public.availabilities av ON av.id = ap.availaibility_id
  WHERE elem->>'channel' = 'discord'
  AND (elem->>'disabled' IS NULL OR elem->>'disabled' = 'false');
END;
$$;
