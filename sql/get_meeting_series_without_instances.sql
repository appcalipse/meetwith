DROP FUNCTION IF EXISTS get_meeting_series_without_instances(
    p_account_address text,
    p_time_min timestamptz,
    p_time_max timestamptz
);
CREATE OR REPLACE FUNCTION get_meeting_series_without_instances(
    p_account_address text,
    p_time_min timestamptz,
    p_time_max timestamptz
)
RETURNS TABLE (
    id uuid,
    account_address text,
    created_at timestamptz,
    effective_start timestamptz,
    effective_end timestamptz,
    rrule text[],
    guest_email text,
    ical_uid text,
    meeting_info_encrypted jsonb,
    conferenceData jsonb,
    role text,
    template_start timestamptz,
    template_end timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ss.id,
        ss.account_address,
        ss.created_at,
        ss.effective_start,
        ss.effective_end,
        ss.rrule,
        ss.guest_email,
        ss.ical_uid,
        -- Use default_meeting_info_encrypted from series
        ss.default_meeting_info_encrypted::jsonb as meeting_info_encrypted,
        -- Meeting/Conference data from meetings table
        to_jsonb(m.*) as conferenceData,
        ss.role::text,
        ss.template_start,
        ss.template_end
    FROM slot_series ss
    LEFT JOIN meetings m ON ss.meeting_id = m.id
    WHERE
        ss.account_address = p_account_address
    ORDER BY ss.created_at DESC;
END;
$$;
