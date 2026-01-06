-- Get the most recent slot_instance for each series_id
CREATE OR REPLACE FUNCTION get_latest_instances_per_series(series_ids uuid[])
RETURNS TABLE (
  id text,
  series_id uuid,
  start timestamptz,
  "end" timestamptz,
  status text,
  account_address text,
  role text,
  version integer,
  created_at timestamptz,
  override_meeting_info_encrypted text,
  guest_email text
) AS $$
  SELECT DISTINCT ON (series_id)
    id, series_id, start, "end", status, account_address,
    role, version, created_at, override_meeting_info_encrypted, guest_email
  FROM slot_instance
  WHERE series_id = ANY(series_ids)
  ORDER BY series_id, start DESC;
$$ LANGUAGE sql STABLE;
