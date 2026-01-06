DROP FUNCTION get_user_groups_with_members(text,text,integer,integer);
CREATE OR REPLACE FUNCTION get_user_groups_with_members(
    user_address TEXT,
    search_term TEXT DEFAULT NULL,
    limit_count INTEGER DEFAULT 50,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE(
    role TEXT,
    id UUID,
    name TEXT,
    slug TEXT,
    avatar_url TEXT,
    description TEXT,
    members JSONB,
    member_availabilities JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH user_groups AS (
    SELECT 
      gm.role,
      g.id,
      g.name,
      g.slug,
      g.avatar_url,
      g.description
    FROM group_members gm
    JOIN groups g ON gm.group_id = g.id
    WHERE gm.member_id = LOWER(user_address)
      AND (search_term IS NULL OR g.name ILIKE '%' || search_term || '%')
    ORDER BY g.name
    LIMIT limit_count OFFSET offset_count
  ),
  group_members_data AS (
    SELECT 
      ug.id as group_id,
      JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'displayName', ap.name,
          'avatar_url', ap.avatar_url,
          'address', gm.member_id,
          'role', gm.role,
          'invitePending', false,
          'domain', (
            SELECT s.domain 
            FROM subscriptions s 
            WHERE s.owner_account = gm.member_id 
              AND s.expiry_time > NOW() 
            LIMIT 1
          ),
          'isContact', c.contact_address IS NOT NULL,
          'hasContactInvite', ci.destination IS NOT NULL 
        )
      ) as members
    FROM user_groups ug
    JOIN group_members gm ON gm.group_id = ug.id
    JOIN accounts a ON a.address = gm.member_id
    LEFT JOIN account_preferences ap ON ap.owner_account_address = a.address
    LEFT JOIN contact c ON c.contact_address = a.address AND c.account_owner_address = LOWER(user_address)
    LEFT JOIN contact_invite ci ON ci.destination = a.address AND ci.account_owner_address = LOWER(user_address)
    GROUP BY ug.id
  ),
  group_invites_data AS (
    SELECT 
      ug.id as group_id,
      JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'displayName', COALESCE(ap.name, gi.email, 'Pending User'),
          'avatar_url', ap.avatar_url,
          'address', gi.user_id,
          'userId', gi.id,
          'role', gi.role,
          'invitePending', true,
          'email', gi.email,
          'discordId', gi.discord_id,
          'domain', NULL,
          'isContact', c.contact_address IS NOT NULL,
          'hasContactInvite', ci.destination IS NOT NULL 
        )
      ) as invites
    FROM user_groups ug
    JOIN group_invites gi ON gi.group_id = ug.id
    LEFT JOIN accounts a ON a.address = gi.user_id
    LEFT JOIN account_preferences ap ON ap.owner_account_address = a.address
    LEFT JOIN contact c ON c.contact_address = a.address AND c.account_owner_address = LOWER(user_address)
    LEFT JOIN contact_invite ci ON ci.account_owner_address = LOWER(user_address) AND ci.destination = COALESCE(NULLIF(gi.email, ''), a.address)
    GROUP BY ug.id
  ),
  combined_data AS (
    SELECT 
      ug.id as group_id,
      COALESCE(gmd.members, '[]'::JSONB) || COALESCE(gid.invites, '[]'::JSONB) as all_members
    FROM user_groups ug
    LEFT JOIN group_members_data gmd ON gmd.group_id = ug.id
    LEFT JOIN group_invites_data gid ON gid.group_id = ug.id
  ),
  group_member_availabilities_data AS (
    SELECT 
      ug.id as group_id,
      COALESCE(
        JSONB_AGG(
          JSONB_BUILD_OBJECT(
            'id', a.id,
            'title', a.title,
            'timezone', a.timezone,
            'weekly_availability', a.weekly_availability,
            'account_owner_address', a.account_owner_address,
            'created_at', a.created_at
          )
        ) FILTER (WHERE a.id IS NOT NULL),
        '[]'::JSONB
      ) as availabilities
    FROM user_groups ug
    LEFT JOIN group_availabilities ga ON ga.group_id = ug.id AND ga.member_id = LOWER(user_address)
    LEFT JOIN availabilities a ON a.id = ga.availability_id
    GROUP BY ug.id
  )
  SELECT 
    ug.role::TEXT,
    ug.id,
    ug.name,
    ug.slug,
    ug.avatar_url,
    ug.description,
    COALESCE(cd.all_members, '[]'::JSONB) as members,
    COALESCE(gmad.availabilities, '[]'::JSONB) as member_availabilities
  FROM user_groups ug
  LEFT JOIN combined_data cd ON cd.group_id = ug.id
  LEFT JOIN group_member_availabilities_data gmad ON gmad.group_id = ug.id;
END;
$$;