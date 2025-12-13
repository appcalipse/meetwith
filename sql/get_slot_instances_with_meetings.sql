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
    slot_id text,
    meeting_id uuid
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH slot_data AS (
        SELECT si.id, si.account_address, si.start, si."end",
               si.guest_email, si.role::text, si.series_id,
               si.status::text, si.version,
               si.override_meeting_info_encrypted as meeting_info_encrypted,
               ss.slot_id
        FROM slot_instance si
        INNER JOIN slot_series ss ON si.series_id = ss.id
        WHERE si.account_address = p_account_address
            AND si.start >= p_time_min
            AND si."end" <= p_time_max
    ),
    meeting_data AS (
        SELECT m.id, m.meeting_url, m.title, m.provider
        FROM meetings m
        WHERE EXISTS (
            SELECT 1 FROM slot_data sd
            WHERE sd.slot_id = ANY(m.slots)
        )
    )
    SELECT sd.id, sd.account_address, sd.start, sd."end",
            sd.role, sd.series_id, sd.status, sd.version,
           sd.meeting_info_encrypted, sd.slot_id,
           md.meeting_id
    FROM slot_data sd
   LEFT JOIN LATERAL (
  SELECT m.id AS meeting_id
  FROM meetings m
  WHERE sd.slot_id = ANY(m.slots)
  LIMIT 1
) md ON true
    ORDER BY sd.start ASC;
END;
$$;
