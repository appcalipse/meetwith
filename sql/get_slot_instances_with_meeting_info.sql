CREATE OR REPLACE FUNCTION get_slot_instances_with_meeting_info(
    p_account_address text,
    p_time_min timestamptz,
    p_time_max timestamptz
)
RETURNS TABLE (
    id text,
    account_address text,
    start timestamptz,
    "end" timestamptz,
    guest_email text,
    role text,
    series_id text,
    status text,
    version integer,
    meeting_info_encrypted jsonb,
    -- Meeting/Conference data from meetings table
    conferenceData jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        si.id,
        si.account_address,
        si.start,
        si."end",
        si.guest_email,
        si.role::text,
        si.series_id,
        si.status::text,
        si.version,
        -- Map meeting_info_encrypted: use override if not null, otherwise use default from series
        COALESCE(si.override_meeting_info_encrypted, ss.default_meeting_info_encrypted)::jsonb as meeting_info_encrypted,
        -- Meeting/Conference data from meetings table
       to_jsonb(m.*) as conferenceData

    FROM slot_instance si
    INNER JOIN slot_series ss ON si.series_id = ss.id
    LEFT JOIN meetings m ON ss.slot_id = m.id
    WHERE
        si.account_address = p_account_address
        AND si.start >= p_time_min
        AND si."end" <= p_time_max
    ORDER BY si.start ASC;
END;
$$;
