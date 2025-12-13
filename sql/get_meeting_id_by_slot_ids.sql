DROP FUNCTION IF EXISTS get_meeting_id_by_slot_ids(slot_ids text[]);
CREATE OR REPLACE FUNCTION get_meeting_id_by_slot_ids(slot_ids text[])
RETURNS TABLE(
    id uuid
)
LANGUAGE sql IMMUTABLE
AS $$
  SELECT id
  FROM meetings
  WHERE slots && slot_ids;
$$;
