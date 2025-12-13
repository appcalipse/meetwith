CREATE OR REPLACE FUNCTION get_meeting_series_without_instances(
    p_account_address text,
    p_time_min timestamptz,
    p_time_max timestamptz
)
RETURNS TABLE (
    id text,
    account_address text,
    created_at timestamptz,
    start timestamptz,
    "end" timestamptz,
    recurrence text,
    rrule text[],
    slot_id text,
    guest_email text,
    meeting_info_encrypted jsonb,
    conferenceData jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ss.id,
        ss.account_address,
        ss.created_at,
        ss.original_start as start,
        ss.original_end as "end",
        ss.recurrence::text,
        ss.rrule,
        ss.slot_id,
        ss.guest_email,
        -- Use default_meeting_info_encrypted from series
        ss.default_meeting_info_encrypted::jsonb as meeting_info_encrypted,
        -- Meeting/Conference data from meetings table
        to_jsonb(m.*) as conferenceData
    FROM slot_series ss
    LEFT JOIN meetings m ON ss.slot_id = m.id
    WHERE
        ss.account_address = p_account_address
    ORDER BY ss.created_at DESC;
END;
$$;
