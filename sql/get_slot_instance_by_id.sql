CREATE OR REPLACE FUNCTION public.get_slot_instance_by_id(instance_id text)
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
    slot_id text
)
LANGUAGE sql
STABLE
AS $$
            SELECT
              si.id,
              si.account_address,
              si.start,
              si."end",
              si.role::text,
              si.series_id,
              si.status::text,
              si.version,
              COALESCE(si.override_meeting_info_encrypted, ss.default_meeting_info_encrypted) as meeting_info_encrypted,
               ss.slot_id
        FROM slot_instance si
        INNER JOIN slot_series ss ON si.series_id = ss.id
        WHERE si.id = instance_id;
$$;
