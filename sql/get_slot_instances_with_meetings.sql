DROP FUNCTION get_slot_instances_with_meetings(
    p_account_address text,
    p_time_min timestamptz,
    p_time_max timestamptz
);
CREATE OR REPLACE FUNCTION get_slot_instances_with_meetings(
    p_account_address text,
    p_time_min timestamptz,
    p_time_max timestamptz
)
RETURNS TABLE (
    -- Slot instance data
    id text,
    account_address text,
    start timestamptz,
    "end" timestamptz,
    role text,
    series_id uuid,
    status text,
    version bigint,
    meeting_info_encrypted jsonb,
    slot_id uuid,
    meeting_id uuid
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH slot_data AS (
        SELECT si.id, si.account_address, si.start, si."end",
               si.guest_email, ss.role::text, si.series_id,
               si.status::text, si.version,
               si.override_meeting_info_encrypted as meeting_info_encrypted,
               ss.id as slot_id,
               ss.meeting_id
        FROM slot_instance si
        INNER JOIN slot_series ss ON si.series_id = ss.id
        WHERE si.account_address = p_account_address
            AND si.start >= p_time_min
            AND si."end" <= p_time_max
    )
    SELECT sd.id, sd.account_address, sd.start, sd."end",
            sd.role, sd.series_id, sd.status, sd.version,
           sd.meeting_info_encrypted, sd.slot_id,
           sd.meeting_id
    FROM slot_data sd
    ORDER BY sd.start ASC;
END;
$$;
