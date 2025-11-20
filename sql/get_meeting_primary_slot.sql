create or replace function public.get_meeting_primary_slot (
  p_meeting_id uuid,
  p_account_address text default null
) RETURNS jsonb LANGUAGE plpgsql STABLE as $$
DECLARE
    v_result jsonb;
    v_slots uuid[];
BEGIN
    -- Get slots array once
    SELECT m.slots INTO v_slots
    FROM public.meetings m
    WHERE m.id = p_meeting_id;

    IF v_slots IS NULL OR array_length(v_slots, 1) = 0 THEN
        RETURN NULL;
    END IF;

    -- Try to find registered slot first (highest priority)
    IF p_account_address IS NOT NULL THEN
        SELECT to_jsonb(s.*) || jsonb_build_object(
            'guest_email', NULL,
            'user_type', 'account',
            'priority', 1
        ) INTO v_result
        FROM public.slots s
        WHERE s.id = ANY(v_slots)
          AND s.account_address = p_account_address
        LIMIT 1;

        IF v_result IS NOT NULL THEN
            RETURN v_result;
        END IF;
    END IF;

    -- Fall back to guest slots
    SELECT to_jsonb(gs.*) || jsonb_build_object(
        'account_address', NULL,
        'user_type', 'guest',
        'priority', CASE WHEN gs.role::text = 'scheduler' THEN 2 ELSE 3 END
    ) INTO v_result
    FROM public.guest_slots gs
    WHERE gs.id = ANY(v_slots)
    ORDER BY CASE WHEN gs.role::text = 'scheduler' THEN 2 ELSE 3 END
    LIMIT 1;

    RETURN v_result;
END;
$$;
