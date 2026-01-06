CREATE OR REPLACE FUNCTION search_contact_invites(
    search TEXT,
    current_account TEXT,
    current_account_email TEXT,
    max_results INTEGER DEFAULT 1000,
    skip INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    result JSONB;

DECLARE
    result jsonb;
BEGIN
    WITH
      total_count AS (
        SELECT
          COUNT(DISTINCT a.address) AS total
        FROM
          public.accounts a
          INNER JOIN public.account_preferences ap ON ap.owner_account_address = a.address
          INNER JOIN public.contact_invite ci ON ci.account_owner_address = a.address
            AND (
        ci.destination = LOWER(current_account) 
        OR ci.destination = LOWER(current_account_email)
        )
        WHERE
          (
            a.address ILIKE '%' || search || '%'
            OR a.address IN (
              SELECT
                owner_account
              FROM
                public.subscriptions s
              WHERE
                s.domain ILIKE '%' || search || '%'
            )
            OR a.address IN (
              SELECT
                owner_account_address
              FROM
                public.account_preferences ap
              WHERE
                ap.name ILIKE '%' || search || '%'
            )
            OR a.address IN (
              SELECT
                account_address
              FROM
                account_notifications
              WHERE
                EXISTS (
                  SELECT
                    1
                  FROM
                    jsonb_array_elements(notification_types) AS elem
                  WHERE
                    elem ->> 'destination' ILIKE '%' || search || '%'
                )
            )
          )
      ),
      limited_results AS (
        SELECT DISTINCT
          ap.name,
          a.address,
          ap.description,
          ap.avatar_url,
          a.created_at,
          ci.id,
          CASE
            WHEN cc.id IS NOT NULL THEN true
            ELSE false
          END AS calendar_exists,
          matching_notification.element ->> 'destination' AS email_address
        FROM
          public.accounts a
          INNER JOIN public.account_preferences ap ON ap.owner_account_address = a.address
          LEFT JOIN public.connected_calendars cc ON cc.account_address = a.address
          LEFT JOIN public.account_notifications an ON an.account_address = a.address
          LEFT JOIN LATERAL (
            SELECT
              elem AS element
            FROM
              jsonb_array_elements(an.notification_types) AS elem
            WHERE
              elem ->> 'channel' = 'email'
            LIMIT
              1
          ) matching_notification ON true
           INNER JOIN public.contact_invite ci ON ci.account_owner_address = a.address
               AND (
        ci.destination = LOWER(current_account) 
        OR ci.destination = LOWER(current_account_email)
        )
        WHERE
          (

            a.address ILIKE '%' || search || '%'
            OR a.address IN (
              SELECT
                owner_account
              FROM
                public.subscriptions s
              WHERE
                s.domain ILIKE '%' || search || '%'
            )
            OR a.address IN (
              SELECT
                owner_account_address
              FROM
                public.account_preferences ap
              WHERE
                ap.name ILIKE '%' || search || '%'
            )
            OR a.address IN (
              SELECT
                account_address
              FROM
                account_notifications
              WHERE
                EXISTS (
                  SELECT
                    1
                  FROM
                    jsonb_array_elements(notification_types) AS elem
                  WHERE
                    elem ->> 'destination' ILIKE '%' || search || '%'
                )
            )
          )
        ORDER BY
          a.created_at
        LIMIT
          max_results
        OFFSET
          skip
      )
    SELECT
      jsonb_build_object(
        'total_count', (SELECT total FROM total_count),
        'result', jsonb_agg(
          jsonb_build_object(
            'id', id,
            'name', name,
            'description', description,
            'address', address,
            'avatar_url', avatar_url,
            'calendar_exists', calendar_exists,
            'email_address', email_address
          )
        )
      ) INTO result
    FROM
      limited_results;

    RETURN result;
END;
$$;