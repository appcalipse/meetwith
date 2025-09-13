CREATE OR REPLACE FUNCTION get_group_invites_with_search(
  user_address TEXT DEFAULT NULL,
  target_group_id UUID DEFAULT NULL,
  target_user_id TEXT DEFAULT NULL,
  target_email TEXT DEFAULT NULL,
  target_discord_id TEXT DEFAULT NULL,
  search_term TEXT DEFAULT NULL,
  limit_count INTEGER DEFAULT 1000,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  role TEXT,
  group_id UUID,
  group_name TEXT,
  group_slug TEXT,
  invite_pending BOOLEAN
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gi.id,
    gi.role::TEXT,
    g.id as group_id,
    g.name as group_name,
    g.slug as group_slug,
    true as invite_pending
  FROM group_invites gi
  INNER JOIN groups g ON gi.group_id = g.id
  WHERE 
    (user_address IS NULL OR gi.user_id = LOWER(user_address))
    AND (target_group_id IS NULL OR gi.group_id = target_group_id)
    OR gi.user_id = LOWER(target_user_id)
    OR gi.email = LOWER(target_email)
    OR gi.discord_id = target_discord_id
    OR g.name ILIKE '%' || search_term || '%'
  ORDER BY gi.created_at DESC
  LIMIT limit_count OFFSET offset_count;
END;
$$;
