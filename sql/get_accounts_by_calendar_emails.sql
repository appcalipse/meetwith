CREATE OR REPLACE FUNCTION get_accounts_by_calendar_emails(
    p_emails TEXT[],
    p_limit INTEGER DEFAULT 1000,
    p_offset INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    result JSONB;
BEGIN
    WITH raw_matches AS (
        SELECT
            cca.email AS calendar_email,
            ap.name,
            a.address,
            ap.avatar_url
        FROM public.accounts a
        INNER JOIN public.account_preferences ap ON ap.owner_account_address = a.address
        INNER JOIN public.connected_calendars cca ON cca.account_address = a.address
        WHERE
            -- Check if the calendar email is contained in the input array
            cca.email = ANY(p_emails)
        ORDER BY a.created_at
        LIMIT p_limit
        OFFSET p_offset
    ),
    grouped_by_email AS (
        SELECT
            calendar_email,
            jsonb_agg(
                json_build_object(
                    'name', name,
                    'address', address,
                    'avatar_url', avatar_url
                )
            ) AS accounts_list
        FROM raw_matches
        GROUP BY calendar_email
    )
    SELECT
        COALESCE(jsonb_object_agg(calendar_email, accounts_list), '{}'::jsonb)
    INTO result
    FROM grouped_by_email;

    RETURN result;
END;
$$;
