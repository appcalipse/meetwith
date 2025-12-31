CREATE OR REPLACE FUNCTION public.get_meeting_primary_slot (
  p_meeting_id uuid,
  p_account_address text default null
) RETURNS jsonb LANGUAGE plpgsql STABLE AS $$
DECLARE
    v_result jsonb;
BEGIN
    SELECT to_jsonb(s.*) || jsonb_build_object(
            'user_type',
            CASE
                WHEN s.account_address IS NOT NULL THEN 'account'
                ELSE 'guest'
            END
        ) INTO v_result
    FROM public.meetings m
    JOIN public.slots s ON s.id::text = ANY(m.slots)
    WHERE m.id = p_meeting_id
      AND (
        -- WHITELIST: Only look at rows that are...
        -- 1. My Account
        (p_account_address IS NOT NULL AND s.account_address = p_account_address)
        OR
        -- 2. Any Guest
        (s.guest_email IS NOT NULL)
      )
    ORDER BY
        CASE
            -- RANK 1: My Account (Always wins, period)
            WHEN p_account_address IS NOT NULL
                 AND s.account_address = p_account_address THEN 1

            -- RANK 2: Guest Scheduler
            WHEN s.role::text = 'scheduler' THEN 2

            -- RANK 3: Regular Guest
            ELSE 3
        END ASC
    LIMIT 1;

    RETURN v_result;
END;
$$;
