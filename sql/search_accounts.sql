BEGIN
    RETURN QUERY
    WITH total_count AS (
        SELECT COUNT(DISTINCT a.address) AS total
        FROM public.accounts a
        INNER JOIN public.account_preferences ap ON ap.owner_account_address = a.address
        WHERE (
            a.address ILIKE '%' || search || '%'
            OR a.address IN (
                SELECT owner_account
                FROM public.subscriptions s
                WHERE s.domain ILIKE '%' || search || '%'
            )
            OR a.address IN (
                SELECT owner_account_address
                FROM public.account_preferences ap2
                WHERE ap2.name ILIKE '%' || search || '%'
            )
            OR a.address IN (
                SELECT account_address
                FROM public.account_notifications an
                WHERE EXISTS (
                    SELECT 1
                    FROM jsonb_array_elements(an.notification_types) AS elem
                    WHERE elem ->> 'destination' ILIKE '%' || search || '%'
                )
            )
        )
        AND a.address != COALESCE(current_address, '')
    ),
    limited_results AS (
        SELECT DISTINCT
            ap.name,
            a.address,
            ap.avatar_url,
            a.created_at,
            CASE
                WHEN ci.destination IS NOT NULL OR c.contact_address IS NOT NULL THEN true
                ELSE false
            END AS is_invited
        FROM public.accounts a
        INNER JOIN public.account_preferences ap ON ap.owner_account_address = a.address
        LEFT JOIN public.contact_invite ci ON ci.destination = a.address AND ci.account_owner_address = current_address
        LEFT JOIN public.contact c ON c.contact_address = a.address AND c.account_owner_address = current_address
        WHERE (
            a.address ILIKE '%' || search || '%'
            OR a.address IN (
                SELECT owner_account
                FROM public.subscriptions s
                WHERE s.domain ILIKE '%' || search || '%'
            )
            OR a.address IN (
                SELECT owner_account_address
                FROM public.account_preferences ap2
                WHERE ap2.name ILIKE '%' || search || '%'
            )
            OR a.address IN (
                SELECT account_address
                FROM public.account_notifications an
                WHERE EXISTS (
                    SELECT 1
                    FROM jsonb_array_elements(an.notification_types) AS elem
                    WHERE elem ->> 'destination' ILIKE '%' || search || '%'
                )
            )
        )
        AND a.address != COALESCE(current_address, '')
        ORDER BY a.created_at
        LIMIT max_results
        OFFSET skip
    )
    SELECT
        (SELECT total FROM total_count) AS total_count,
        jsonb_agg(
            json_build_object(
                'name', name,
                'address', address,
                'avatar_url', avatar_url,
                'is_invited', is_invited
            )
        ) AS result
    FROM limited_results;
END;
